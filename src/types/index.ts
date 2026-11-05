import type { AgentCheck } from '../services/agentReadiness';
import type { Fix } from '../services/fixes';

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
  /** Response headers of the final (post-redirect) page response, lower-cased keys. */
  headers: Record<string, string>;
}

export interface Dimensions {
  crawlability: number;
  content: number;
  technical: number;
  quality: number;
  agentReadiness: number;
}

export interface ScoreResult {
  checkId: string;
  score: number;
  dimensions: Dimensions;
  /** Maximum points per dimension (sums to 100), so clients do not hard-code them. */
  maxDimensions: Dimensions;
  issues: string[];
  /** Agent readiness checks with evidence and fix prompts. */
  agentChecks: AgentCheck[];
  /** Everything worth fixing, biggest score gain first, each with a copy-paste prompt. */
  fixes: Fix[];
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
