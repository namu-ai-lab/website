"""The AWS entry point of the gateway (platform/aws/gateway/main.py) and its in-process rate limiter."""
import importlib
import os
import sys
from pathlib import Path

import pytest

import namu_gateway as gw

AWS_GATEWAY = Path(__file__).resolve().parents[1] / "aws" / "gateway"


@pytest.fixture
def main(monkeypatch):
    monkeypatch.setenv("NAMU_API_NO_AUTOBUILD", "1")
    monkeypatch.syspath_prepend(str(AWS_GATEWAY))
    sys.modules.pop("main", None)
    return importlib.import_module("main")


# ---------------------------------------------------------------- MemoryLimiter
def test_memory_limiter_counts_per_window():
    t = [1000.0]
    lim = gw.MemoryLimiter(clock=lambda: t[0])
    assert [lim.hit("k", 2, 60)[0] for _ in range(3)] == [True, True, False]
    allowed, retry = lim.hit("k", 2, 60)
    assert not allowed and retry == 20           # 1000 is 40 s into the window 960–1020
    assert lim.hit("other", 2, 60)[0]            # buckets are separate
    t[0] = 1020.0
    assert lim.hit("k", 2, 60)[0]                # a new window starts from zero


def test_memory_limiter_forgets_closed_windows_when_full(monkeypatch):
    monkeypatch.setattr(gw.MemoryLimiter, "MAX_BUCKETS", 3)
    t = [0.0]
    lim = gw.MemoryLimiter(clock=lambda: t[0])
    for b in "abc":
        lim.hit(b, 5, 60)
    t[0] = 60.0                                  # every window above is now closed
    lim.hit("d", 5, 60)
    assert set(k[0] for k in lim.counts) == {"d"}


def test_memory_limiter_is_safe_across_threads():
    from concurrent.futures import ThreadPoolExecutor

    lim = gw.MemoryLimiter(clock=lambda: 0.0)
    with ThreadPoolExecutor(16) as pool:
        results = list(pool.map(lambda _: lim.hit("k", 500, 60)[0], range(1000)))
    assert results.count(True) == 500


# ---------------------------------------------------------------- configuration
def test_refuses_to_start_without_database_or_pepper(main, capsys):
    for env in ({}, {"GATEWAY_DATABASE_URL": "postgresql://x"}, {"NAMU_KEY_PEPPER": "p", "GATEWAY_DATABASE_URL": " "}):
        with pytest.raises(SystemExit) as e:
            main.build(env)
        assert e.value.code == 78
    err = capsys.readouterr().err
    assert "missing configuration" in err and "postgresql://x" not in err   # names only, never values


def test_proxy_token_halves_must_come_together(main):
    env = {"GATEWAY_DATABASE_URL": "postgresql://x", "NAMU_KEY_PEPPER": "p", "MODAL_PROXY_KEY": "wk-1"}
    with pytest.raises(SystemExit):
        main.build(env)


def test_refuses_to_start_without_a_writable_temporary_directory(main, monkeypatch, capsys):
    # On Fargate, a /tmp volume the image did not hand to the app user: every MP3/Opus answer would 500 after the GPU work.
    def no_tmp(*a, **k):
        raise FileNotFoundError(2, "No usable temporary directory found")
    monkeypatch.setattr(main.tempfile, "TemporaryFile", no_tmp)
    monkeypatch.setattr(gw, "PostgresStore", lambda url: pytest.fail("built a store without a temporary directory"))
    with pytest.raises(SystemExit) as e:
        main.build({"GATEWAY_DATABASE_URL": "postgresql://x", "NAMU_KEY_PEPPER": "p"})
    assert e.value.code == 73
    assert "no writable temporary directory" in capsys.readouterr().err


def test_builds_with_and_without_the_proxy_token(main, monkeypatch, capsys):
    made = {}
    monkeypatch.setattr(gw, "PostgresStore", lambda url: made.setdefault("store", url))
    monkeypatch.setattr(gw, "ModalUpstream", lambda urls, k, s: made.setdefault("proxy", []).append((k, s)) or object())
    monkeypatch.setattr(gw, "create_app", lambda store, upstream, limiter, pepper: (type(limiter).__name__, pepper))
    base = {"GATEWAY_DATABASE_URL": "postgresql://x", "NAMU_KEY_PEPPER": "pep"}
    assert main.build(base) == ("MemoryLimiter", "pep")
    assert "no Modal proxy token" in capsys.readouterr().err
    main.build({**base, "MODAL_PROXY_KEY": "wk-1", "MODAL_PROXY_SECRET": "ws-1"})
    assert made["proxy"] == [(None, None), ("wk-1", "ws-1")]
    assert "wk-1" not in capsys.readouterr().err


def test_the_gateway_module_imports_without_modal():
    # The AWS image has no `modal` package: the module must load and skip only its Modal entry point.
    import subprocess

    code = ("import sys, builtins\n"
            "real = builtins.__import__\n"
            "def no_modal(name, *a, **k):\n"
            "    if name == 'modal' or name.startswith('modal.'):\n"
            "        raise ImportError(name)\n"
            "    return real(name, *a, **k)\n"
            "builtins.__import__ = no_modal\n"
            "import namu_gateway as gw\n"
            "assert gw.modal is None and gw.app is None and not hasattr(gw, 'api')\n"
            "assert callable(gw.create_app) and gw.MemoryLimiter\n")
    r = subprocess.run([sys.executable, "-c", code], cwd=Path(gw.__file__).parent, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr


# ---------------------------------------------------------------- the caller's address behind the load balancer
def test_client_address_is_the_one_the_load_balancer_appended():
    """uvicorn trusts X-Forwarded-For only from the VPC, and then takes the rightmost address outside it: the one
    the ALB appended. A client that sends its own X-Forwarded-For cannot choose its address."""
    import asyncio

    from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

    seen = {}

    async def app(scope, receive, send):
        seen["client"] = scope["client"][0]

    mw = ProxyHeadersMiddleware(app, trusted_hosts="10.40.0.0/16")

    def call(peer, xff):
        scope = {"type": "http", "client": (peer, 1234), "scheme": "http",
                 "headers": [(b"x-forwarded-for", xff.encode())] if xff else []}
        asyncio.run(mw(scope, None, None))
        return seen["client"]

    assert call("10.40.1.7", "198.51.100.9, 203.0.113.5") == "203.0.113.5"     # spoofed left entry ignored
    assert call("10.40.1.7", "203.0.113.5") == "203.0.113.5"
    assert call("203.0.113.66", "10.0.0.1") == "203.0.113.66"                  # not via the ALB: header ignored
