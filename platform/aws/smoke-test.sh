#!/bin/bash
# Checks https://api.namuai-lab.com from outside, without a key and without waking a GPU:
#
#     platform/aws/smoke-test.sh                 # through DNS
#     platform/aws/smoke-test.sh <ip>            # straight at one load balancer address (before DNS, or to test one)
#
# A made-up key that looks real makes the gateway ask Neon, so "unknown key: 401" proves AWS reaches the database
# with the right role and pepper path; a 503 there means it does not. Exits non-zero if any check fails.
set -uo pipefail
HOST=api.namuai-lab.com
args=(-s --max-time 20)
[ $# -ge 1 ] && args+=(--resolve "$HOST:443:$1" --resolve "$HOST:80:$1")
fails=0
check() {  # check NAME WANT_STATUS CURL_ARGS...
  local name=$1 want=$2; shift 2
  local out code body
  out=$(curl "${args[@]}" -w '\n%{http_code}' "$@")
  code=${out##*$'\n'}; body=${out%$'\n'*}; body=${body//$'\n'/ }
  if [ "$code" = "$want" ]; then printf 'ok    %-28s %s  %s\n' "$name" "$code" "${body:0:90}"
  else printf 'FAIL  %-28s %s (want %s)  %s\n' "$name" "$code" "$want" "${body:0:200}"; fails=$((fails + 1)); fi
}
check "health"            200 "https://$HOST/v1/health"
check "models"            200 "https://$HOST/v1/models"
check "voices"            200 "https://$HOST/v1/voices"
check "no key"            401 -X POST "https://$HOST/v1/speech" -H 'content-type: application/json' -d '{"text":"x"}'
check "not a Namu key"    401 "https://$HOST/v1/usage" -H 'authorization: Bearer abc'
check "unknown key (db)"  401 "https://$HOST/v1/usage" -H "authorization: Bearer namu_sk_$(openssl rand -hex 24)"
check "http to https"     301 "http://$HOST/v1/health"
exit $((fails > 0))
