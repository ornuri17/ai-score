// ============================================================
// AIScore Crawler Service
// Uses axios + cheerio (no headless browser — Phase 1 decision).
// ============================================================

import axios, { AxiosError } from 'axios';
import { FetchResult } from '../types';
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
export async function fetchWebsite(url: string): Promise<FetchResult> {
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
