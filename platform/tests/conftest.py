"""Lets the gateway tests run without the Modal SDK.

namu_gateway.py imports modal at the top to declare its image, secrets and
deployed function. The tests use only create_app and the helpers, which never
touch it, so when modal is not installed (CI, a fresh checkout) a stand-in that
accepts any attribute or call takes its place. With modal installed, the real
one is used.
"""

import sys
from unittest.mock import MagicMock


def modal_installed() -> bool:
    try:
        import modal
    except ImportError:
        return False
    # Run from platform/, the folder platform/modal imports as an empty namespace package.
    return hasattr(modal, "App")


if not modal_installed():
    sys.modules["modal"] = MagicMock(name="modal")
