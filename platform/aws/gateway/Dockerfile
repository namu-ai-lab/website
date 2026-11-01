# The Namu API gateway on AWS (ECS Fargate, linux/amd64). Build context: platform/
#
#     docker build --platform linux/amd64 -f platform/aws/gateway/Dockerfile -t namu-api platform
#
# The same app as the Modal gateway (modal/namu_gateway.py), without Modal. ffmpeg/ffprobe measure uploads
# before any GPU work and encode MP3/Opus; they parse untrusted audio, so rebuild often for Debian's fixes.
# The task runs with a read-only root filesystem; /tmp is a writable task volume (platform/aws/infra).
# Docker Hub's official image through AWS's public mirror: CodeBuild pulls it without Docker Hub's rate limits.
FROM public.ecr.aws/docker/library/python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 10001 --user-group --no-create-home --shell /usr/sbin/nologin namu

WORKDIR /app
COPY aws/gateway/requirements.txt .
RUN pip install -r requirements.txt
COPY modal/namu_gateway.py aws/gateway/main.py ./

USER 10001
EXPOSE 8080
# --forwarded-allow-ips: only the VPC (platform/aws/infra, 10.40.0.0/16) is trusted to set X-Forwarded-For, so the
# caller's address is the one the load balancer appended. Keep-alive outlasts the load balancer's idle timeout (900 s)
# so the balancer never reuses a connection the app has closed. No access log: the gateway logs its own events.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", \
     "--proxy-headers", "--forwarded-allow-ips", "10.40.0.0/16", \
     "--timeout-keep-alive", "905", "--limit-concurrency", "96", "--no-access-log"]
