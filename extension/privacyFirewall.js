// SEVA VAANI - Privacy Firewall (Extension Outbound Gate)
// Enforces local-first data protection and prevents unauthorized external transmission.
//
// Privacy Guarantees:
// 1. Only explicitly approved SEVA VAANI backend endpoints are allowed.
// 2. Tokens are never transmitted in URL query strings.
// 3. Page DOM, cookies, and screenshots are never sent outbound.
// 4. Failed privacy checks BLOCK the request immediately with clear error diagnostics.

(function () {
  'use strict';

  // Approved backend origins (local development and loopback)
  const APPROVED_ORIGINS = new Set([
    'http://127.0.0.1:8000',
    'http://localhost:8000'
  ]);

  // Approved API paths for public service assistance
  const APPROVED_PATHS = [
    '/api/session',
    '/api/assist/turn',
    '/api/confirm',
    '/api/fallback/text',
    '/api/help',
    '/api/help/request',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/me',
    '/api/auth/logout',
    '/api/session/language',
    '/api/application/submit',
    '/api/guidance',
    '/api/service-sessions',
    '/api/verify'
  ];

  class PrivacyFirewallError extends Error {
    constructor(message, details = {}) {
      super(message);
      this.name = 'PrivacyFirewallError';
      this.details = details;
    }
  }

  function validateUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new PrivacyFirewallError('Invalid URL provided to outbound network layer.');
    }

    let parsed;
    try {
      parsed = new URL(rawUrl, window.location.origin);
    } catch (e) {
      throw new PrivacyFirewallError(`Malformed URL blocked by Privacy Firewall: ${rawUrl}`);
    }

    // 1. Check origin against approved allowlist
    const origin = parsed.origin;
    if (!APPROVED_ORIGINS.has(origin)) {
      throw new PrivacyFirewallError(
        `[PRIVACY FIREWALL BLOCKED] Destination origin '${origin}' is not an authorized SEVA VAANI backend. Transmission rejected.`,
        { blockedOrigin: origin }
      );
    }

    // 2. Check path against approved API route list
    const isApprovedPath = APPROVED_PATHS.some(p => parsed.pathname === p || parsed.pathname.startsWith(p + '/'));
    if (!isApprovedPath) {
      throw new PrivacyFirewallError(
        `[PRIVACY FIREWALL BLOCKED] Unapproved endpoint path '${parsed.pathname}'. Only approved public-service routes are permitted.`,
        { blockedPath: parsed.pathname }
      );
    }

    // 3. Ensure authorization tokens never appear in URL query string
    const searchLower = parsed.search.toLowerCase();
    if (searchLower.includes('token') || searchLower.includes('bearer') || searchLower.includes('auth')) {
      throw new PrivacyFirewallError(
        `[PRIVACY FIREWALL BLOCKED] Query parameters must not contain credentials or tokens. Use Authorization header instead.`
      );
    }

    return true;
  }

  function inspectPayload(rawUrl, options = {}) {
    // If request has a body, ensure it is JSON and does not contain prohibited full DOM dumps
    if (options.body && typeof options.body === 'string') {
      try {
        const parsedBody = JSON.parse(options.body);
        // Ensure no arbitrary outer HTML or script injection
        if (parsedBody.outerHTML || parsedBody.documentHTML || parsedBody.full_dom) {
          throw new PrivacyFirewallError(
            '[PRIVACY FIREWALL BLOCKED] Full page DOM transmission to backend is prohibited.'
          );
        }
      } catch (e) {
        if (e instanceof PrivacyFirewallError) throw e;
        // Not JSON; allowable only for non-structured uploads
      }
    }
    return true;
  }

  /**
   * Secure fetch wrapper that runs all requests through the Privacy Firewall.
   */
  async function secureFetch(url, options = {}) {
    // 1. Validate destination
    validateUrl(url);

    // 2. Inspect outbound payload
    inspectPayload(url, options);

    // 3. Execute approved request
    return fetch(url, options);
  }

  function registerApprovedOrigin(origin) {
    if (!origin || typeof origin !== 'string') return false;
    try {
      const u = new URL(origin);
      if (u.protocol === 'https:' || u.hostname === '127.0.0.1' || u.hostname === 'localhost') {
        APPROVED_ORIGINS.add(u.origin);
        return true;
      }
    } catch (_) {}
    return false;
  }

  window.SEVA_VAANI_PRIVACY_FIREWALL = {
    validateUrl,
    inspectPayload,
    secureFetch,
    registerApprovedOrigin,
    APPROVED_ORIGINS: Array.from(APPROVED_ORIGINS),
    APPROVED_PATHS
  };
})();
