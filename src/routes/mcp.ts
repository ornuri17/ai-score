// ============================================================
// AIScore MCP endpoint
// POST /mcp: a stateless MCP server (Streamable HTTP, JSON responses only)
// with one tool, scan_site, so AI agents can score websites directly.
// ============================================================

import { Router, Request, Response } from 'express';
import { URL } from 'url';
import { CacheService } from '../services/cache';
import { CheckStore } from '../services/checkStore';
import { analyze, normalizeUrl, requestMeta } from '../services/analysis';
import { ScoreResult } from '../types';
import { logger } from '../logger';

const SUPPORTED_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
export const SERVER_INFO = { name: 'gradebyai', title: 'GradeByAI', version: '1.0.0' };

export const SCAN_TOOL = {
  name: 'scan_site',
  title: 'Score a website for AI readiness',
  description:
    'Scores a public web page 0-100 for AI readiness: AI search crawlability, content structure, technical SEO, content quality and agent readiness (llms.txt, Content Signals, Markdown for Agents, MCP/A2A cards, Agent Skills, API catalog, OAuth discovery). Returns the score, the breakdown and a ranked fix list with a prompt per fix.',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Absolute http(s) URL of the page to score, for example https://example.com' },
      force_refresh: { type: 'boolean', description: 'Re-crawl instead of using a cached result (results are cached for 7 days)' },
    },
    required: ['url'],
    additionalProperties: false,
  },
};

interface JsonRpcRequest {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
}

function rpcResult(id: unknown, result: unknown): Record<string, unknown> {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id: unknown, code: number, message: string): Record<string, unknown> {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

export function summarize(result: ScoreResult): string {
  const d = result.dimensions;
  const m = result.maxDimensions;
  const lines = [
    `GradeByAI score for ${result.url}: ${result.score}/100`,
    '',
    `Crawlability ${d.crawlability}/${m.crawlability}, Content structure ${d.content}/${m.content}, Technical SEO ${d.technical}/${m.technical}, Content quality ${d.quality}/${m.quality}, Agent readiness ${d.agentReadiness}/${m.agentReadiness}`,
  ];
  if (result.fixes.length > 0) {
    lines.push('', 'Fix first (biggest gain first):');
    for (const fix of result.fixes.slice(0, 5)) lines.push(`- ${fix.title} (+${fix.gain})`);
    lines.push('', 'Each fix in structuredContent.fixes has a ready prompt for a coding agent.');
  }
  return lines.join('\n');
}

export function createMcpRouter(cacheService: CacheService, store: CheckStore): Router {
  const router = Router();

  // No server-initiated stream: GET is not offered (allowed by the Streamable HTTP transport)
  router.get('/', (_req: Request, res: Response): void => {
    res.set('Allow', 'POST').status(405).json({ error: 'method_not_allowed', hint: 'POST JSON-RPC messages to this endpoint' });
  });

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as JsonRpcRequest | JsonRpcRequest[] | undefined;
    if (Array.isArray(body) || body === undefined || typeof body !== 'object' || body === null) {
      res.status(400).json(rpcError(null, -32600, 'Send one JSON-RPC 2.0 request object'));
      return;
    }
    const { id, method, params } = body;
    if (body.jsonrpc !== '2.0' || typeof method !== 'string') {
      res.status(400).json(rpcError(id, -32600, 'Invalid JSON-RPC 2.0 request'));
      return;
    }

    // Notifications (no id) get 202 with no body
    if (id === undefined) {
      res.status(202).end();
      return;
    }

    const p = (typeof params === 'object' && params !== null ? params : {}) as Record<string, unknown>;

    switch (method) {
      case 'initialize': {
        const requested = typeof p['protocolVersion'] === 'string' ? p['protocolVersion'] : '';
        const protocolVersion = SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0];
        res.json(
          rpcResult(id, {
            protocolVersion,
            capabilities: { tools: { listChanged: false } },
            serverInfo: SERVER_INFO,
            instructions: 'Use scan_site to score a website for AI search and AI agent readiness and get a ranked fix list.',
          }),
        );
        return;
      }
      case 'ping':
        res.json(rpcResult(id, {}));
        return;
      case 'tools/list':
        res.json(rpcResult(id, { tools: [SCAN_TOOL] }));
        return;
      case 'tools/call': {
        const name = p['name'];
        const args = (typeof p['arguments'] === 'object' && p['arguments'] !== null ? p['arguments'] : {}) as Record<string, unknown>;
        if (name !== SCAN_TOOL.name) {
          res.json(rpcError(id, -32602, `Unknown tool: ${String(name)}`));
          return;
        }
        const raw = typeof args['url'] === 'string' ? args['url'].trim() : '';
        let normalized: string;
        try {
          const u = new URL(raw);
          if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('protocol');
          normalized = normalizeUrl(raw);
        } catch {
          res.json(rpcResult(id, { isError: true, content: [{ type: 'text', text: 'url must be an absolute http or https URL' }] }));
          return;
        }
        try {
          const result = await analyze(normalized, {
            cacheService,
            store,
            meta: requestMeta(req, normalized),
            forceRefresh: args['force_refresh'] === true,
          });
          res.json(
            rpcResult(id, {
              content: [{ type: 'text', text: summarize(result) }],
              structuredContent: {
                url: result.url,
                score: result.score,
                dimensions: result.dimensions,
                maxDimensions: result.maxDimensions,
                issues: result.issues,
                fixes: result.fixes,
                agentChecks: result.agentChecks.map((c) => ({ id: c.id, passed: c.passed, points: c.points, maxPoints: c.maxPoints, detail: c.detail })),
                checkedAt: result.checkedAt,
              },
            }),
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error('MCP scan failed', { url: normalized, error: message });
          res.json(rpcResult(id, { isError: true, content: [{ type: 'text', text: `Scan failed: ${message}` }] }));
        }
        return;
      }
      default:
        res.json(rpcError(id, -32601, `Method not found: ${method}`));
    }
  });

  return router;
}
