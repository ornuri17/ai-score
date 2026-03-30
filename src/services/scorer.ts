// ============================================================
// AIScore Scoring Engine
// Binary scoring: each check is full points or zero.
// ============================================================

import * as cheerio from 'cheerio';
import { ScoringResult, FetchResult, IssueKey } from '../types';
import { logger } from '../logger';

// --------------- Scoring constants ---------------

const CRAWLABILITY_MAX = 30;
const CONTENT_MAX = 35;
const TECHNICAL_MAX = 25;
const QUALITY_MAX = 10;

// --------------- Helper: get body text ---------------

function getBodyText($: cheerio.CheerioAPI): string {
  // Remove scripts and styles before extracting text
  $('script, style, noscript').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

// --------------- Helper: extract site summary ---------------

function extractSummary($: cheerio.CheerioAPI, bodyText: string): string {
  // Priority 1: meta description (most reliable, written for humans)
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() ?? '';
  if (metaDesc.length >= 40) return metaDesc;

  // Priority 2: OG description
  const ogDesc = $('meta[property="og:description"]').attr('content')?.trim() ?? '';
  if (ogDesc.length >= 40) return ogDesc;

  // Priority 3: first meaningful <p> on the page
  let firstPara = '';
  $('p').each((_i, el) => {
    if (firstPara) return;
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length >= 80) {
      firstPara = text.length > 300 ? text.slice(0, 297) + '...' : text;
    }
  });
  if (firstPara) return firstPara;

  // Priority 4: first 250 chars of body text
  if (bodyText.length >= 40) {
    return bodyText.length > 250 ? bodyText.slice(0, 247) + '...' : bodyText;
  }

  return '';
}

// --------------- Crawlability checks (max 30 pts) ---------------

interface CrawlabilityResult {
  score: number;
  issues: IssueKey[];
}

function scoreCrawlability(
  fetchResult: FetchResult,
  $: cheerio.CheerioAPI,
): CrawlabilityResult {
  let score = 0;
  const issues: IssueKey[] = [];

  // +5: no X-Robots-Tag noindex (heuristic via meta robots)
  const metaRobotsContent = $('meta[name="robots"]').attr('content') ?? '';
  const hasNoindex = metaRobotsContent.toLowerCase().includes('noindex');
  const hasNofollow = metaRobotsContent.toLowerCase().includes('nofollow');

  if (!hasNoindex) {
    score += 5;
  } else {
    issues.push('blocked_from_crawlers');
  }

  // +5: no noindex meta
  if (!hasNoindex) {
    score += 5;
  }
  // (already captured above — same condition, counts separately toward 30 max)
  // Re-read spec: two separate checks both worth +5 for noindex and nofollow
  // Deduct the duplicate: keep first 5 for robots allow, second 5 for no-noindex
  // Re-implementing correctly: 6 binary checks = 5+5+5+5+5+5 = 30

  // Let's redo cleanly:
  score = 0;

  // Check 1: +5 robots allows (no noindex meta / no X-Robots-Tag noindex)
  if (!hasNoindex) {
    score += 5;
  } else {
    if (!issues.includes('blocked_from_crawlers')) {
      issues.push('blocked_from_crawlers');
    }
  }

  // Check 2: +5 no noindex
  if (!hasNoindex) {
    score += 5;
  }

  // Check 3: +5 no nofollow
  if (!hasNofollow) {
    score += 5;
  }

  // Check 4: +5 no auth required
  const { statusCode } = fetchResult;
  const hasLoginForm = $('input[type="password"]').length > 0;
  const authRequired = statusCode === 401 || statusCode === 403 || hasLoginForm;
  if (!authRequired) {
    score += 5;
  } else {
    issues.push('not_publicly_accessible');
  }

  // Check 5: +5 response time < 10000ms AND redirectCount <= 5
  const { responseTimeMs, redirectCount } = fetchResult;
  if (responseTimeMs < 10000 && redirectCount <= 5) {
    score += 5;
  } else {
    issues.push('access_or_speed_issues');
  }

  // Check 6: +5 sitemap accessible (robots.txt declares one OR /sitemap.xml exists)
  const hasSitemap =
    fetchResult.sitemap.exists ||
    fetchResult.robotsTxt.sitemapUrls.length > 0 ||
    $('link[rel="sitemap"]').length > 0;
  if (hasSitemap) {
    score += 5;
  } else {
    issues.push('crawlability_issues');
  }

  return { score, issues };
}

// --------------- Content structure checks (max 35 pts) ---------------

interface ContentResult {
  score: number;
  issues: IssueKey[];
}

function scoreContent(
  fetchResult: FetchResult,
  $: cheerio.CheerioAPI,
): ContentResult {
  let score = 0;
  const issues: IssueKey[] = [];

  // +4: semantic HTML
  const hasSemanticHtml =
    $('main').length > 0 ||
    $('article').length > 0 ||
    $('section').length > 0 ||
    $('header').length > 0 ||
    $('nav').length > 0;

  if (hasSemanticHtml) {
    score += 4;
  }

  // +4: meta description 50-160 chars
  const metaDesc = $('meta[name="description"]').attr('content') ?? '';
  if (metaDesc.length >= 50 && metaDesc.length <= 160) {
    score += 4;
  } else {
    issues.push('metadata_optimization');
  }

  // +4: title 30-60 chars
  const titleText = $('title').text().trim();
  if (titleText.length >= 30 && titleText.length <= 60) {
    score += 4;
  } else {
    if (!issues.includes('metadata_optimization')) {
      issues.push('metadata_optimization');
    }
  }

  // +4: Open Graph tags
  const hasOgTitle = $('meta[property="og:title"]').length > 0;
  const hasOgDesc = $('meta[property="og:description"]').length > 0;
  if (hasOgTitle && hasOgDesc) {
    score += 4;
  } else {
    if (!issues.includes('metadata_optimization')) {
      issues.push('metadata_optimization');
    }
  }

  // +5: JSON-LD schema
  const hasJsonLd = $('script[type="application/ld+json"]').length > 0;
  if (hasJsonLd) {
    score += 5;
  } else {
    issues.push('structured_data_missing');
  }

  // +4: publication/modified date
  const hasPublishedTime = $('meta[property="article:published_time"]').length > 0;
  const hasTimeElement = $('time').length > 0;
  const hasDateMeta = $('meta[name="date"]').length > 0;
  if (hasPublishedTime || hasTimeElement || hasDateMeta) {
    score += 4;
  }

  // +4: viewport meta (mobile friendly)
  const hasViewport = $('meta[name="viewport"]').length > 0;
  if (hasViewport) {
    score += 4;
  } else {
    issues.push('mobile_unfriendly');
  }

  // +2: html lang attribute
  const htmlLang = $('html').attr('lang') ?? '';
  if (htmlLang.length > 0) {
    score += 2;
  } else {
    issues.push('no_language_tag');
  }

  // Suppress unused variable warning
  void fetchResult;

  return { score, issues };
}

// --------------- Technical SEO checks (max 25 pts) ---------------

interface TechnicalResult {
  score: number;
  issues: IssueKey[];
}

function scoreTechnical(
  fetchResult: FetchResult,
  originalUrl: string,
  $: cheerio.CheerioAPI,
  bodyText: string,
): TechnicalResult {
  let score = 0;
  const issues: IssueKey[] = [];

  // +5: canonical tag
  const hasCanonical = $('link[rel="canonical"]').length > 0;
  if (hasCanonical) {
    score += 5;
  }

  // +5: HTTPS
  const usesHttps = originalUrl.toLowerCase().startsWith('https://');
  if (usesHttps) {
    score += 5;
  } else {
    issues.push('no_https');
  }

  // +5: clean URL (fewer than 3 query params)
  let queryParamCount = 0;
  try {
    const parsed = new URL(originalUrl);
    queryParamCount = parsed.searchParams.size;
  } catch {
    queryParamCount = 0;
  }
  if (queryParamCount < 3) {
    score += 5;
  }

  // +5: response time < 3000ms
  if (fetchResult.responseTimeMs < 3000) {
    score += 5;
  } else {
    issues.push('slow_page_load');
  }

  // +5: body text > 200 chars (content accessible without JS)
  if (bodyText.length > 200) {
    score += 5;
  }

  return { score, issues };
}

// --------------- Content quality checks (max 10 pts) ---------------

interface QualityResult {
  score: number;
  issues: IssueKey[];
}

function scoreQuality(
  originalUrl: string,
  $: cheerio.CheerioAPI,
  bodyText: string,
): QualityResult {
  let score = 0;
  const issues: IssueKey[] = [];

  // +5: main content > 300 chars
  if (bodyText.length > 300) {
    score += 5;
  }

  // +5: internal links > 2
  let internalLinkCount = 0;
  let domain = '';
  try {
    domain = new URL(originalUrl).hostname.toLowerCase();
  } catch {
    domain = '';
  }

  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    if (href.startsWith('/') || (domain.length > 0 && href.toLowerCase().includes(domain))) {
      internalLinkCount++;
    }
  });

  if (internalLinkCount > 2) {
    score += 5;
  } else {
    issues.push('no_internal_links');
  }

  return { score, issues };
}

// --------------- Penalties ---------------

interface PenaltyResult {
  penalty: number;
  issues: IssueKey[];
}

function computePenalties(
  fetchResult: FetchResult,
  $: cheerio.CheerioAPI,
): PenaltyResult {
  let penalty = 0;
  const issues: IssueKey[] = [];

  const metaRobotsContent = $('meta[name="robots"]').attr('content') ?? '';
  const hasNoindex = metaRobotsContent.toLowerCase().includes('noindex');
  const hasLoginForm = $('input[type="password"]').length > 0;
  const authRequired =
    fetchResult.statusCode === 401 ||
    fetchResult.statusCode === 403 ||
    hasLoginForm;

  // -30 if noindex OR auth required
  if (hasNoindex || authRequired) {
    penalty += 30;
    if (hasNoindex) {
      issues.push('blocked_from_crawlers');
    }
    if (authRequired) {
      issues.push('not_publicly_accessible');
    }
  }
  // -25 if non-200 and not covered by noindex/auth
  else if (fetchResult.statusCode !== 200) {
    penalty += 25;
    issues.push('not_publicly_accessible');
  }

  // -15 if too many redirects OR too slow
  if (fetchResult.redirectCount > 5 || fetchResult.responseTimeMs > 10000) {
    penalty += 15;
    issues.push('access_or_speed_issues');
  }

  // -20 if AI crawlers are explicitly blocked in robots.txt
  // (separate from generic noindex — this is specific to LLM crawlers)
  if (fetchResult.robotsTxt.blocksAiCrawlers) {
    penalty += 20;
    issues.push('ai_crawlers_blocked');
  } else if (fetchResult.robotsTxt.blocksAllCrawlers) {
    // blocking all user-agents also blocks AI crawlers
    if (!issues.includes('ai_crawlers_blocked')) {
      penalty += 20;
      issues.push('ai_crawlers_blocked');
    }
  }

  return { penalty, issues };
}

// --------------- Main scoring function ---------------

export function scoreWebsite(
  fetchResult: FetchResult,
  originalUrl: string,
): ScoringResult {
  logger.info('Scoring website', { url: originalUrl, statusCode: fetchResult.statusCode });

  const $ = cheerio.load(fetchResult.html);
  const bodyText = getBodyText($);

  // Reload after body text extraction (getBodyText mutates the DOM)
  const $fresh = cheerio.load(fetchResult.html);

  const crawlResult = scoreCrawlability(fetchResult, $fresh);
  const contentResult = scoreContent(fetchResult, $fresh);
  const technicalResult = scoreTechnical(fetchResult, originalUrl, $fresh, bodyText);
  const qualityResult = scoreQuality(originalUrl, $fresh, bodyText);

  const baseScore =
    crawlResult.score +
    contentResult.score +
    technicalResult.score +
    qualityResult.score;

  const penaltyResult = computePenalties(fetchResult, $fresh);

  const finalScore = Math.min(
    100,
    Math.max(0, baseScore - penaltyResult.penalty),
  );

  // Deduplicate issues from all sources
  const allIssues: IssueKey[] = [
    ...crawlResult.issues,
    ...contentResult.issues,
    ...technicalResult.issues,
    ...qualityResult.issues,
    ...penaltyResult.issues,
  ];
  const issues: IssueKey[] = [...new Set(allIssues)];

  const result: ScoringResult = {
    score: finalScore,
    dimensions: {
      crawlability: Math.min(CRAWLABILITY_MAX, crawlResult.score),
      content: Math.min(CONTENT_MAX, contentResult.score),
      technical: Math.min(TECHNICAL_MAX, technicalResult.score),
      quality: Math.min(QUALITY_MAX, qualityResult.score),
    },
    issues,
    checkedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    summary: extractSummary($fresh, bodyText),
  };

  logger.info('Scoring complete', {
    url: originalUrl,
    score: finalScore,
    dimensions: result.dimensions,
    issueCount: issues.length,
  });

  return result;
}
