"""Security helpers for Spotlight Storage.

Threat model: the app is usually self-hosted on a home LAN, sometimes exposed on
port 5000. Everything here is designed so a default LAN install keeps working
without configuration, while the dangerous cases (cross-site requests from a
malicious web page, SSRF, script injection, oversized uploads) are blocked.

Optional environment variables:
  SPOTLIGHT_API_TOKEN      If set, every API call must send it as
                           "Authorization: Bearer <token>" or "X-API-Key: <token>".
  SPOTLIGHT_ALLOWED_HOSTS  Comma-separated host names/IPs the app may be reached
                           at (protects against DNS rebinding), e.g.
                           "192.168.1.20,spotlight.local".
"""
import hmac
import ipaddress
import os
import re
import socket
from urllib.parse import urljoin, urlsplit

import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MAX_UPLOAD_BYTES = 10 * 1024 * 1024          # images and backup files
MAX_PROXY_IMAGE_BYTES = 10 * 1024 * 1024
PROXY_TIMEOUT = (3.05, 10)                    # (connect, read) seconds
PROXY_MAX_REDIRECTS = 3

# Paths that require the API token (when configured). Images and static assets
# stay public because <img> tags cannot send headers.
PROTECTED_PREFIXES = ('/api/', '/led/', '/upload', '/test_lights', '/proxy-image')

# GET endpoints that change state (light LEDs etc.). They get the same
# cross-site protection as POST/PUT/DELETE.
STATE_CHANGING_GET_PREFIXES = ('/api/find', '/api/findItem', '/proxy-image', '/api/export')

CONTENT_SECURITY_POLICY = "; ".join([
    "default-src 'self'",
    "script-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://code.jquery.com https://cdnjs.cloudflare.com",
    # Bootstrap/Tagify/Cropper set inline styles
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    # Item images may be hosted anywhere; cropper uses blob: URLs
    "img-src 'self' data: blob: http: https:",
    "font-src 'self' data: https://cdn.jsdelivr.net",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
])

SECURITY_HEADERS = {
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
}


def api_token():
    return os.getenv('SPOTLIGHT_API_TOKEN', '').strip()


def allowed_hosts():
    raw = os.getenv('SPOTLIGHT_ALLOWED_HOSTS', '')
    return {h.strip().lower() for h in raw.split(',') if h.strip()}


# ---------------------------------------------------------------------------
# Request checks (called from Flask before_request)
# ---------------------------------------------------------------------------

def _host_without_port(host):
    host = (host or '').strip().lower()
    if host.startswith('['):                      # [ipv6]:port
        return host[1:host.find(']')] if ']' in host else host
    return host.rsplit(':', 1)[0] if host.count(':') == 1 else host


def check_host(request):
    """Reject unexpected Host headers when SPOTLIGHT_ALLOWED_HOSTS is set."""
    hosts = allowed_hosts()
    if hosts and _host_without_port(request.host) not in hosts | {'localhost', '127.0.0.1'}:
        return 'Host not allowed'
    return None


def is_cross_site(request):
    """True when a browser sent this request on behalf of another website."""
    if request.headers.get('Sec-Fetch-Site', '').lower() == 'cross-site':
        return True
    origin = request.headers.get('Origin')
    if origin is None:
        return False                              # non-browser clients (Home Assistant, curl)
    if origin == 'null':
        return True                               # sandboxed iframes, file:// pages
    parts = urlsplit(origin)
    return parts.netloc.lower() != (request.host or '').lower()


def needs_csrf_check(request):
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        return True
    return request.path.startswith(STATE_CHANGING_GET_PREFIXES)


def provided_token(request):
    auth = request.headers.get('Authorization', '')
    if auth.lower().startswith('bearer '):
        return auth[7:].strip()
    return request.headers.get('X-API-Key', '').strip()


def check_token(request):
    token = api_token()
    if not token or not request.path.startswith(PROTECTED_PREFIXES):
        return True
    return hmac.compare_digest(provided_token(request).encode(), token.encode())


# ---------------------------------------------------------------------------
# WLED device addresses
# ---------------------------------------------------------------------------

_HOSTNAME_RE = re.compile(r'^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$',
                          re.IGNORECASE)


def normalize_device_host(value):
    """Return a clean IP address or host name for a WLED controller, or None.

    Rejects anything that could change the request target, such as
    "1.2.3.4@evil", "host/path", ports, schemes or whitespace.
    """
    if not isinstance(value, str):
        return None
    value = value.strip()
    try:
        return str(ipaddress.ip_address(value))
    except ValueError:
        pass
    if _HOSTNAME_RE.match(value) and not value.replace('.', '').isdigit():
        return value.lower()
    return None


# ---------------------------------------------------------------------------
# Item links / image references
# ---------------------------------------------------------------------------

_RELATIVE_PATH_RE = re.compile(r'^(?!//)[A-Za-z0-9._~/%-]+$')


def is_http_url(value):
    try:
        parts = urlsplit(value)
    except ValueError:
        return False
    return parts.scheme in ('http', 'https') and bool(parts.hostname)


def is_safe_link(value):
    """Item 'shop' links: empty or an http(s) URL. Blocks javascript: etc."""
    return value in (None, '') or (isinstance(value, str) and is_http_url(value.strip()))


def is_safe_image_ref(value):
    """Item images: empty, an http(s) URL or a same-origin relative path."""
    if value in (None, ''):
        return True
    if not isinstance(value, str):
        return False
    value = value.strip()
    return is_http_url(value) or bool(_RELATIVE_PATH_RE.match(value))


# ---------------------------------------------------------------------------
# Image uploads
# ---------------------------------------------------------------------------

def detect_image_type(head):
    """Identify an image from its first bytes. SVG/HTML are deliberately not
    accepted because they can carry scripts."""
    if head.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'png'
    if head.startswith(b'\xff\xd8\xff'):
        return 'jpg'
    if head.startswith((b'GIF87a', b'GIF89a')):
        return 'gif'
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
        return 'webp'
    return None


# ---------------------------------------------------------------------------
# Image proxy (SSRF protection)
# ---------------------------------------------------------------------------

class ProxyError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def _resolve(hostname):
    return {info[4][0] for info in socket.getaddrinfo(hostname, None)}


def is_public_host(hostname):
    """True only if every address the host resolves to is a public address."""
    try:
        addresses = _resolve(hostname)
    except (socket.gaierror, UnicodeError, ValueError):
        return False
    if not addresses:
        return False
    for address in addresses:
        ip = ipaddress.ip_address(address.split('%')[0])
        if not ip.is_global or ip.is_multicast:
            return False
    return True


def check_public_url(url):
    try:
        parts = urlsplit(url)
    except ValueError:
        raise ProxyError(400, 'Invalid URL')
    if parts.scheme not in ('http', 'https') or not parts.hostname:
        raise ProxyError(400, 'Only http and https image URLs are allowed')
    if parts.username or parts.password:
        raise ProxyError(400, 'URLs with credentials are not allowed')
    if not is_public_host(parts.hostname):
        raise ProxyError(403, 'Image host is not a public address')


def fetch_public_image(url, session=requests):
    """Download an image from a public URL. Returns (bytes, content_type).

    Blocks private/loopback/link-local targets (also after redirects), limits
    size and time, and only passes through image content types (never SVG).
    """
    for _ in range(PROXY_MAX_REDIRECTS + 1):
        check_public_url(url)
        try:
            response = session.get(url, stream=True, timeout=PROXY_TIMEOUT, allow_redirects=False)
        except requests.RequestException:
            raise ProxyError(502, 'Could not fetch image')
        try:
            if response.status_code in (301, 302, 303, 307, 308) and response.headers.get('Location'):
                url = urljoin(url, response.headers['Location'])
                continue
            if response.status_code != 200:
                raise ProxyError(502, f'Image server returned {response.status_code}')
            content_type = response.headers.get('Content-Type', '').split(';')[0].strip().lower()
            if not content_type.startswith('image/') or 'svg' in content_type:
                raise ProxyError(415, 'URL is not a supported image')
            declared = response.headers.get('Content-Length')
            if declared and declared.isdigit() and int(declared) > MAX_PROXY_IMAGE_BYTES:
                raise ProxyError(413, 'Image too large')
            body = bytearray()
            for chunk in response.iter_content(64 * 1024):
                body.extend(chunk)
                if len(body) > MAX_PROXY_IMAGE_BYTES:
                    raise ProxyError(413, 'Image too large')
            return bytes(body), content_type
        finally:
            response.close()
    raise ProxyError(502, 'Too many redirects')
