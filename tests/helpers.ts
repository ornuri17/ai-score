import { CacheService } from '../src/services/cache';
import { CrawlResult, ScoreResult } from '../src/types';

export function memoryCache(): CacheService {
  const store = new Map<string, ScoreResult>();
  return {
    get: (key: string) => Promise.resolve(store.get(key) ?? null),
    set: (key: string, value: ScoreResult) => {
      store.set(key, value);
      return Promise.resolve();
    },
  };
}

export const GOOD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Example Company: tools that make teams faster</title>
<meta name="description" content="Example Company's platform helps teams plan, track and ship work faster, with AI built in.">
<meta property="og:title" content="Example Company">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://example.com/">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Example"}</script>
</head>
<body>
<main>
<h1>Plan, track and ship</h1>
<time datetime="2026-01-01">Jan 1</time>
<p>${'Example content that is long enough to count as real visible text for the scorer. '.repeat(8)}</p>
<a href="/a">A</a><a href="/b">B</a><a href="/c">C</a><a href="https://example.com/d">D</a>
</main>
</body>
</html>`;

export function crawl(overrides: Partial<CrawlResult> = {}): CrawlResult {
  return {
    html: GOOD_HTML,
    robotsTxt: 'User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n',
    sitemapXml: '<urlset></urlset>',
    responseTimeMs: 200,
    statusCode: 200,
    finalUrl: 'https://example.com',
    redirectCount: 0,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    ...overrides,
  };
}
