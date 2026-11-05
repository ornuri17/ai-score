import {
  runAgentReadinessChecks,
  parseLinkHeader,
  validateLlmsTxt,
  findContentSignals,
  AGENT_CHECK_POINTS,
  AGENT_READINESS_MAX,
  Fetcher,
} from '../src/services/agentReadiness';
import { scoreUrl } from '../src/services/scorer';
import { crawl } from './helpers';

type Route = { status?: number; type?: string; body: string; headers?: Record<string, string> };

function fakeFetcher(routes: Record<string, Route | ((headers: Record<string, string>) => Route)>, fallback?: Route): Fetcher {
  return (url, init) => {
    const path = new URL(url).pathname;
    const entry = routes[path];
    const route = typeof entry === 'function' ? entry(init.headers) : entry ?? fallback ?? { status: 404, type: 'text/plain', body: 'not found' };
    return Promise.resolve(
      new Response(route.body, {
        status: route.status ?? 200,
        headers: { 'content-type': route.type ?? 'application/json', ...(route.headers ?? {}) },
      }),
    );
  };
}

const ORIGIN = 'https://agent.example';
const json = (v: unknown): Route => ({ body: JSON.stringify(v) });

const AGENT_NATIVE = fakeFetcher({
  '/llms.txt': { type: 'text/plain', body: '# Agent Example\n> Does things.\n\n## Docs\n- [API](https://agent.example/docs): API docs\n' },
  '/': (h) =>
    h['Accept'] === 'text/markdown'
      ? { type: 'text/markdown; charset=utf-8', body: '# Home' }
      : { type: 'text/html', body: '<html></html>', headers: { link: '</.well-known/api-catalog>; rel="api-catalog", </llms.txt>; rel="describedby"' } },
  '/.well-known/mcp/server-card.json': json({ serverInfo: { name: 'agent-example', version: '1.0.0' } }),
  '/.well-known/agent-card.json': json({ name: 'Agent', version: '1.0.0', supportedInterfaces: [{ url: 'https://agent.example/a2a' }] }),
  '/.well-known/agent-skills/index.json': json({ $schema: 'x', skills: [{ name: 'scan', type: 'skill-md', url: 'https://agent.example/SKILL.md' }] }),
  '/.well-known/api-catalog': { type: 'application/linkset+json', body: JSON.stringify({ linkset: [{ anchor: 'https://agent.example/api' }] }) },
  '/.well-known/oauth-authorization-server': json({ issuer: ORIGIN, authorization_endpoint: `${ORIGIN}/authorize`, token_endpoint: `${ORIGIN}/token` }),
  '/.well-known/oauth-protected-resource': json({ resource: ORIGIN, authorization_servers: [ORIGIN] }),
});

// A classic SPA: every path answers 200 with the same HTML (the old gradebyai.com behavior)
const SPA = fakeFetcher({}, { status: 200, type: 'text/html', body: '<!doctype html><html><body><div id="root"></div></body></html>' });

const ROBOTS_WITH_SIGNALS = 'User-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=no\nAllow: /\n';

describe('agent readiness helpers', () => {
  it('parses Link headers', () => {
    const links = parseLinkHeader('</.well-known/api-catalog>; rel="api-catalog", </index.md>; rel=alternate; type="text/markdown"');
    expect(links).toEqual([
      { href: '/.well-known/api-catalog', rel: ['api-catalog'] },
      { href: '/index.md', rel: ['alternate'], type: 'text/markdown' },
    ]);
    expect(parseLinkHeader(undefined)).toEqual([]);
  });

  it('validates llms.txt', () => {
    expect(validateLlmsTxt('# Site\n> summary\n- [A](https://a)').valid).toBe(true);
    expect(validateLlmsTxt('\uFEFF# Site').valid).toBe(true);
    expect(validateLlmsTxt('Site without heading').valid).toBe(false);
  });

  it('finds Content-Signal lines, ignoring comments', () => {
    expect(findContentSignals(ROBOTS_WITH_SIGNALS)).toEqual(['Content-Signal: search=yes, ai-input=yes, ai-train=no']);
    expect(findContentSignals('# Content-Signal: search=yes\nUser-agent: *')).toEqual([]);
    expect(findContentSignals(null)).toEqual([]);
  });

  it('point table sums to the dimension max', () => {
    expect(Object.values(AGENT_CHECK_POINTS).reduce((a, b) => a + b, 0)).toBe(AGENT_READINESS_MAX);
  });
});

describe('runAgentReadinessChecks', () => {
  it('gives an agent-native site all 25 points and no fix prompts', async () => {
    const result = await runAgentReadinessChecks(ORIGIN, crawl({ robotsTxt: ROBOTS_WITH_SIGNALS, finalUrl: ORIGIN }), AGENT_NATIVE);
    const failed = result.checks.filter((c) => !c.passed).map((c) => `${c.id}: ${c.detail}`);
    expect(failed).toEqual([]);
    expect(result.score).toBe(25);
    expect(result.checks.every((c) => c.fixPrompt === undefined)).toBe(true);
  });

  it('gives an SPA catch-all site 0 points and explains the HTML fallback', async () => {
    const result = await runAgentReadinessChecks(ORIGIN, crawl({ finalUrl: ORIGIN }), SPA);
    expect(result.score).toBe(0);
    const mcp = result.checks.find((c) => c.id === 'mcpServerCard');
    expect(mcp?.detail).toMatch(/returned HTML instead of JSON/);
    expect(mcp?.fixPrompt).toContain('/.well-known/mcp/server-card.json');
    expect(mcp?.evidence[0]?.response?.status).toBe(200);
    expect(mcp?.evidence[0]?.response?.headers['content-type']).toContain('text/html');
    const llms = result.checks.find((c) => c.id === 'llmsTxt');
    expect(llms?.detail).toMatch(/returned HTML/);
  });

  it('records the request headers in the evidence for Markdown negotiation', async () => {
    const result = await runAgentReadinessChecks(ORIGIN, crawl({ finalUrl: ORIGIN }), SPA);
    const md = result.checks.find((c) => c.id === 'markdownNegotiation');
    expect(md?.evidence[0]?.request.headers).toEqual({ Accept: 'text/markdown' });
    expect(md?.passed).toBe(false);
  });

  it('gives partial credit for a linked .md alternate', async () => {
    const fetcher = fakeFetcher({ '/index.md': { type: 'text/markdown', body: '# Home' } }, { status: 200, type: 'text/html', body: '<html></html>' });
    const html = '<html><head><link rel="alternate" type="text/markdown" href="/index.md"></head></html>';
    const result = await runAgentReadinessChecks(ORIGIN, crawl({ finalUrl: ORIGIN, html }), fetcher);
    const md = result.checks.find((c) => c.id === 'markdownNegotiation');
    expect(md?.points).toBe(2);
    expect(md?.fixPrompt).toBeDefined();
  });

  it('survives network errors', async () => {
    const failing: Fetcher = () => Promise.reject(new Error('ECONNREFUSED'));
    const result = await runAgentReadinessChecks(ORIGIN, crawl({ finalUrl: ORIGIN }), failing);
    expect(result.score).toBe(0);
    expect(result.checks.find((c) => c.id === 'apiCatalog')?.evidence[0]?.error).toBe('ECONNREFUSED');
  });
});

describe('scoring with agent readiness', () => {
  it('a perfect classic page plus an agent-native site scores 100', async () => {
    const c = crawl({ robotsTxt: ROBOTS_WITH_SIGNALS, finalUrl: ORIGIN });
    const agent = await runAgentReadinessChecks(ORIGIN, c, AGENT_NATIVE);
    const result = scoreUrl(ORIGIN, c, agent);
    expect(result.maxDimensions).toEqual({ crawlability: 22, content: 26, technical: 19, quality: 8, agentReadiness: 25 });
    expect(result.dimensions.agentReadiness).toBe(25);
    expect(result.score).toBe(
      result.dimensions.crawlability + result.dimensions.content + result.dimensions.technical + result.dimensions.quality + 25,
    );
    expect(result.fixes).toEqual([]);
  });

  it('separates an SEO-perfect page with no agent support from an agent-native one', async () => {
    const c = crawl({ finalUrl: ORIGIN });
    const seoOnly = scoreUrl(ORIGIN, c, await runAgentReadinessChecks(ORIGIN, c, SPA));
    const native = scoreUrl(
      ORIGIN,
      crawl({ robotsTxt: ROBOTS_WITH_SIGNALS, finalUrl: ORIGIN }),
      await runAgentReadinessChecks(ORIGIN, crawl({ robotsTxt: ROBOTS_WITH_SIGNALS, finalUrl: ORIGIN }), AGENT_NATIVE),
    );
    expect(native.score - seoOnly.score).toBe(25);
  });

  it('ranks fixes by gain and includes classic issues', async () => {
    const c = crawl({ finalUrl: ORIGIN, robotsTxt: 'User-agent: GPTBot\nDisallow: /\n' });
    const result = scoreUrl(ORIGIN, c, await runAgentReadinessChecks(ORIGIN, c, SPA));
    expect(result.fixes[0]?.id).toBe('ai_crawlers_blocked');
    expect(result.fixes[0]?.gain).toBe(20);
    const gains = result.fixes.map((f) => f.gain);
    expect([...gains].sort((a, b) => b - a)).toEqual(gains);
    expect(result.fixes.find((f) => f.id === 'llmsTxt')?.prompt).toContain('https://agent.example/llms.txt');
  });
});
