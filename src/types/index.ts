// ============================================================
// AIScore Shared Type Contracts
// All workstreams must import from this file — do not redefine.
// ============================================================

// --------------- Scoring ---------------

export interface ScoreDimensions {
  crawlability: number; // 0-30
  content: number;      // 0-35
  technical: number;    // 0-25
  quality: number;      // 0-10
}

export type IssueKey =
  | 'blocked_from_crawlers'
  | 'not_publicly_accessible'
  | 'access_or_speed_issues'
  | 'crawlability_issues'
  | 'structured_data_missing'
  | 'metadata_optimization'
  | 'mobile_unfriendly'
  | 'no_https'
  | 'slow_page_load'
  | 'no_internal_links'
  | 'no_language_tag'
  | 'ai_crawlers_blocked';

export interface ScoringResult {
  score: number;           // 0-100, final score after penalties
  dimensions: ScoreDimensions;
  issues: IssueKey[];
  checkedAt: Date;
  expiresAt: Date;
  summary: string;         // Short paragraph describing what the site is about
}

// --------------- Crawler ---------------

export interface RobotsTxtData {
  exists: boolean;
  blocksAllCrawlers: boolean;   // User-agent: * Disallow: /
  blocksAiCrawlers: boolean;    // GPTBot, ClaudeBot, PerplexityBot explicitly blocked
  sitemapUrls: string[];        // Sitemap: directives found
}

export interface SitemapData {
  exists: boolean;
  urlCount: number;             // number of <loc> entries found (0 if not parseable)
}

export interface FetchResult {
  html: string;
  statusCode: number;
  redirectCount: number;
  responseTimeMs: number;
  finalUrl: string;
  robotsTxt: RobotsTxtData;
  sitemap: SitemapData;
}

// --------------- Cache ---------------

export interface CachedCheck {
  checkId: string;
  score: number;
  dimensions: ScoreDimensions;
  issues: IssueKey[];
  cachedAt: Date;
  expiresAt: Date;
  domain: string;
  summary?: string;
}

// --------------- API ---------------

export interface AnalyzeRequest {
  url: string;
  force_refresh?: boolean;
}

export interface AnalyzeResponse {
  check_id: string;
  score: number;
  dimensions: ScoreDimensions;
  issues: IssueKey[];
  cached: boolean;
  checked_at: string;    // ISO 8601
  expires_at: string;    // ISO 8601
  summary?: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

// --------------- Rate Limiting ---------------

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}
