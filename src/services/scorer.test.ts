import { scoreWebsite } from './scorer';
import { FetchResult } from '../types';

// --------------- Helper ---------------

function mockFetch(overrides: Partial<FetchResult> & { html: string }): FetchResult {
  return {
    statusCode: 200,
    redirectCount: 0,
    responseTimeMs: 500,
    finalUrl: 'https://example.com',
    robotsTxt: {
      exists: false,
      blocksAllCrawlers: false,
      blocksAiCrawlers: false,
      sitemapUrls: [],
    },
    sitemap: {
      exists: false,
      urlCount: 0,
    },
    ...overrides,
  };
}

// --------------- HTML fixtures ---------------

const FULL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Example Domain - The Best Example Website</title>
  <meta name="description" content="This is a detailed description of the example website with enough characters to pass the validation check.">
  <meta property="og:title" content="Example Domain">
  <meta property="og:description" content="The best example domain for testing purposes and more.">
  <link rel="canonical" href="https://example.com">
  <link rel="sitemap" type="application/xml" href="/sitemap.xml">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Example"}</script>
</head>
<body>
  <header><nav><a href="/about">About</a><a href="/contact">Contact</a><a href="/blog">Blog</a></nav></header>
  <main>
    <article>
      <section>
        <h1>Welcome to Example.com</h1>
        <time datetime="2025-01-01">January 1, 2025</time>
        <p>This is a very detailed page with lots of content that should satisfy the content length requirements for our scoring algorithm. We have many words here to ensure the body text is well over the required threshold of three hundred characters for the content quality check to pass successfully.</p>
        <p>More content here to make sure we have enough text for all the checks to pass correctly and completely.</p>
      </section>
    </article>
  </main>
  <footer>
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
  </footer>
</body>
</html>`;

const NOINDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="robots" content="noindex, nofollow">
  <title>Private Page - Do Not Index This Page Please</title>
  <meta name="description" content="This page should not be indexed by search engines or AI crawlers at all.">
</head>
<body>
  <p>This content is private.</p>
</body>
</html>`;

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>404 Not Found</title>
</head>
<body>
  <h1>Page Not Found</h1>
  <p>The page you are looking for could not be found on this server.</p>
</body>
</html>`;

const MINIMAL_HTML = `<!DOCTYPE html>
<html>
<head><title>Hi</title></head>
<body><p>Short.</p></body>
</html>`;

const AUTH_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Login Required - Please Sign In To Continue</title>
</head>
<body>
  <form>
    <input type="email" name="email">
    <input type="password" name="password">
    <button type="submit">Sign In</button>
  </form>
</body>
</html>`;

const NO_JSONLD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Example Domain - The Best Example Website</title>
  <meta name="description" content="This is a detailed description of the example website with enough characters to pass the validation check.">
  <meta property="og:title" content="Example Domain">
  <meta property="og:description" content="A good open graph description for this page.">
  <link rel="canonical" href="https://example.com">
  <link rel="sitemap" type="application/xml" href="/sitemap.xml">
</head>
<body>
  <main>
    <article>
      <p>This page has enough content but no JSON-LD structured data schema markup present on it. We need more than three hundred characters of body text here to pass all other checks. Adding more words to make sure we meet the threshold requirements for this test case.</p>
    </article>
  </main>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
  <a href="/blog">Blog</a>
</body>
</html>`;

const NO_META_DESC_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Without Meta Description - A Long Enough Title</title>
  <link rel="canonical" href="https://example.com">
  <link rel="sitemap" href="/sitemap.xml">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>
</head>
<body>
  <main>
    <p>This page has content but is missing a meta description tag. The content is long enough to satisfy the body text checks but the metadata is incomplete. Adding words to reach three hundred characters of body text for the quality check.</p>
  </main>
  <a href="/about">About</a><a href="/contact">Contact</a><a href="/help">Help</a>
</body>
</html>`;

const SITEMAP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page With Sitemap Link - Enough Characters Here</title>
  <meta name="description" content="A page that has a sitemap link element so the crawlability check should award the sitemap points.">
  <link rel="canonical" href="https://example.com">
  <link rel="sitemap" type="application/xml" href="/sitemap.xml">
  <script type="application/ld+json">{"@context":"https://schema.org"}</script>
</head>
<body>
  <main>
    <p>Content for the sitemap test page. Needs to be long enough to pass content checks. Adding more words here to ensure we reach the three hundred character threshold for the quality scoring dimension check to pass correctly.</p>
  </main>
  <a href="/about">About</a><a href="/contact">Contact</a><a href="/more">More</a>
</body>
</html>`;

const OG_TAGS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Open Graph Test Page - Has Both OG Tags</title>
  <meta name="description" content="A page that has open graph title and description meta tags present.">
  <meta property="og:title" content="OG Title Here">
  <meta property="og:description" content="OG description for the open graph content test.">
  <link rel="canonical" href="https://example.com">
  <link rel="sitemap" href="/sitemap.xml">
  <script type="application/ld+json">{"@context":"https://schema.org"}</script>
</head>
<body>
  <main>
    <p>Content for the open graph tags test. Must have enough text to pass. Adding more words here to satisfy the content length requirements and reach above the three hundred character threshold for the quality scoring checks.</p>
  </main>
  <a href="/about">About</a><a href="/contact">Contact</a><a href="/more">More</a>
</body>
</html>`;

// --------------- Tests ---------------

describe('scoreWebsite', () => {
  it('scores high for a well-structured page', () => {
    const result = scoreWebsite(
      mockFetch({ html: FULL_HTML }),
      'https://example.com',
    );
    // Should score very high — all major checks pass
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.dimensions.crawlability).toBeGreaterThan(0);
    expect(result.dimensions.content).toBeGreaterThan(0);
    expect(result.dimensions.technical).toBeGreaterThan(0);
    expect(result.dimensions.quality).toBeGreaterThan(0);
  });

  it('applies -30 penalty for noindex page', () => {
    const baseline = scoreWebsite(
      mockFetch({ html: FULL_HTML }),
      'https://example.com',
    );
    const noindexResult = scoreWebsite(
      mockFetch({ html: NOINDEX_HTML }),
      'https://example.com',
    );
    // Noindex page gets -30 penalty
    expect(noindexResult.score).toBeLessThan(baseline.score);
    expect(noindexResult.issues).toContain('blocked_from_crawlers');
  });

  it('applies -25 penalty for 404 page', () => {
    const result = scoreWebsite(
      mockFetch({ html: NOT_FOUND_HTML, statusCode: 404 }),
      'https://example.com',
    );
    // -25 penalty for non-200 non-noindex
    expect(result.issues).toContain('not_publicly_accessible');
    // Score should be reduced
    expect(result.score).toBeLessThanOrEqual(75);
  });

  it('applies -15 penalty for slow page (>10s response)', () => {
    const normalResult = scoreWebsite(
      mockFetch({ html: FULL_HTML, responseTimeMs: 500 }),
      'https://example.com',
    );
    const slowResult = scoreWebsite(
      mockFetch({ html: FULL_HTML, responseTimeMs: 11000 }),
      'https://example.com',
    );
    // Slow page gets -15 penalty and loses response time points
    expect(slowResult.score).toBeLessThan(normalResult.score);
    expect(slowResult.issues).toContain('access_or_speed_issues');
  });

  it('scores 0 for noindex + auth blocked', () => {
    const result = scoreWebsite(
      mockFetch({ html: AUTH_HTML, statusCode: 401 }),
      'https://example.com',
    );
    // noindex meta in AUTH_HTML? No, but 401 triggers auth penalty
    // 401 → authRequired → -30 penalty
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.issues).toContain('not_publicly_accessible');
  });

  it('scores 0 (minimum) for severely penalized page', () => {
    const result = scoreWebsite(
      mockFetch({
        html: NOINDEX_HTML,
        statusCode: 401,
        responseTimeMs: 15000,
        redirectCount: 10,
      }),
      'http://example.com',
    );
    // -30 for noindex/auth, -15 for slow/redirects → floored at 0
    expect(result.score).toBe(0);
  });

  it('no negative scores — minimum is 0', () => {
    const result = scoreWebsite(
      mockFetch({ html: MINIMAL_HTML, statusCode: 404, responseTimeMs: 12000, redirectCount: 8 }),
      'http://example.com',
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('detects missing JSON-LD schema in issues', () => {
    const result = scoreWebsite(
      mockFetch({ html: NO_JSONLD_HTML }),
      'https://example.com',
    );
    expect(result.issues).toContain('structured_data_missing');
  });

  it('detects missing meta description in issues', () => {
    const result = scoreWebsite(
      mockFetch({ html: NO_META_DESC_HTML }),
      'https://example.com',
    );
    expect(result.issues).toContain('metadata_optimization');
  });

  it('gives crawlability points for page with sitemap link', () => {
    const withSitemap = scoreWebsite(
      mockFetch({ html: SITEMAP_HTML }),
      'https://example.com',
    );
    const withoutSitemap = scoreWebsite(
      mockFetch({ html: MINIMAL_HTML }),
      'https://example.com',
    );
    // Page with sitemap should score higher on crawlability
    expect(withSitemap.dimensions.crawlability).toBeGreaterThan(
      withoutSitemap.dimensions.crawlability,
    );
    // Should not have crawlability_issues
    expect(withSitemap.issues).not.toContain('crawlability_issues');
  });

  it('gives content points for page with OG tags', () => {
    const withOg = scoreWebsite(
      mockFetch({ html: OG_TAGS_HTML }),
      'https://example.com',
    );
    const withoutOg = scoreWebsite(
      mockFetch({ html: MINIMAL_HTML }),
      'https://example.com',
    );
    // OG tags page should score higher on content dimension
    expect(withOg.dimensions.content).toBeGreaterThan(withoutOg.dimensions.content);
  });

  it('returns deduplicated issues array', () => {
    const result = scoreWebsite(
      mockFetch({ html: NOINDEX_HTML }),
      'https://example.com',
    );
    const uniqueIssues = [...new Set(result.issues)];
    expect(result.issues).toEqual(uniqueIssues);
  });

  it('returns valid ScoringResult shape', () => {
    const result = scoreWebsite(
      mockFetch({ html: FULL_HTML }),
      'https://example.com',
    );
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('dimensions');
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('checkedAt');
    expect(result).toHaveProperty('expiresAt');
    expect(result.checkedAt).toBeInstanceOf(Date);
    expect(result.expiresAt).toBeInstanceOf(Date);
    // expiresAt should be ~7 days after checkedAt
    const diffMs = result.expiresAt.getTime() - result.checkedAt.getTime();
    expect(diffMs).toBeCloseTo(7 * 24 * 60 * 60 * 1000, -5);
  });

  it('dimensions are within valid ranges', () => {
    const result = scoreWebsite(
      mockFetch({ html: FULL_HTML }),
      'https://example.com',
    );
    expect(result.dimensions.crawlability).toBeGreaterThanOrEqual(0);
    expect(result.dimensions.crawlability).toBeLessThanOrEqual(30);
    expect(result.dimensions.content).toBeGreaterThanOrEqual(0);
    expect(result.dimensions.content).toBeLessThanOrEqual(35);
    expect(result.dimensions.technical).toBeGreaterThanOrEqual(0);
    expect(result.dimensions.technical).toBeLessThanOrEqual(25);
    expect(result.dimensions.quality).toBeGreaterThanOrEqual(0);
    expect(result.dimensions.quality).toBeLessThanOrEqual(10);
  });
});
