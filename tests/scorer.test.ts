import { scoreUrl, extractMetaContent, decodeEntities } from '../src/services/scorer';
import { crawl, GOOD_HTML } from './helpers';

describe('extractMetaContent', () => {
  it('keeps apostrophes inside double-quoted content (summary truncation bug)', () => {
    const html = '<meta name="description" content="Scan your website to see if it\'s ready for AI agents">';
    expect(extractMetaContent(html, 'description')).toBe("Scan your website to see if it's ready for AI agents");
  });

  it('keeps double quotes inside single-quoted content', () => {
    const html = `<meta content='The "best" tool' property='og:description'>`;
    expect(extractMetaContent(html, 'og:description')).toBe('The "best" tool');
  });

  it('decodes entities', () => {
    const html = '<meta name="description" content="Tom &amp; Jerry&#39;s &quot;house&quot; &#x2014; ok">';
    expect(extractMetaContent(html, 'description')).toBe('Tom & Jerry\'s "house" \u2014 ok');
  });

  it('is case-insensitive on the name and ignores empty content', () => {
    expect(extractMetaContent('<META NAME="Description" CONTENT="Hello">', 'description')).toBe('Hello');
    expect(extractMetaContent('<meta name="description" content="">', 'description')).toBeNull();
  });

  it('decodeEntities leaves unknown entities alone', () => {
    expect(decodeEntities('a &bogus; b')).toBe('a &bogus; b');
  });
});

describe('scoreUrl', () => {
  it('scores a well-formed page highly and returns the full summary', () => {
    // Without agent readiness the classic dimensions top out at 75 of 100
    const result = scoreUrl('https://example.com', crawl());
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.score).toBeLessThanOrEqual(75);
    expect(result.summary).toBe("Example Company's platform helps teams plan, track and ship work faster, with AI built in.");
    expect(result.issues).not.toContain('blocked_from_crawlers');
  });

  it('honors X-Robots-Tag: noindex from the HTTP response header', () => {
    const base = scoreUrl('https://example.com', crawl());
    const result = scoreUrl('https://example.com', crawl({ headers: { 'x-robots-tag': 'noindex' } }));
    expect(result.issues).toContain('blocked_from_crawlers');
    expect(result.dimensions.crawlability).toBeLessThan(base.dimensions.crawlability);
    expect(result.score).toBeLessThanOrEqual(base.score - 33);
  });

  it('honors X-Robots-Tag: nofollow from the header', () => {
    const base = scoreUrl('https://example.com', crawl());
    const result = scoreUrl('https://example.com', crawl({ headers: { 'x-robots-tag': 'nofollow' } }));
    expect(result.dimensions.crawlability).toBe(base.dimensions.crawlability - 4);
  });

  it('no longer reads X-Robots-Tag from page text', () => {
    const html = GOOD_HTML.replace('</main>', '<p>Docs: set X-Robots-Tag: noindex to hide a page.</p></main>');
    const result = scoreUrl('https://example.com', crawl({ html }));
    expect(result.issues).not.toContain('blocked_from_crawlers');
  });

  it('detects AI crawlers blocked through grouped user-agents', () => {
    const robotsTxt = 'User-agent: GPTBot\nUser-agent: CCBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n';
    const result = scoreUrl('https://example.com', crawl({ robotsTxt }));
    expect(result.issues).toContain('ai_crawlers_blocked');
  });

  it('does not flag AI crawlers when a broad Disallow is overridden by Allow for the page', () => {
    const robotsTxt = 'User-agent: GPTBot\nDisallow: /\nAllow: /$\n';
    const result = scoreUrl('https://example.com', crawl({ robotsTxt, finalUrl: 'https://example.com/' }));
    expect(result.issues).not.toContain('ai_crawlers_blocked');
  });
});
