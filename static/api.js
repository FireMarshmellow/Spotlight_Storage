// Adds the optional API token (SPOTLIGHT_API_TOKEN on the server) to every
// same-origin request. When the server answers 401, ask for the token once,
// remember it in this browser and retry the request.
(function () {
    const STORAGE_KEY = 'spotlight_api_token';
    const originalFetch = window.fetch.bind(window);
    let pendingPrompt = null;

    function getToken() {
        try { return localStorage.getItem(STORAGE_KEY) || ''; } catch (e) { return ''; }
    }

    function setToken(token) {
        try {
            if (token) localStorage.setItem(STORAGE_KEY, token); else localStorage.removeItem(STORAGE_KEY);
        } catch (e) { /* storage unavailable */ }
    }

    function isSameOrigin(input) {
        try {
            const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
            return url.origin === window.location.origin;
        } catch (e) {
            return false;
        }
    }

    function withToken(init) {
        const token = getToken();
        if (!token) return init || {};
        const headers = new Headers((init && init.headers) || {});
        headers.set('X-API-Key', token);
        return Object.assign({}, init, { headers });
    }

    function askForToken() {
        if (!pendingPrompt) {
            pendingPrompt = Promise.resolve().then(() => {
                const token = window.prompt('This Spotlight Storage server requires an API token. Enter it to continue:');
                setToken(token ? token.trim() : '');
                return Boolean(token);
            }).finally(() => { setTimeout(() => { pendingPrompt = null; }, 0); });
        }
        return pendingPrompt;
    }

    window.fetch = async function (input, init) {
        if (!isSameOrigin(input)) return originalFetch(input, init);
        const response = await originalFetch(input, withToken(init));
        if (response.status !== 401) return response;
        const entered = await askForToken();
        return entered ? originalFetch(input, withToken(init)) : response;
    };

    // Download a protected file (e.g. the backup export) with the token attached
    window.downloadWithToken = async function (url, fallbackName) {
        const response = await window.fetch(url);
        if (!response.ok) throw new Error(`Download failed (${response.status})`);
        const disposition = response.headers.get('Content-Disposition') || '';
        const match = disposition.match(/filename="([^"]+)"/);
        const blobUrl = URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = match ? match[1] : fallbackName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
    };

    // Shared escaping helpers for code that builds HTML strings
    window.escapeHtml = window.escapeHtml || function (value) {
        return String(value ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[c]);
    };

    // Only allow http(s) links and same-origin relative paths in href/src
    window.safeUrl = function (value) {
        const text = String(value ?? '').trim();
        if (text === '') return '';
        try {
            const url = new URL(text, window.location.href);
            if (url.protocol === 'http:' || url.protocol === 'https:') return text;
        } catch (e) { /* fall through */ }
        return '';
    };
})();
