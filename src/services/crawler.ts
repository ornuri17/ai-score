// ============================================================
// AIScore Crawler Service
// Uses axios + cheerio (no headless browser — Phase 1 decision).
// ============================================================

import axios, { AxiosError } from 'axios';
import type { FetchResult, RobotsTxtData, SitemapData } from '../types';
import { config } from '../config';
import { logger } from '../logger';

const USER_AGENT = 'AIScore-Crawler/1.0 (https://aiscore.co/bot)';

// Internal type to access axios internals for redirect counting
interface AxiosRequestWithRedirects {
  res?: {
    responseUrl?: string;
  };
  _redirectable?: {
    _redirectCount?: number;
  };
}

function countRedirects(request: AxiosRequestWithRedirects): number {
  const redirectable = request._redirectable;
  if (redirectable?._redirectCount !== undefined) {
    return redirectable._redirectCount;
  }
  return 0;
}

function extractFinalUrl(request: AxiosRequestWithRedirects, fallbackUrl: string): string {
  return request.res?.responseUrl ?? fallbackUrl;
}

/**
 * Fetch a URL and return structured data for scoring.
 * - Respects timeoutMs and maxRedirects from config.crawler
 * - On timeout: throws Error('TIMEOUT')
 * - On too many redirects: throws Error('TOO_MANY_REDIRECTS')
 * - On non-200 status: returns the result (scorer handles it)
 * - On network error: rethrows with descriptive message
 */
export async function fetchWebsite(url: string): Promise<Omit<FetchResult, 'robotsTxt' | 'sitemap'>> {
  const startTime = Date.now();

  logger.info('Fetching URL', { url });

  try {
    const response = await axios.get<string>(url, {
      timeout: config.crawler.timeoutMs,
      maxRedirects: config.crawler.maxRedirects,
      headers: {
        'User-Agent': USER_AGENT,
      },
      responseType: 'text',
      validateStatus: (): boolean => true, // Don't throw on non-2xx
    });

    const responseTimeMs = Date.now() - startTime;
    const req = response.request as AxiosRequestWithRedirects;
    const redirectCount = countRedirects(req);
    const finalUrl = extractFinalUrl(req, url);

    logger.info('Fetch complete', {
      url,
      statusCode: response.status,
      responseTimeMs,
      redirectCount,
    });

    return {
      html: response.data,
      statusCode: response.status,
      redirectCount,
      responseTimeMs,
      finalUrl,
    };
  } catch (err) {
    const responseTimeMs = Date.now() - startTime;

    if (axios.isAxiosError(err)) {
      const axiosErr = err as AxiosError;

      if (axiosErr.code === 'ECONNABORTED' || axiosErr.message.includes('timeout')) {
        logger.warn('Crawler timeout', { url, responseTimeMs });
        throw new Error('TIMEOUT');
      }

      if (
        axiosErr.message.includes('maxRedirects') ||
        axiosErr.message.toLowerCase().includes('redirect')
      ) {
        logger.warn('Too many redirects', { url });
        throw new Error('TOO_MANY_REDIRECTS');
      }

      const networkMsg = axiosErr.message;
      logger.error('Crawler network error', { url, error: networkMsg });
      throw new Error(`Network error fetching ${url}: ${networkMsg}`);
    }

    const unknownMsg = err instanceof Error ? err.message : String(err);
    logger.error('Crawler unexpected error', { url, error: unknownMsg });
    throw new Error(`Unexpected error fetching ${url}: ${unknownMsg}`);
  }
}

function parseRobotsTxt(text: string): { blocksAllCrawlers: boolean; blocksAiCrawlers: boolean; sitemapUrls: string[] } {
  const AI_BOTS = ['gptbot', 'claudebot', 'perplexitybot', 'anthropic-ai', 'cohere-ai'];
  const sitemapUrls: string[] = [];
  const groups: { agents: string[]; disallows: string[] }[] = [];
  let currentGroup: { agents: string[]; disallows: string[] } | null = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    const lower = line.toLowerCase();

    if (line === '' || line.startsWith('#')) {
      currentGroup = null;
      continue;
    }
    if (lower.startsWith('sitemap:')) {
      const url = line.slice('sitemap:'.length).trim();
      if (url) sitemapUrls.push(url);
      continue;
    }
    if (lower.startsWith('user-agent:')) {
      if (!currentGroup) {
        currentGroup = { agents: [], disallows: [] };
        groups.push(currentGroup);
      }
      currentGroup.agents.push(lower.slice('user-agent:'.length).trim());
      continue;
    }
    if (lower.startsWith('disallow:') && currentGroup) {
      currentGroup.disallows.push(line.slice('disallow:'.length).trim());
    }
  }

  let blocksAllCrawlers = false;
  let blocksAiCrawlers = false;

  for (const group of groups) {
    const blocksRoot = group.disallows.some(d => d === '/');
    if (!blocksRoot) continue;
    if (group.agents.includes('*')) blocksAllCrawlers = true;
    if (group.agents.some(a => AI_BOTS.includes(a))) blocksAiCrawlers = true;
  }

  return { blocksAllCrawlers, blocksAiCrawlers, sitemapUrls };
}

export async function fetchRobotsTxt(baseUrl: string): Promise<RobotsTxtData> {
  const robotsUrl = `${baseUrl.replace(/\/$/, '')}/robots.txt`;
  try {
    const response = await axios.get<string>(robotsUrl, {
      timeout: 5000,
      headers: { 'User-Agent': USER_AGENT },
      responseType: 'text',
      validateStatus: () => true,
    });
    if (response.status !== 200) {
      return { exists: false, blocksAllCrawlers: false, blocksAiCrawlers: false, sitemapUrls: [] };
    }
    const parsed = parseRobotsTxt(response.data);
    return { exists: true, ...parsed };
  } catch {
    return { exists: false, blocksAllCrawlers: false, blocksAiCrawlers: false, sitemapUrls: [] };
  }
}

export async function fetchSitemap(baseUrl: string, sitemapUrl?: string): Promise<SitemapData> {
  const url = sitemapUrl ?? `${baseUrl.replace(/\/$/, '')}/sitemap.xml`;
  try {
    const response = await axios.get<string>(url, {
      timeout: 5000,
      headers: { 'User-Agent': USER_AGENT },
      responseType: 'text',
      validateStatus: () => true,
      maxContentLength: 500_000, // cap at 500KB — enough to count URLs
    });
    if (response.status !== 200) {
      return { exists: false, urlCount: 0 };
    }
    const text: string = typeof response.data === 'string' ? response.data : String(response.data);
    // Count <loc> entries as a proxy for URL count
    const matches = text.match(/<loc>/gi);
    return { exists: true, urlCount: matches ? matches.length : 0 };
  } catch {
    return { exists: false, urlCount: 0 };
  }
}
