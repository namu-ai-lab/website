"""The Namu API gateway on AWS: the app of platform/modal/namu_gateway.py, run by uvicorn on ECS Fargate
behind an Application Load Balancer (platform/aws/infra).

    uvicorn main:app --host 0.0.0.0 --port 8080 --proxy-headers --forwarded-allow-ips <VPC CIDR>

Configuration comes from the environment; ECS fills it from the Secrets Manager secret `namu/api/gateway`:

    GATEWAY_DATABASE_URL   Neon, the namu_gateway role (it may call the gateway's functions and nothing else)
    NAMU_KEY_PEPPER        the HMAC pepper API keys are stored under; the same value as the website's
    MODAL_PROXY_KEY        the Modal proxy token that opens the four model services
    MODAL_PROXY_SECRET

A missing database URL or pepper stops the task at start-up instead of serving a gateway that cannot check keys;
ECS then rolls the deployment back. The proxy token may be empty only while the model services still run without
proxy auth (before the owner can mint one); the gateway then says so in its log at every start. The caller's address
is the one the load balancer appends to X-Forwarded-For: uvicorn trusts only the VPC's addresses, so a client cannot
choose its own.
"""
import os
import sys

import namu_gateway as gw

REQUIRED = ("GATEWAY_DATABASE_URL", "NAMU_KEY_PEPPER")
PROXY = ("MODAL_PROXY_KEY", "MODAL_PROXY_SECRET")


def build(env=os.environ):
    # Names only in these messages, never values.
    missing = [name for name in REQUIRED if not env.get(name, "").strip()]
    if missing:
        print(f"namu-api: not starting, missing configuration: {', '.join(missing)}", file=sys.stderr, flush=True)
        raise SystemExit(78)                   # EX_CONFIG
    key, secret = (env.get(name, "").strip() for name in PROXY)
    if bool(key) != bool(secret):
        print("namu-api: not starting, MODAL_PROXY_KEY and MODAL_PROXY_SECRET must be set together",
              file=sys.stderr, flush=True)
        raise SystemExit(78)
    if not key:
        print("namu-api: WARNING no Modal proxy token: the model services must still be open; "
              "set MODAL_PROXY_KEY/MODAL_PROXY_SECRET before they are locked", file=sys.stderr, flush=True)
    store = gw.PostgresStore(env["GATEWAY_DATABASE_URL"])
    upstream = gw.ModalUpstream(gw.UPSTREAM, key or None, secret or None)
    return gw.create_app(store, upstream, gw.MemoryLimiter(), env["NAMU_KEY_PEPPER"])


# Tests import this module with NAMU_API_NO_AUTOBUILD=1 and call build() with their own environment.
app = None if os.environ.get("NAMU_API_NO_AUTOBUILD") == "1" else build()
