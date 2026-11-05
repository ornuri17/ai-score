// ============================================================
// AIScore fixes
// Turns failed checks into ranked, copy-paste prompts for coding agents
// (Cursor, Claude Code, ...), with the points each fix is worth.
// ============================================================

export interface Fix {
  id: string;
  kind: 'classic' | 'agent';
  title: string;
  /** Points the score gains when this is fixed (for classic checks an estimate, penalties included). */
  gain: number;
  prompt: string;
}

interface ClassicFixSpec {
  title: string;
  gain: number;
  task: (ctx: { url: string; host: string }) => string;
  verify: (ctx: { url: string; host: string }) => string;
}

// Gains are in the rebalanced 100-point scale: original points x (new dimension max / old max), rounded,
// plus any penalty that disappears with the fix.
const CLASSIC: Record<string, ClassicFixSpec> = {
  blocked_from_crawlers: {
    title: 'Remove noindex',
    gain: 34,
    task: ({ url }) =>
      `${url} tells crawlers not to index it (a robots meta tag or an X-Robots-Tag response header with noindex/none). Find where it is set (HTML head, framework SEO config, middleware, CDN or server headers) and remove noindex for public pages. Keep it only on pages that really must stay out of search, such as admin or staging.`,
    verify: ({ url }) => `curl -sI ${url} | grep -i x-robots-tag; curl -s ${url} | grep -i 'name="robots"'`,
  },
  ai_crawlers_blocked: {
    title: 'Allow AI crawlers in robots.txt',
    gain: 20,
    task: ({ url }) =>
      `robots.txt blocks GPTBot, ClaudeBot or PerplexityBot from ${url}. Update robots.txt so these crawlers may fetch public pages. Note: search crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot) decide whether the site appears in AI answers; training crawlers (GPTBot, ClaudeBot, Google-Extended) only collect training data. If I want to opt out of training but stay visible in AI answers, allow the search crawlers and use a Content-Signal line (ai-train=no) instead of blocking everything. Ask me which policy I want before changing it.`,
    verify: ({ url }) => `curl -s ${new URL('/robots.txt', url).toString()}`,
  },
  not_publicly_accessible: {
    title: 'Make the page public',
    gain: 34,
    task: ({ url }) =>
      `${url} answers 401/403 to anonymous requests, so AI crawlers cannot read it. Make the public marketing and content pages reachable without login (and check that bot protection or a WAF rule is not returning 403 to normal crawlers).`,
    verify: ({ url }) => `curl -sI -A "GPTBot/1.0" ${url} | head -1`,
  },
  crawlability_issues: {
    title: 'Add a sitemap',
    gain: 4,
    task: ({ host }) =>
      `${host} has no sitemap. Generate /sitemap.xml listing all public canonical URLs (keep it updated on publish, use the framework's sitemap support if it has one) and add "Sitemap: https://${host}/sitemap.xml" to robots.txt.`,
    verify: ({ host }) => `curl -sI https://${host}/sitemap.xml | head -1`,
  },
  structured_data_missing: {
    title: 'Add JSON-LD structured data',
    gain: 4,
    task: ({ url }) =>
      `${url} has no JSON-LD. Add a <script type="application/ld+json"> block with the schema.org type that fits the page (Organization and WebSite on the homepage, Article/BlogPosting with datePublished on posts, Product, FAQPage, SoftwareApplication, ...). Use real data from the page; do not invent facts.`,
    verify: ({ url }) => `curl -s ${url} | grep -c 'application/ld+json'`,
  },
  metadata_optimization: {
    title: 'Fix title and meta description',
    gain: 6,
    task: ({ url }) =>
      `Give ${url} a <title> of 30 to 60 characters and a <meta name="description"> of 50 to 160 characters that say what the page offers. Do the same for other key pages via the framework's metadata API.`,
    verify: ({ url }) => `curl -s ${url} | grep -iE '<title|name="description"'`,
  },
  mobile_unfriendly: {
    title: 'Add a viewport meta tag',
    gain: 3,
    task: ({ url }) => `Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the HTML head of ${url} (and the shared layout).`,
    verify: ({ url }) => `curl -s ${url} | grep -i 'name="viewport"'`,
  },
  no_https: {
    title: 'Serve over HTTPS',
    gain: 4,
    task: ({ host }) => `Serve ${host} over HTTPS with a valid certificate and redirect http:// to https:// with a 301.`,
    verify: ({ host }) => `curl -sI http://${host}/ | grep -i location`,
  },
  slow_page_load: {
    title: 'Speed up the page',
    gain: 4,
    task: ({ url }) =>
      `${url} took more than 3 seconds to return its HTML. Find the slow part of the server response (uncached data fetching, cold starts, heavy SSR) and fix it: cache the page at the CDN, pre-render it, or cache the slow data calls. The goal is HTML in under 1 second.`,
    verify: ({ url }) => `curl -so /dev/null -w '%{time_total}\\n' ${url}`,
  },
  no_internal_links: {
    title: 'Add internal links',
    gain: 4,
    task: ({ url }) =>
      `${url} has fewer than 3 internal links in its HTML. Add crawlable <a href> links (not only JavaScript click handlers) to the main sections and key pages, for example in the header, footer and body text.`,
    verify: ({ url }) => `curl -s ${url} | grep -o '<a [^>]*href="/[^"]*"' | wc -l`,
  },
  no_language_tag: {
    title: 'Set the page language',
    gain: 1,
    task: ({ url }) => `Add a lang attribute to the <html> element of ${url} (for example <html lang="en">), matching the page language.`,
    verify: ({ url }) => `curl -s ${url} | grep -io '<html[^>]*>'`,
  },
  access_or_speed_issues: {
    title: 'Fix redirects or timeouts',
    gain: 19,
    task: ({ url }) =>
      `${url} needs more than 5 redirects or more than 10 seconds to answer. Collapse the redirect chain to at most one hop (http to https and apex to www in a single redirect) and fix the slow response.`,
    verify: ({ url }) => `curl -sIL ${url} | grep -iE '^(HTTP|location)'`,
  },
};

export function classicFixes(issues: string[], ctx: { url: string; host: string }): Fix[] {
  const out: Fix[] = [];
  for (const id of issues) {
    const spec = CLASSIC[id];
    if (spec === undefined) continue;
    out.push({
      id,
      kind: 'classic',
      title: spec.title,
      gain: spec.gain,
      prompt: [
        `You are working in the codebase that serves ${ctx.host}.`,
        spec.task(ctx),
        `When done, verify with: ${spec.verify(ctx)}`,
      ].join('\n\n'),
    });
  }
  return out;
}

/** Biggest gain first; agent checks before classic ones on a tie (they are usually quicker). */
export function rankFixes(fixes: Fix[]): Fix[] {
  return [...fixes].sort((a, b) => b.gain - a.gain || (a.kind === b.kind ? 0 : a.kind === 'agent' ? -1 : 1));
}
