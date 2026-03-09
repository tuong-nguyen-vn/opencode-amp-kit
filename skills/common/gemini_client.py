#!/usr/bin/env python3
"""
Shared Gemini client module with proxy support.

Provides proxy detection, base URL normalization, key resolution, and client
factory for all Gemini-based skills (hd-look-at, future hd-painter, etc.).

Proxy support enables Gemini API access through Claude Code CLI's CLIProxyAPI,
which accepts google-genai SDK format at /v1beta/models/*action with
x-goog-api-key auth.

Priority chains:
  API key:  .env GEMINI_API_KEY > env GEMINI_API_KEY > ANTHROPIC_AUTH_TOKEN > centralized resolver
  Base URL: .env GEMINI_BASE_URL > env GEMINI_BASE_URL > ANTHROPIC_BASE_URL > None (direct)

Key safety:
  resolve_client_config() ensures keys and base URLs are always correctly paired:
  - GEMINI_API_KEY (Google direct) → always pairs with None (direct mode)
  - ANTHROPIC_AUTH_TOKEN (proxy)   → always pairs with proxy base_url
"""

import os
import sys
from pathlib import Path
from typing import Optional, Tuple

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

# Try centralized resolver (resolve_env.py lives in skills/common/ alongside this module)
sys.path.insert(0, str(Path(__file__).parent))
try:
    from resolve_env import resolve_env

    _CENTRALIZED_RESOLVER_AVAILABLE = True
except ImportError:
    _CENTRALIZED_RESOLVER_AVAILABLE = False


def _normalize_base_url(url: str) -> str:
    """Normalize proxy base URL for google-genai SDK.

    The SDK appends /v1beta internally, so the base URL must be host-only.
    Strips trailing slashes and /v1beta suffix to prevent double-prefix.
    """
    url = url.rstrip("/")
    for suffix in ("/v1beta", "/v1beta/"):
        if url.endswith(suffix.rstrip("/")):
            url = url[: -len(suffix.rstrip("/"))]
            break
    return url.rstrip("/")


def detect_proxy() -> Tuple[Optional[str], bool]:
    """Detect proxy configuration from environment.

    Checks for explicit GEMINI_BASE_URL first, then falls back to
    ANTHROPIC_BASE_URL (auto-detected from Claude Code CLI).

    Returns:
        (base_url, is_proxy) — normalized URL and proxy flag.
        (None, False) when no proxy is configured.
    """
    # Priority 1: Explicit Gemini proxy URL
    base_url = os.getenv("GEMINI_BASE_URL")
    if base_url:
        return _normalize_base_url(base_url), True

    # Priority 2: Auto-detect from Claude CLI
    base_url = os.getenv("ANTHROPIC_BASE_URL")
    if base_url:
        return _normalize_base_url(base_url), True

    return None, False


def find_api_key(skill: str = "look_at") -> Optional[str]:
    """Find Gemini API key with proxy fallback.

    Priority:
    1. .env GEMINI_API_KEY via centralized resolver (direct mode, rotation OK)
    2. GEMINI_API_KEY from environment
    3. ANTHROPIC_AUTH_TOKEN (proxy mode, single token, no rotation)
    4. Centralized resolver fallback (if not tried above)
    """
    # Priority 1+4: Centralized resolver (covers .env hierarchy)
    if _CENTRALIZED_RESOLVER_AVAILABLE:
        key = resolve_env("GEMINI_API_KEY", skill=skill)
        if key:
            return key

    # Priority 2: Direct env var
    key = os.getenv("GEMINI_API_KEY")
    if key:
        return key

    # Priority 3: Proxy auth token (Claude CLI)
    key = os.getenv("ANTHROPIC_AUTH_TOKEN")
    if key:
        return key

    return None


def create_client(api_key: str, base_url: Optional[str] = None) -> "genai.Client":
    """Create a genai.Client with optional proxy base URL.

    Args:
        api_key: API key or proxy auth token.
        base_url: Normalized proxy base URL, or None for direct mode.

    Returns:
        Configured genai.Client instance.
    """
    if genai is None:
        raise ImportError("google-genai package not installed. Install with: pip install google-genai")

    if base_url:
        return genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(base_url=base_url),
        )
    return genai.Client(api_key=api_key)


def is_proxy_mode() -> bool:
    """Check if proxy mode is active."""
    _, proxy = detect_proxy()
    return proxy


def has_direct_key(skill: str = "look_at") -> bool:
    """Check if a direct GEMINI_API_KEY is available (not proxy token).

    Used to decide whether key rotation is possible and whether generation
    tasks should bypass proxy for direct API access.
    """
    if _CENTRALIZED_RESOLVER_AVAILABLE:
        key = resolve_env("GEMINI_API_KEY", skill=skill)
        if key:
            return True

    return bool(os.getenv("GEMINI_API_KEY"))


def resolve_client_config(skill: str = "look_at") -> Tuple[Optional[str], Optional[str]]:
    """Resolve API key and base URL as a correctly matched pair.

    Ensures a direct Google API key is never sent to a proxy endpoint
    and a proxy token is never sent to Google directly.

    Rules:
    - GEMINI_API_KEY found → (direct_key, None)  — always bypass proxy
    - No GEMINI_API_KEY, proxy detected → (ANTHROPIC_AUTH_TOKEN, proxy_url)
    - Neither → (None, None)

    Returns:
        (api_key, base_url) tuple ready for create_client().
    """
    # Check for direct Google API key first
    direct_key = None
    if _CENTRALIZED_RESOLVER_AVAILABLE:
        direct_key = resolve_env("GEMINI_API_KEY", skill=skill)
    if not direct_key:
        direct_key = os.getenv("GEMINI_API_KEY")

    if direct_key:
        # Direct key always uses Google API directly (bypass proxy)
        return direct_key, None

    # No direct key — try proxy
    base_url, proxy_mode = detect_proxy()
    if proxy_mode:
        proxy_token = os.getenv("ANTHROPIC_AUTH_TOKEN")
        if proxy_token:
            return proxy_token, base_url

    return None, None
