// ============================================================
// AIScore Types
// Shared TypeScript interfaces used across the application.
// ============================================================

export interface CrawlResult {
  html: string;
  robotsTxt: string | null;
  sitemapXml: string | null;
  responseTimeMs: number;
  statusCode: number;
  finalUrl: string;
  redirectCount: number;
}

export interface ScoreResult {
  checkId: string;
  score: number;
  dimensions: {
    crawlability: number;
    content: number;
    technical: number;
    quality: number;
  };
  issues: string[];
  summary: string;
  cached: boolean;
  checkedAt: string;
  expiresAt: string;
  url: string;
  domain: string;
}

export interface CompareResult {
  myUrl: ScoreResult;
  competitorUrl: ScoreResult;
  winner: 'my' | 'competitor' | 'tie';
  delta: number;
}

export interface LeadRequest {
  checkId: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
}
