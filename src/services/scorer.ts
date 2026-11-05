// ============================================================
// AIScore Scorer Service
// Computes an AI-readiness score from a CrawlResult.
// ============================================================

import crypto from 'crypto';
import { URL } from 'url';
import { CrawlResult, ScoreResult } from '../types';
import { logger } from '../logger';
import { isBotBlocked, parseXRobotsTag, SCORED_AI_BOTS } from './robots';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripTags(html: string): string {
  // Remove script/style blocks first, then strip remaining tags
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
};

/** Decodes the HTML entities that commonly appear inside attribute values. */
export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ent: string) => {
    if (ent[0] === '#') {
      const code = ent[1]?.toLowerCase() === 'x' ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[ent.toLowerCase()] ?? whole;
  });
}

/** Parses the attributes of one start tag. Values may be "double", 'single' or unquoted. */
function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  // Skip the tag name itself
  const body = tag.replace(/^<\s*[a-z0-9-]+/i, '').replace(/\/?>$/, '');
  for (const m of body.matchAll(attrPattern)) {
    const key = (m[1] ?? '').toLowerCase();
    if (key === '') continue;
    const value = m[2] ?? m[3] ?? m[4] ?? '';
    if (!(key in attrs)) attrs[key] = decodeEntities(value);
  }
  return attrs;
}

/**
 * Returns the content of <meta name="..."> or <meta property="..."> (case-insensitive).
 * Respects the quote style of each attribute, so an apostrophe inside a
 * double-quoted content value no longer truncates it.
 */
export function extractMetaContent(html: string, name: string): string | null {
  const wanted = name.toLowerCase();
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = parseAttributes(m[0]);
    const key = (attrs['name'] ?? attrs['property'] ?? '').toLowerCase();
    if (key === wanted && attrs['content'] !== undefined && attrs['content'].trim() !== '') {
      return attrs['content'];
    }
  }
  return null;
}

function extractSummary(html: string): string {
  // 1. meta description
  const metaDesc = extractMetaContent(html, 'description');
  if (metaDesc != null && metaDesc.trim().length > 0) return metaDesc.trim();

  // 2. og:description
  const ogDesc = extractMetaContent(html, 'og:description');
  if (ogDesc != null && ogDesc.trim().length > 0) return ogDesc.trim();

  // 3. First <p> with >= 80 chars
  const pMatches = html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  for (const m of pMatches) {
    const text = decodeEntities(stripTags(m[1] ?? '')).trim();
    if (text.length >= 80) return text;
  }

  // 4. First 250 chars of visible body text
  const visible = decodeEntities(stripTags(html));
  return visible.slice(0, 250).trim();
}

function countInternalLinks(html: string, domain: string): number {
  const hrefPattern = /href=["']([^"']+)["']/gi;
  let count = 0;
  for (const match of html.matchAll(hrefPattern)) {
    const href = match[1] ?? '';
    if (href.startsWith('/') || href.includes(domain)) {
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Main scorer
// ---------------------------------------------------------------------------

export function scoreUrl(url: string, crawlResult: CrawlResult): ScoreResult {
  const { html, robotsTxt, sitemapXml, responseTimeMs, statusCode, finalUrl, redirectCount } = crawlResult;
  const headers = crawlResult.headers ?? {};
  const issues: string[] = [];

  const lowerHtml = html.toLowerCase();

  // ---- Parse useful fragments ----
  // Meta robots: the generic tag plus the AI-crawler-specific ones (<meta name="GPTBot" ...>)
  const metaRobotsContent = [
    extractMetaContent(html, 'robots'),
    ...SCORED_AI_BOTS.map((bot) => extractMetaContent(html, bot)),
  ]
    .filter((v): v is string => v !== null)
    .join(', ');
  const hasNoindex = /\b(noindex|none)\b/i.test(metaRobotsContent);
  const hasNofollow = /\b(nofollow|none)\b/i.test(metaRobotsContent);

  // X-Robots-Tag is an HTTP response header, not page content
  const xRobots = parseXRobotsTag(headers['x-robots-tag']);
  const xRobotsNoindex = xRobots.noindex;
  const xRobotsNofollow = xRobots.nofollow;

  const isAuth = statusCode === 401 || statusCode === 403;
  const is200 = statusCode === 200;

  // Sitemap detection
  const sitemapInRobots = robotsTxt != null && robotsTxt !== '' ? /sitemap:/i.test(robotsTxt) : false;
  const sitemapLinkInHtml = /<link[^>]+rel=["']sitemap["']/i.test(html);
  const hasSitemap = sitemapXml !== null || sitemapInRobots || sitemapLinkInHtml;

  // Semantic HTML
  const hasSemanticTags = /<(article|main|section|h1|h2)[\s>]/i.test(html);

  // Meta description
  const metaDesc = extractMetaContent(html, 'description') ?? '';
  const metaDescLen = metaDesc.trim().length;
  const hasGoodMetaDesc = metaDescLen >= 50 && metaDescLen <= 160;

  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const titleText = titleMatch ? (titleMatch[1] ?? '').trim() : '';
  const titleLen = titleText.length;
  const hasGoodTitle = titleLen >= 30 && titleLen <= 60;

  // Open Graph
  const hasOG = extractMetaContent(html, 'og:title') !== null || extractMetaContent(html, 'og:description') !== null;

  // JSON-LD
  const hasJsonLd = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);

  // Publication date
  const hasPubDate =
    /<time[^>]+datetime=/i.test(html) ||
    extractMetaContent(html, 'article:published_time') !== null;

  // Viewport
  const hasViewport = extractMetaContent(lowerHtml, 'viewport') !== null;

  // HTML lang
  const hasLangAttr = /<html[^>]+lang=/i.test(html);

  // Canonical
  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);

  // HTTPS
  const isHttps = finalUrl.startsWith('https://');

  // Clean URL (no query params or fragments)
  let isCleanUrl = false;
  try {
    const parsedFinal = new URL(finalUrl);
    isCleanUrl = parsedFinal.search === '' && parsedFinal.hash === '';
  } catch {
    isCleanUrl = false;
  }

  // Response time
  const isFast = responseTimeMs < 3000;

  // Visible body text
  const visibleText = stripTags(html);
  const visibleLen = visibleText.length;
  const hasEnoughText200 = visibleLen > 200;
  const hasEnoughText300 = visibleLen > 300;

  // Internal links
  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = url;
  }
  const internalLinkCount = countInternalLinks(html, domain);
  const hasInternalLinks = internalLinkCount > 2;

  // AI crawler blocks
  const pageUrlForRobots = finalUrl || url;
  const aiCrawlerBlocked =
    robotsTxt !== null && SCORED_AI_BOTS.some((bot) => isBotBlocked(robotsTxt, pageUrlForRobots, bot));

  // ---- Crawlability (30 pts) ----
  let crawlability = 0;
  if (!hasNoindex) crawlability += 5;
  if (!xRobotsNoindex) crawlability += 5;
  if (!hasNofollow && !xRobotsNofollow) crawlability += 5;
  if (is200) crawlability += 5;
  if (redirectCount <= 5 && responseTimeMs < 10000) crawlability += 5;
  if (hasSitemap) crawlability += 5;

  // ---- Content Structure (35 pts) ----
  let content = 0;
  if (hasSemanticTags) content += 4;
  if (hasGoodMetaDesc) content += 4;
  if (hasGoodTitle) content += 4;
  if (hasOG) content += 4;
  if (hasJsonLd) content += 5;
  if (hasPubDate) content += 4;
  if (hasViewport) content += 4;
  if (hasLangAttr) content += 2;

  // ---- Technical SEO (25 pts) ----
  let technical = 0;
  if (hasCanonical) technical += 5;
  if (isHttps) technical += 5;
  if (isCleanUrl) technical += 5;
  if (isFast) technical += 5;
  if (hasEnoughText200) technical += 5;

  // ---- Content Quality (10 pts) ----
  let quality = 0;
  if (hasEnoughText300) quality += 5;
  if (hasInternalLinks) quality += 5;

  // ---- Raw total ----
  let score = crawlability + content + technical + quality;

  // ---- Penalties ----
  if (hasNoindex || xRobotsNoindex || isAuth) score -= 30;
  if (!is200 && !isAuth) score -= 25;
  if (redirectCount > 5 || responseTimeMs >= 10000) score -= 15;
  if (aiCrawlerBlocked) score -= 20;

  // Floor at 0, ceil at 100
  score = Math.max(0, Math.min(100, score));

  // ---- Issues ----
  if (hasNoindex || xRobotsNoindex) issues.push('blocked_from_crawlers');
  if (aiCrawlerBlocked) issues.push('ai_crawlers_blocked');
  if (isAuth) issues.push('not_publicly_accessible');
  if (!hasSitemap) issues.push('crawlability_issues');
  if (!hasJsonLd) issues.push('structured_data_missing');
  if (!hasGoodMetaDesc || !hasGoodTitle) issues.push('metadata_optimization');
  if (!hasViewport) issues.push('mobile_unfriendly');
  if (!isHttps) issues.push('no_https');
  if (responseTimeMs > 3000) issues.push('slow_page_load');
  if (!hasInternalLinks) issues.push('no_internal_links');
  if (!hasLangAttr) issues.push('no_language_tag');
  if (redirectCount > 5 || responseTimeMs >= 10000) issues.push('access_or_speed_issues');

  // ---- Dates ----
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const result: ScoreResult = {
    checkId: crypto.randomUUID(),
    score,
    dimensions: { crawlability, content, technical, quality },
    issues,
    summary: extractSummary(html),
    cached: false,
    checkedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    url,
    domain,
  };

  logger.debug('Score computed', { url, score, issues });

  return result;
}
