// ============================================================
// AIScore Crawler Service
// Fetches a URL and collects HTML, robots.txt, and sitemap.xml.
// ============================================================

import https from 'https';
import http from 'http';
import { URL } from 'url';
import { CrawlResult } from '../types';
import { logger } from '../logger';

const MAX_REDIRECTS = 5;
const SIDECAR_TIMEOUT_MS = 5000;
const MAX_SITEMAP_BYTES = 500 * 1024; // 500 KB

interface PageFetchResult {
  body: string;
  statusCode: number;
  finalUrl: string;
  redirectCount: number;
  responseTimeMs: number;
  headers: Record<string, string>;
}

/**
 * Flattens Node's IncomingHttpHeaders into a plain lower-cased map.
 * Repeated headers (for example several Link or X-Robots-Tag lines) are joined with ", ",
 * which is how RFC 9110 says a recipient may combine them.
 */
export function flattenHeaders(raw: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    out[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
  }
  return out;
}

function fetchWithRedirects(
  rawUrl: string,
  timeoutMs: number,
  maxRedirects: number,
  redirectCount = 0
): Promise<PageFetchResult> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      reject(new Error(`Invalid URL: ${rawUrl}`));
      return;
    }

    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const timer = setTimeout(() => {
      req.destroy(new Error('Request timed out'));
    }, timeoutMs);

    const req = lib.get(rawUrl, { headers: { 'User-Agent': 'AIScoreBot/1.0' } }, (res) => {
      clearTimeout(timer);
      const statusCode = res.statusCode ?? 0;

      // Follow redirects
      if ((statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307 || statusCode === 308) && res.headers.location != null && res.headers.location !== '') {
        if (redirectCount >= maxRedirects) {
          resolve({
            body: '',
            statusCode,
            finalUrl: rawUrl,
            redirectCount,
            responseTimeMs: Date.now() - startTime,
            headers: flattenHeaders(res.headers),
          });
          res.resume();
          return;
        }
        const nextUrl = new URL(res.headers.location, rawUrl).toString();
        res.resume();
        fetchWithRedirects(nextUrl, timeoutMs, maxRedirects, redirectCount + 1)
          .then(resolve)
          .catch(reject);
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          body: Buffer.concat(chunks).toString('utf8'),
          statusCode,
          finalUrl: rawUrl,
          redirectCount,
          responseTimeMs: Date.now() - startTime,
          headers: flattenHeaders(res.headers),
        });
      });
      res.on('error', reject);
    });

    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function fetchSidecar(url: string, maxBytes?: number): Promise<string | null> {
  return new Promise((resolve) => {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      resolve(null);
      return;
    }

    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const timer = setTimeout(() => {
      req.destroy();
      resolve(null);
    }, SIDECAR_TIMEOUT_MS);

    const req = lib.get(url, { headers: { 'User-Agent': 'AIScoreBot/1.0' } }, (res) => {
      if ((res.statusCode ?? 0) < 200 || (res.statusCode ?? 0) >= 300) {
        clearTimeout(timer);
        res.resume();
        resolve(null);
        return;
      }
      const chunks: Buffer[] = [];
      let totalBytes = 0;

      res.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (maxBytes !== undefined && totalBytes > maxBytes) {
          req.destroy();
          clearTimeout(timer);
          resolve(Buffer.concat(chunks).toString('utf8'));
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks).toString('utf8'));
      });

      res.on('error', () => {
        clearTimeout(timer);
        resolve(null);
      });
    });

    req.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
  });
}

export async function crawlUrl(url: string, timeoutMs: number): Promise<CrawlResult> {
  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  logger.debug('Crawling URL', { url, timeoutMs });

  const [pageResult, robotsTxt, sitemapXml] = await Promise.all([
    fetchWithRedirects(url, timeoutMs, MAX_REDIRECTS).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('Page fetch failed', { url, error: message });
      const failed: PageFetchResult = {
        body: '',
        statusCode: 0,
        finalUrl: url,
        redirectCount: 0,
        responseTimeMs: timeoutMs,
        headers: {},
      };
      return failed;
    }),
    fetchSidecar(`${origin}/robots.txt`),
    fetchSidecar(`${origin}/sitemap.xml`, MAX_SITEMAP_BYTES),
  ]);

  logger.debug('Crawl complete', { url, statusCode: pageResult.statusCode, responseTimeMs: pageResult.responseTimeMs });

  return {
    html: pageResult.body,
    robotsTxt,
    sitemapXml,
    responseTimeMs: pageResult.responseTimeMs,
    statusCode: pageResult.statusCode,
    finalUrl: pageResult.finalUrl,
    redirectCount: pageResult.redirectCount,
    headers: pageResult.headers,
  };
}
