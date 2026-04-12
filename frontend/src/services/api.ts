import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface AnalyzeResponse {
  check_id: string;
  score: number;
  dimensions: {
    crawlability: number;
    content: number;
    technical: number;
    quality: number;
  };
  issues: string[];
  cached: boolean;
  checked_at: string;
  cached_until: string;
  fallback_until: string;
  summary?: string;
}

export interface LeadSubmission {
  check_id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface LeadResponse {
  success: boolean;
  message: string;
  lead_id: string;
}

export interface HistoryPoint {
  check_id: string;
  score: number;
  dimensions: {
    crawlability: number;
    content: number;
    technical: number;
    quality: number;
  };
  checked_at: string;
}

export interface HistoryResponse {
  domain: string;
  history: HistoryPoint[];
}

export async function analyzeWebsite(
  url: string,
  forceRefresh?: boolean
): Promise<AnalyzeResponse> {
  const response = await axios.post(`${API_BASE}/api/analyze`, {
    url,
    force_refresh: forceRefresh,
  });
  return response.data;
}

export async function submitLead(lead: LeadSubmission): Promise<LeadResponse> {
  const response = await axios.post(`${API_BASE}/api/leads`, lead);
  return response.data;
}

export async function getHistory(domain: string): Promise<HistoryResponse> {
  const response = await axios.get(`${API_BASE}/api/history/${encodeURIComponent(domain)}`);
  return response.data;
}

export interface ScoreResult {
  checkId: string;
  url: string;
  domain: string;
  score: number;
  dimensions: {
    crawlability: number;
    content: number;
    technical: number;
    quality: number;
  };
  issues: string[];
  summary: string;
  checkedAt: string;
}

export interface CompareResult {
  myUrl: ScoreResult;
  competitorUrl: ScoreResult;
  winner: 'my' | 'competitor' | 'tie';
  delta: number;
}

export async function compareWebsites(myUrl: string, competitorUrl: string): Promise<CompareResult> {
  const [myRes, compRes] = await Promise.all([
    analyzeWebsite(myUrl),
    analyzeWebsite(competitorUrl),
  ]);

  const toScoreResult = (r: AnalyzeResponse, url: string): ScoreResult => ({
    checkId: r.check_id,
    url,
    domain: new URL(url).hostname,
    score: r.score,
    dimensions: r.dimensions,
    issues: r.issues,
    summary: r.summary || '',
    checkedAt: r.checked_at,
  });

  const my = toScoreResult(myRes, myUrl);
  const comp = toScoreResult(compRes, competitorUrl);
  const delta = my.score - comp.score;
  const winner: CompareResult['winner'] = delta > 0 ? 'my' : delta < 0 ? 'competitor' : 'tie';

  return { myUrl: my, competitorUrl: comp, winner, delta };
}
