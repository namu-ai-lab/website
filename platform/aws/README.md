# The Namu API on AWS

`https://api.namuai-lab.com` is served from AWS (us-east-1, account 051868002294). AWS runs everything except the
models: the address developers call, the key check, limits, the usage record and the logs. The models stay on Modal,
which the gateway calls with the Modal proxy token. The website stays on Vercel and the database on Neon.

```
developer / website ──HTTPS──> api.namuai-lab.com (CNAME at Vercel DNS)
                                  │
                       Application Load Balancer  ── AWS WAF (IP reputation, known bad inputs: block;
                       TLS 1.3/1.2, ACM certificate            common rules and a per-address rate: count)
                                  │  port 8080, from the load balancer only
                       ECS Fargate service namu-api (2 tasks, 2 zones)
                       platform/aws/gateway = platform/modal/namu_gateway.py's app, without Modal
                                  │  keys, allowance, usage ─────────────> Neon (namu_gateway role)
                                  │  model calls, Modal-Key/Modal-Secret ─> Modal: namu-transcribe, namu-voice,
                                  ▼                                         namu-voice-zarma, namu-interpret, namu-agent
```

| Piece | Where |
|---|---|
| Gateway app | `platform/modal/namu_gateway.py` (`create_app`); AWS entry `platform/aws/gateway/main.py` |
| Image | `platform/aws/gateway/Dockerfile`, built by CodeBuild `namu-api-build` into ECR `namu-api` (immutable tags) |
| Infrastructure | `platform/aws/infra` (CDK, TypeScript run by Node's type stripping): stacks `NamuApiImage` and `NamuApi` |
| Secrets | Secrets Manager `namu/api/gateway`: `GATEWAY_DATABASE_URL`, `NAMU_KEY_PEPPER`, `MODAL_PROXY_KEY`, `MODAL_PROXY_SECRET`. Values are typed by the owner only, never committed or printed |
| Logs | CloudWatch `/namu/api/gateway` (30 days; the gateway logs events, never audio or text), `/namu/api/build` |
| Alarms | `namu-api-target-5xx`, `namu-api-alb-5xx`, `namu-api-unhealthy` → SNS `namu-cost-alerts` |
| Certificate | ACM `api.namuai-lab.com` (DNS-validated at Vercel; `namuai-lab.com` has CAA `0 issue "amazon.com"`) |
| CloudFormation role | the CDK execution role carries `NamuApiExecution` (`infra/cfn-exec-policy.json`): the API's resources only |

## Deploy a change

```bash
platform/aws/build-image.sh                    # builds in AWS, prints the new image tag
cd platform/aws/infra && npm ci
npx cdk diff NamuApi -c certificateArn=<arn> -c imageTag=<tag>
npx cdk deploy NamuApi -c certificateArn=<arn> -c imageTag=<tag>
platform/aws/smoke-test.sh                     # from outside, no key, no GPU; then record the tag in deploy.json
```

ECS starts the new tasks, waits for `/v1/health` on the load balancer, then drains the old ones (up to 120 s for calls
in flight). If the new tasks fail, the deployment circuit breaker rolls back to the previous image by itself. To roll
back by hand, deploy the previous tag. The current certificate ARN and tag are in `deploy.json`.

## Change a secret

```bash
npm run aws:secrets                            # copies them from .env.local, as `npm run modal:secrets` does for Modal
platform/aws/set-gateway-secrets.sh            # or types them: hidden prompts in a real terminal, Enter keeps a value
aws ecs update-service --cluster namu-api --service namu-api --force-new-deployment
```

Tasks read secrets when they start, so a new value takes effect with the next deployment.

## Limits and behaviour

- Uploads up to 25 MB (the gateway's own limit); calls may run up to 840 s (the load balancer allows 900 s).
- Rate limits are per task (`MemoryLimiter`): with two tasks a caller can get at most twice a per-minute limit. The
  monthly allowance is enforced in Postgres and is exact.
- The caller's address is the one the load balancer appends to `X-Forwarded-For`; uvicorn trusts only the VPC
  (10.40.0.0/16), so a client cannot set its own.
- While `MODAL_PROXY_KEY`/`MODAL_PROXY_SECRET` are empty the gateway calls the model services without the token
  (they are still open) and logs a warning at each start. Fill them before the models are locked.

## Cost (list prices, paid by AWS credits)

Load balancer ≈ $18 a month plus traffic; two Fargate tasks (0.5 vCPU, 1 GB) ≈ $36; four public IPv4 addresses ≈ $15;
WAF ≈ $9; logs, secrets, alarms and ECR ≈ $3. About **$80 a month** at today's traffic.
