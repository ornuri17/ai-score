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
  phone: string;
}

export interface LeadResponse {
  success: boolean;
  message: string;
  lead_id: string;
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
