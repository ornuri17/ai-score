// ============================================================
// AIScore robots helpers
// robots.txt evaluation (RFC 9309) and X-Robots-Tag header parsing.
// ============================================================

import robotsParser from 'robots-parser';

/** The AI crawlers whose access is scored. */
export const SCORED_AI_BOTS = ['GPTBot', 'ClaudeBot', 'PerplexityBot'] as const;

/**
 * True when robots.txt disallows `bot` from fetching `pageUrl`.
 *
 * Uses robots-parser, which implements RFC 9309: user-agent groups (several
 * User-agent lines sharing one rule block), the most specific group wins over `*`,
 * the longest matching rule wins, Allow wins a tie, and `*` / `$` wildcards.
 */
export function isBotBlocked(robotsTxt: string, pageUrl: string, bot: string): boolean {
  let robotsUrl: string;
  try {
    robotsUrl = new URL('/robots.txt', pageUrl).toString();
  } catch {
    return false;
  }
  const robots = robotsParser(robotsUrl, robotsTxt);
  // isAllowed returns undefined when the URL is not on the robots.txt origin.
  return robots.isAllowed(pageUrl, bot) === false;
}

export interface XRobotsDirectives {
  noindex: boolean;
  nofollow: boolean;
}

/**
 * Parses an X-Robots-Tag header value (already combined with ", " when repeated).
 *
 * Directives may be global ("noindex, nofollow") or scoped to a crawler
 * ("googlebot: noindex"). A scoped directive only counts when it targets one of
 * `bots` (case-insensitive) or the generic "*" scope.
 * "none" is equivalent to "noindex, nofollow".
 */
export function parseXRobotsTag(header: string | undefined, bots: readonly string[] = SCORED_AI_BOTS): XRobotsDirectives {
  const result: XRobotsDirectives = { noindex: false, nofollow: false };
  if (header == null || header.trim() === '') return result;

  const wanted = new Set(bots.map((b) => b.toLowerCase()));
  let scope: string | null = null;

  for (const rawPart of header.split(',')) {
    let part = rawPart.trim().toLowerCase();
    if (part === '') continue;

    // "botname: directive" starts a scoped run that lasts until the next scope.
    // Directives that carry a value ("unavailable_after: <date>", "max-snippet: 20")
    // are not scopes, so only treat the prefix as a bot name when it is not a known directive.
    const colon = part.indexOf(':');
    if (colon > 0) {
      const prefix = part.slice(0, colon).trim();
      const knownValueDirectives = ['unavailable_after', 'max-snippet', 'max-image-preview', 'max-video-preview'];
      if (!knownValueDirectives.includes(prefix)) {
        scope = prefix;
        part = part.slice(colon + 1).trim();
      }
    }

    const applies = scope === null || scope === '*' || wanted.has(scope);
    if (!applies) continue;

    if (part === 'noindex' || part === 'none') result.noindex = true;
    if (part === 'nofollow' || part === 'none') result.nofollow = true;
  }

  return result;
}
