"""Shared test setup: a small stand-in for the `modal` package when it is not installed.

    python3 -m pip install -r platform/requirements-dev.txt
    python3 -m pytest platform/tests -q

The services import modal at module level only for their decorators and builders (App, Image, Secret, Dict,
asgi_app ...). The tests drive the FastAPI apps and the pure helpers with fakes and never touch Modal itself, so a
stub that accepts every one of those calls is enough. When modal is installed, the real package is used instead.
"""

import contextlib
import sys
import types


def _decorator(*_args, **_kwargs):
    return lambda f: f


class _Image:
    """Every builder step returns the same image; `imports()` skips packages only the container has, as Modal's
    own `Image.imports()` does outside the container."""

    def __getattr__(self, _name):
        return lambda *a, **k: self

    def imports(self):
        return contextlib.suppress(ImportError)


class _App:
    def __init__(self, *_args, **_kwargs):
        pass

    function = cls = local_entrypoint = staticmethod(_decorator)


def _named(*_args, **_kwargs):
    return object()


def _modal_installed() -> bool:
    # Run from platform/, the folder platform/modal/ itself imports as an empty namespace package named
    # `modal`, so finding *a* modal is not enough: the real one has App.
    try:
        import modal
    except ImportError:
        return False
    return hasattr(modal, "App")


if not _modal_installed():
    stub = types.ModuleType("modal")
    stub.App = _App
    stub.Image = types.SimpleNamespace(debian_slim=lambda *a, **k: _Image())
    stub.Secret = types.SimpleNamespace(from_name=_named)
    stub.Volume = types.SimpleNamespace(from_name=_named)
    stub.Dict = types.SimpleNamespace(from_name=lambda *a, **k: {})
    stub.asgi_app = stub.concurrent = stub.enter = stub.method = _decorator
    sys.modules["modal"] = stub
