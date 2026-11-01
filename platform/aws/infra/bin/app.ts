// The Namu API on AWS: the gateway that serves api.namuai-lab.com and calls the models on Modal.
//
//   npx cdk deploy NamuApiImage                       (once: ECR + CodeBuild)
//   npx cdk deploy NamuApi -c certificateArn=<ACM ARN> -c imageTag=<tag> -c desiredCount=2
//
// What it builds (us-east-1):
//   ECR `namu-api` + CodeBuild `namu-api-build`  the gateway image, built in AWS from platform/ (no laptop Docker)
//   VPC 10.40.0.0/16                              two public subnets in two zones; no NAT (tasks reach Modal, Neon
//                                                 and ECR through the internet gateway, inbound only from the ALB)
//   ALB + AWS WAF                                 HTTPS on api.namuai-lab.com (TLS 1.3/1.2), HTTP redirects to HTTPS,
//                                                 900 s idle timeout for long model calls
//   ECS Fargate `namu-api`                        the gateway (platform/aws/gateway), read-only root filesystem,
//                                                 secrets from Secrets Manager `namu/api/gateway`, rollback on a
//                                                 failed deploy
//   CloudWatch alarms -> SNS `namu-cost-alerts`   5xx, unhealthy targets, no running task
//
// Context: certificateArn (NamuApi is only built with an ISSUED certificate); imageTag (until an
// image is built, the service runs no task); desiredCount (default 2).
import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cw from "aws-cdk-lib/aws-cloudwatch";
import * as cwActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import * as sns from "aws-cdk-lib/aws-sns";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";

const ACCOUNT = "051868002294";
const REGION = "us-east-1";
const VPC_CIDR = "10.40.0.0/16";               // also in platform/aws/gateway/Dockerfile (--forwarded-allow-ips)
const GATEWAY_SECRET_ARN = `arn:aws:secretsmanager:${REGION}:${ACCOUNT}:secret:namu/api/gateway-xDPFFo`;
const ALERTS_TOPIC_ARN = `arn:aws:sns:${REGION}:${ACCOUNT}:namu-cost-alerts`;
const SECRET_FIELDS = ["GATEWAY_DATABASE_URL", "NAMU_KEY_PEPPER", "MODAL_PROXY_KEY", "MODAL_PROXY_SECRET"];

class NamuApiImageStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: cdk.StackProps) {
    super(scope, id, props);
    // ---------------------------------------------------------------- image: ECR + CodeBuild
    const repo = new ecr.Repository(this, "Repo", {
      repositoryName: "namu-api",
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
      imageScanOnPush: true,
      encryption: ecr.RepositoryEncryption.AES_256,
      lifecycleRules: [{ maxImageCount: 30, description: "keep the last 30 builds" }],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    const sources = new s3.Bucket(this, "BuildSources", {
      bucketName: `namu-api-build-${ACCOUNT}-${REGION}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      lifecycleRules: [{ expiration: cdk.Duration.days(60), noncurrentVersionExpiration: cdk.Duration.days(60) }],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    const build = new codebuild.Project(this, "Build", {
      projectName: "namu-api-build",
      description: "Builds the Namu API gateway image from platform/ and pushes it to ECR namu-api",
      source: codebuild.Source.s3({ bucket: sources, path: "source/platform.zip" }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
        privileged: true,                      // docker build
      },
      environmentVariables: { REPOSITORY_URI: { value: repo.repositoryUri }, IMAGE_TAG: { value: "unset" } },
      timeout: cdk.Duration.minutes(30),
      logging: {
        cloudWatch: {
          logGroup: new logs.LogGroup(this, "BuildLogs", {
            logGroupName: "/namu/api/build", retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
          }),
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          pre_build: {
            "on-failure": "ABORT",
            commands: [
              'test "$IMAGE_TAG" != unset',
              "aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin ${REPOSITORY_URI%%/*}",
            ],
          },
          build: {
            "on-failure": "ABORT",
            commands: [
              "docker build --pull --platform linux/amd64 -f aws/gateway/Dockerfile -t $REPOSITORY_URI:$IMAGE_TAG .",
              // Smoke test: the image starts the app's module and refuses to run without its configuration.
              "docker run --rm -e NAMU_API_NO_AUTOBUILD=1 $REPOSITORY_URI:$IMAGE_TAG python -c \"import main, namu_gateway as g; assert g.modal is None\"",
              "docker run --rm $REPOSITORY_URI:$IMAGE_TAG python -c \"import main\" && exit 1 || true",
            ],
          },
          post_build: {
            commands: [
              "docker push $REPOSITORY_URI:$IMAGE_TAG",
              "docker inspect --format='{{index .RepoDigests 0}}' $REPOSITORY_URI:$IMAGE_TAG",
            ],
          },
        },
      }),
    });
    repo.grantPullPush(build);
    sources.grantRead(build);

    new cdk.CfnOutput(this, "RepositoryUri", { value: repo.repositoryUri });
    new cdk.CfnOutput(this, "BuildProject", { value: build.projectName });
    new cdk.CfnOutput(this, "SourceBucket", { value: sources.bucketName });
  }
}

class NamuApiStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: cdk.StackProps) {
    super(scope, id, props);
    const certificateArn: string | undefined = this.node.tryGetContext("certificateArn");
    if (!certificateArn) throw new Error("NamuApi needs -c certificateArn=<an ISSUED ACM certificate for the API host>");
    const imageTag: string | undefined = this.node.tryGetContext("imageTag");
    const desiredCount = imageTag ? Number(this.node.tryGetContext("desiredCount") ?? 2) : 0;

    const repo = ecr.Repository.fromRepositoryName(this, "Repo", "namu-api");

    // ---------------------------------------------------------------- network
    const vpc = new ec2.Vpc(this, "Vpc", {
      ipAddresses: ec2.IpAddresses.cidr(VPC_CIDR),
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [{ name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 }],
    });
    const albSg = new ec2.SecurityGroup(this, "AlbSg", {
      vpc, description: "Namu API load balancer: HTTPS and HTTP from anywhere", allowAllOutbound: false,
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), "HTTPS");
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "HTTP, redirected to HTTPS");
    const taskSg = new ec2.SecurityGroup(this, "TaskSg", {
      vpc, description: "Namu API gateway tasks: port 8080 from the load balancer only", allowAllOutbound: true,
    });
    taskSg.addIngressRule(albSg, ec2.Port.tcp(8080), "from the load balancer");
    albSg.addEgressRule(taskSg, ec2.Port.tcp(8080), "to the gateway tasks");

    // ---------------------------------------------------------------- the gateway service
    const cluster = new ecs.Cluster(this, "Cluster", { vpc, clusterName: "namu-api" });
    const gatewaySecret = secrets.Secret.fromSecretCompleteArn(this, "GatewaySecret", GATEWAY_SECRET_ARN);
    const taskDef = new ecs.FargateTaskDefinition(this, "Task", {
      family: "namu-api",
      cpu: 512,
      memoryLimitMiB: 1024,
      runtimePlatform: { cpuArchitecture: ecs.CpuArchitecture.X86_64, operatingSystemFamily: ecs.OperatingSystemFamily.LINUX },
    });
    taskDef.addVolume({ name: "tmp" });
    const container = taskDef.addContainer("gateway", {
      image: ecs.ContainerImage.fromEcrRepository(repo, imageTag ?? "none"),
      readonlyRootFilesystem: true,
      portMappings: [{ containerPort: 8080 }],
      stopTimeout: cdk.Duration.seconds(120),
      linuxParameters: new ecs.LinuxParameters(this, "Linux", { initProcessEnabled: true }),
      environment: { TMPDIR: "/tmp" },
      secrets: Object.fromEntries(SECRET_FIELDS.map((f) => [f, ecs.Secret.fromSecretsManager(gatewaySecret, f)])),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "gateway",
        logGroup: new logs.LogGroup(this, "GatewayLogs", {
          logGroupName: "/namu/api/gateway", retention: logs.RetentionDays.ONE_MONTH,
          removalPolicy: cdk.RemovalPolicy.RETAIN,
        }),
      }),
    });
    container.addMountPoints({ sourceVolume: "tmp", containerPath: "/tmp", readOnly: false });

    const service = new ecs.FargateService(this, "Service", {
      serviceName: "namu-api",
      cluster,
      taskDefinition: taskDef,
      desiredCount,
      assignPublicIp: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [taskSg],
      circuitBreaker: { enable: true, rollback: true },
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    });

    // ---------------------------------------------------------------- load balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc, internetFacing: true, securityGroup: albSg, loadBalancerName: "namu-api",
      idleTimeout: cdk.Duration.seconds(900),
      dropInvalidHeaderFields: true,
      http2Enabled: true,
    });
    const targets = new elbv2.ApplicationTargetGroup(this, "Targets", {
      vpc, port: 8080, protocol: elbv2.ApplicationProtocol.HTTP, targetType: elbv2.TargetType.IP,
      deregistrationDelay: cdk.Duration.seconds(120),
      healthCheck: { path: "/v1/health", interval: cdk.Duration.seconds(15), healthyThresholdCount: 2, unhealthyThresholdCount: 3 },
    });
    service.attachToApplicationTargetGroup(targets);
    alb.addListener("Https", {
      port: 443,
      certificates: [acm.Certificate.fromCertificateArn(this, "Cert", certificateArn)],
      sslPolicy: elbv2.SslPolicy.RECOMMENDED_TLS,
      defaultTargetGroups: [targets],
    });
    alb.addListener("Http", {
      port: 80, open: false,
      defaultAction: elbv2.ListenerAction.redirect({ protocol: "HTTPS", port: "443", permanent: true }),
    });

    // ---------------------------------------------------------------- WAF
    const managed = (name: string, priority: number, block: boolean): wafv2.CfnWebACL.RuleProperty => ({
      name, priority,
      statement: { managedRuleGroupStatement: { vendorName: "AWS", name } },
      overrideAction: block ? { none: {} } : { count: {} },
      visibilityConfig: { sampledRequestsEnabled: false, cloudWatchMetricsEnabled: true, metricName: name },
    });
    const acl = new wafv2.CfnWebACL(this, "Waf", {
      name: "namu-api",
      scope: "REGIONAL",
      defaultAction: { allow: {} },
      visibilityConfig: { sampledRequestsEnabled: false, cloudWatchMetricsEnabled: true, metricName: "namu-api" },
      rules: [
        managed("AWSManagedRulesAmazonIpReputationList", 0, true),
        managed("AWSManagedRulesKnownBadInputsRuleSet", 1, true),
        // Count first: its body rules were not written for audio uploads; block after a week of clean metrics.
        managed("AWSManagedRulesCommonRuleSet", 2, false),
        {
          name: "PerAddressRate", priority: 3,
          statement: { rateBasedStatement: { limit: 3000, aggregateKeyType: "IP", evaluationWindowSec: 300 } },
          action: { count: {} },
          visibilityConfig: { sampledRequestsEnabled: false, cloudWatchMetricsEnabled: true, metricName: "PerAddressRate" },
        },
      ],
    });
    new wafv2.CfnWebACLAssociation(this, "WafOnAlb", { resourceArn: alb.loadBalancerArn, webAclArn: acl.attrArn });

    // ---------------------------------------------------------------- alarms
    const alerts = sns.Topic.fromTopicArn(this, "Alerts", ALERTS_TOPIC_ARN);
    const alarm = (id: string, metric: cw.IMetric, threshold: number, periods: number, description: string) => {
      const a = new cw.Alarm(this, id, {
        alarmName: `namu-api-${id}`, metric, threshold, evaluationPeriods: periods, alarmDescription: description,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cw.TreatMissingData.NOT_BREACHING,
      });
      a.addAlarmAction(new cwActions.SnsAction(alerts));
    };
    const five = { period: cdk.Duration.minutes(5), statistic: "Sum" };
    alarm("target-5xx", targets.metrics.httpCodeTarget(elbv2.HttpCodeTarget.TARGET_5XX_COUNT, five), 20, 1,
      "The gateway answered 20 or more 5xx in 5 minutes");
    alarm("alb-5xx", alb.metrics.httpCodeElb(elbv2.HttpCodeElb.ELB_5XX_COUNT, five), 10, 1,
      "The load balancer itself answered 10 or more 5xx in 5 minutes (no healthy task, timeouts)");
    alarm("unhealthy", targets.metrics.unhealthyHostCount({ period: cdk.Duration.minutes(1), statistic: "Maximum" }), 1, 3,
      "A gateway task has failed its health check for 3 minutes");

    new cdk.CfnOutput(this, "LoadBalancerDns", { value: alb.loadBalancerDnsName });
  }
}

const app = new cdk.App();
const env = { account: ACCOUNT, region: REGION };
const stacks: cdk.Stack[] = [new NamuApiImageStack(app, "NamuApiImage", {
  env, description: "Namu API gateway image: ECR repository and the CodeBuild project that fills it",
  terminationProtection: true,
})];
if (app.node.tryGetContext("certificateArn")) {
  stacks.push(new NamuApiStack(app, "NamuApi", {
    env, description: "Namu API gateway on AWS: ALB + WAF + ECS Fargate, calling the models on Modal",
    terminationProtection: true,
  }));
}
for (const st of stacks) {
  cdk.Tags.of(st).add("purpose", "api");
  cdk.Tags.of(st).add("app", "namu-api");
}
