// ============================================================
// AIScore URL Validators
// SSRF protection: blocks private IP ranges and localhost.
// ============================================================

const PRIVATE_IP_PATTERNS: RegExp[] = [
  /^127\./,                           // 127.0.0.0/8 loopback
  /^10\./,                            // 10.0.0.0/8
  /^192\.168\./,                      // 192.168.0.0/16
  /^172\.(1[6-9]|2\d|3[01])\./,      // 172.16.0.0/12
  /^::1$/,                            // IPv6 loopback
  /^fc00:/i,                          // IPv6 unique local
  /^fe80:/i,                          // IPv6 link-local
];

const BLOCKED_HOSTNAMES: string[] = ['localhost'];

function isPrivateHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.includes(lower)) {
    return true;
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(lower)) {
      return true;
    }
  }

  return false;
}

/**
 * URL must be http or https, valid hostname, no localhost/private IPs.
 * Blocks SSRF vectors.
 */
export function isValidUrl(url: string): boolean {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const hostname = parsed.hostname;

  if (hostname.length === 0) {
    return false;
  }

  if (isPrivateHostname(hostname)) {
    return false;
  }

  return true;
}

/**
 * Normalize URL to domain only:
 * - Lowercase
 * - Strip www.
 * - Strip trailing slash
 * - Strip path, query, fragment
 * "https://www.Example.com/page" -> "example.com"
 */
export function extractDomain(url: string): string {
  let parsed: URL;

  try {
    const normalized = url.includes('://') ? url : `https://${url}`;
    parsed = new URL(normalized);
  } catch {
    const withoutProtocol = url.replace(/^https?:\/\//i, '');
    const withoutPath = withoutProtocol.split('/')[0] ?? withoutProtocol;
    return withoutPath.replace(/^www\./i, '').toLowerCase().replace(/\/$/, '');
  }

  let hostname = parsed.hostname.toLowerCase();
  hostname = hostname.replace(/^www\./, '');
  return hostname;
}

/**
 * Normalize full URL for consistent hashing:
 * - Lowercase protocol and host
 * - Force https://
 * - Strip trailing slash
 * "HTTP://Example.com/" -> "https://example.com"
 */
export function normalizeUrl(url: string): string {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return url.toLowerCase();
  }

  const hostname = parsed.hostname.toLowerCase();
  return `https://${hostname}`;
}
