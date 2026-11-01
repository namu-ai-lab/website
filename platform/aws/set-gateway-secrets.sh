#!/bin/bash
# Sets the AWS gateway's secrets (Secrets Manager `namu/api/gateway`). Run it in a terminal and type the values;
# nothing is echoed or printed. Press Enter to keep a value as it is (for example, add the Modal pass later).
#
#     platform/aws/set-gateway-secrets.sh
#
# GATEWAY_DATABASE_URL and NAMU_KEY_PEPPER must be the values the Modal gateway uses (Modal secrets `namu-db` and
# `namu-key-pepper`), or existing API keys stop working. Running tasks pick up new values at their next deployment:
#     aws ecs update-service --cluster namu-api --service namu-api --force-new-deployment
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-namu-owner}" AWS_REGION=us-east-1 AWS_PAGER=""
SECRET=namu/api/gateway

aws sts get-caller-identity >/dev/null 2>&1 || { echo "AWS login expired: aws sso login --profile namu-owner" >&2; exit 1; }
ask() {  # ask NAME "label": a hidden answer in the variable NAME (empty = keep)
  local answer
  IFS= read -rs -p "$2 (Enter keeps the current value): " answer </dev/tty
  echo >&2
  printf -v "$1" '%s' "$answer"
}
ask DB  "Neon gateway database URL (GATEWAY_DATABASE_URL)"
ask PEP "Key pepper (NAMU_KEY_PEPPER)"
ask MK  "Modal proxy token ID (wk-...)"
ask MS  "Modal proxy token secret (ws-...)"

current=$(aws secretsmanager get-secret-value --secret-id "$SECRET" --query SecretString --output text)
# Built first and checked by set -e: a refused value stops here, before anything reaches AWS.
payload=$(CURRENT="$current" DB="$DB" PEP="$PEP" MK="$MK" MS="$MS" python3 -c '
import json, os, sys
d = json.loads(os.environ["CURRENT"])
for field, var in (("GATEWAY_DATABASE_URL", "DB"), ("NAMU_KEY_PEPPER", "PEP"),
                   ("MODAL_PROXY_KEY", "MK"), ("MODAL_PROXY_SECRET", "MS")):
    value = os.environ[var].strip()
    if value:
        d[field] = value
url = d.get("GATEWAY_DATABASE_URL", "")
if url and not url.startswith(("postgres://", "postgresql://")):
    sys.exit("The database URL should start with postgresql:// -- nothing was saved.")
if bool(d.get("MODAL_PROXY_KEY")) != bool(d.get("MODAL_PROXY_SECRET")):
    sys.exit("Give both halves of the Modal pass, or neither -- nothing was saved.")
print(json.dumps(d))
')
printf '%s' "$payload" | aws secretsmanager put-secret-value --secret-id "$SECRET" --secret-string file:///dev/stdin \
  --query VersionId --output text >/dev/null
unset DB PEP MK MS current payload
echo "Saved. Now set: $(aws secretsmanager get-secret-value --secret-id "$SECRET" --query SecretString --output text \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(", ".join(k for k, v in d.items() if v) or "nothing")')"
