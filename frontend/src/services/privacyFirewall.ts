/**
 * SEVA VAANI — Frontend Privacy Firewall
 * Validates destinations and payloads before outbound network dispatch.
 */

const APPROVED_ORIGINS = new Set([
  'http://127.0.0.1:8000',
  'http://localhost:8000',
  window.location.origin
]);

const APPROVED_PATHS = [
  '/api/session',
  '/api/assist/turn',
  '/api/confirm',
  '/api/fallback/text',
  '/api/help/request',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/me',
  '/api/auth/logout',
  '/api/session/language',
  '/api/application/submit',
  '/api/submit',
  '/api/metrics',
  '/api/service-sessions'
];

export class FrontendPrivacyViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FrontendPrivacyViolation';
  }
}

export function validateOutboundRequest(url: string, options: RequestInit = {}): boolean {
  if (!url) throw new FrontendPrivacyViolation('Empty URL in outbound request.');

  let parsed: URL;
  try {
    parsed = new URL(url, window.location.origin);
  } catch (e) {
    throw new FrontendPrivacyViolation(`Malformed URL: ${url}`);
  }

  // 1. Destination origin allowlist check
  if (!APPROVED_ORIGINS.has(parsed.origin)) {
    throw new FrontendPrivacyViolation(
      `[PRIVACY FIREWALL] Request to unauthorized external origin '${parsed.origin}' blocked.`
    );
  }

  // 2. Approved path validation
  const isApproved = APPROVED_PATHS.some(p => parsed.pathname === p || parsed.pathname.startsWith(p + '/'));
  if (!isApproved) {
    throw new FrontendPrivacyViolation(
      `[PRIVACY FIREWALL] Request to unapproved endpoint path '${parsed.pathname}' blocked.`
    );
  }

  // 3. Prevent tokens in query string
  const searchLower = parsed.search.toLowerCase();
  if (searchLower.includes('token') || searchLower.includes('bearer')) {
    throw new FrontendPrivacyViolation(
      '[PRIVACY FIREWALL] Auth tokens must not be passed in URL query string.'
    );
  }

  // 4. Payload inspection
  if (options.body && typeof options.body === 'string') {
    try {
      const data = JSON.parse(options.body);
      if (data.outerHTML || data.documentHTML || data.full_dom) {
        throw new FrontendPrivacyViolation(
          '[PRIVACY FIREWALL] DOM dump transmission is prohibited.'
        );
      }
    } catch (e) {
      if (e instanceof FrontendPrivacyViolation) throw e;
    }
  }

  return true;
}

export async function privacyFetch(url: string, options: RequestInit = {}): Promise<Response> {
  validateOutboundRequest(url, options);
  return fetch(url, options);
}
