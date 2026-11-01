#!/bin/bash
# Builds the Namu API gateway image in AWS CodeBuild (no local Docker) and prints its tag.
#
#     platform/aws/build-image.sh            # then: cd platform/aws/infra && npx cdk deploy NamuApi -c imageTag=<tag> ...
#
# The tag is the UTC time plus the first 8 hex of the source archive's SHA-256, so the same source always
# names the same image and ECR's immutable tags refuse a different image under an old name.
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-namu-owner}" AWS_REGION=us-east-1 AWS_PAGER=""
cd "$(dirname "$0")/.."                                    # platform/
BUCKET=namu-api-build-051868002294-us-east-1
zip_file=$(mktemp -t namu-api-src).zip
trap 'rm -f "$zip_file"' EXIT
zip -q -X "$zip_file" aws/gateway/Dockerfile aws/gateway/requirements.txt aws/gateway/main.py modal/namu_gateway.py
tag="$(date -u +%Y%m%d-%H%M)-$(shasum -a 256 "$zip_file" | cut -c1-8)"
aws s3 cp --only-show-errors "$zip_file" "s3://$BUCKET/source/platform.zip"
id=$(aws codebuild start-build --project-name namu-api-build \
  --environment-variables-override "name=IMAGE_TAG,value=$tag,type=PLAINTEXT" --query build.id --output text)
echo "building $tag ($id)" >&2
while :; do
  status=$(aws codebuild batch-get-builds --ids "$id" --query 'builds[0].buildStatus' --output text)
  [ "$status" = IN_PROGRESS ] || break
  sleep 10
done
if [ "$status" != SUCCEEDED ]; then
  echo "build $status; log: aws logs tail /namu/api/build --since 30m" >&2
  exit 1
fi
echo "$tag"
