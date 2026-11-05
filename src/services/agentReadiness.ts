// ============================================================
// AIScore agent readiness checks
// Can an AI agent discover, read and connect to this site?
// Follows the checks and specs published by isitagentready.com
// (https://isitagentready.com/llms-full.txt). 25 of the 100 points.
// ============================================================

import { CrawlResult } from '../types';
import { logger } from '../logger';

const PROBE_TIMEOUT_MS = 5000;
const MAX_BODY_BYTES = 256 * 1024;
const PREVIEW_CHARS = 600;
const USER_AGENT = 'AIScoreBot/1.0 (+https://gradebyai.com)';

export type AgentCheckId =
  | 'llmsTxt'
  | 'contentSignals'
  | 'markdownNegotiation'
  | 'linkHeaders'
  | 'mcpServerCard'
  | 'a2aAgentCard'
  | 'agentSkills'
  | 'apiCatalog'
  | 'oauthDiscovery'
  | 'oauthProtectedResource';

/** Points per check. Sums to AGENT_READINESS_MAX. */
export const AGENT_CHECK_POINTS: Record<AgentCheckId, number> = {
  llmsTxt: 4,
  contentSignals: 3,
  markdownNegotiation: 4,
  linkHeaders: 2,
  mcpServerCard: 3,
  a2aAgentCard: 2,
  agentSkills: 2,
  apiCatalog: 2,
  oauthDiscovery: 2,
  oauthProtectedResource: 1,
};

export const AGENT_READINESS_MAX = 25;

export interface Evidence {
  request: { method: 'GET'; url: string; headers?: Record<string, string> };
  response?: { status: number; headers: Record<string, string>; bodyPreview: string };
  error?: string;
  note?: string;
}

export interface AgentCheck {
  id: AgentCheckId;
  title: string;
  passed: boolean;
  points: number;
  maxPoints: number;
  /** One line, English: what was found. The UI shows a localized title next to it. */
  detail: string;
  evidence: Evidence[];
  /** Copy-paste prompt for a coding agent (Cursor, Claude Code). Only when the check did not pass in full. */
  fixPrompt?: string;
  specUrl: string;
}

export interface AgentReadinessResult {
  score: number;
  checks: AgentCheck[];
}

// ---------------------------------------------------------------------------
// HTTP probe
// ---------------------------------------------------------------------------

interface ProbeResult {
  url: string;
  requestHeaders: Record<string, string>;
  status: number;
  headers: Record<string, string>;
  body: string;
  error?: string;
}

const KEPT_HEADERS = ['content-type', 'link', 'location', 'vary', 'x-robots-tag', 'content-signal', 'x-markdown-tokens'];

async function readCapped(res: Response): Promise<string> {
  if (res.body === null) return '';
  const chunks: Buffer[] = [];
  let total = 0;
  // Node's web ReadableStream is async iterable
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
    total += chunk.length;
    if (total >= MAX_BODY_BYTES) break; // leaving the loop cancels the stream
  }
  return Buffer.concat(chunks).toString('utf8').slice(0, MAX_BODY_BYTES);
}

export type Fetcher = (url: string, init: { headers: Record<string, string>; signal: AbortSignal; redirect: 'follow' }) => Promise<Response>;

export async function probe(url: string, extraHeaders: Record<string, string> = {}, fetcher: Fetcher = fetch): Promise<ProbeResult> {
  const requestHeaders = { 'User-Agent': USER_AGENT, ...extraHeaders };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetcher(url, { headers: requestHeaders, signal: controller.signal, redirect: 'follow' });
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    const body = await readCapped(res);
    return { url, requestHeaders: extraHeaders, status: res.status, headers, body };
  } catch (err) {
    const message = controller.signal.aborted ? `timed out after ${PROBE_TIMEOUT_MS} ms` : err instanceof Error ? err.message : String(err);
    return { url, requestHeaders: extraHeaders, status: 0, headers: {}, body: '', error: message };
  } finally {
    clearTimeout(timer);
  }
}

function evidenceOf(p: ProbeResult, note?: string): Evidence {
  const ev: Evidence = { request: { method: 'GET', url: p.url } };
  if (Object.keys(p.requestHeaders).length > 0) ev.request.headers = p.requestHeaders;
  if (p.error !== undefined) {
    ev.error = p.error;
  } else {
    const headers: Record<string, string> = {};
    for (const key of KEPT_HEADERS) {
      if (p.headers[key] !== undefined) headers[key] = p.headers[key];
    }
    ev.response = { status: p.status, headers, bodyPreview: p.body.slice(0, PREVIEW_CHARS) };
  }
  if (note !== undefined) ev.note = note;
  return ev;
}

function contentType(p: ProbeResult): string {
  return (p.headers['content-type'] ?? '').toLowerCase();
}

function looksLikeHtml(p: ProbeResult): boolean {
  return contentType(p).includes('text/html') || /^\s*(<!doctype html|<html)/i.test(p.body);
}

function parseJson(p: ProbeResult): unknown {
  if (p.status !== 200 || p.body.trim() === '' || looksLikeHtml(p)) return undefined;
  try {
    return JSON.parse(p.body) as unknown;
  } catch {
    return undefined;
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

/** Why a well-known JSON probe failed, in words a site owner understands. */
function jsonFailureReason(p: ProbeResult): string {
  if (p.error !== undefined) return `request failed (${p.error})`;
  if (p.status !== 200) return `HTTP ${p.status}`;
  if (looksLikeHtml(p)) return 'returned HTML instead of JSON (often an SPA fallback answering 200 for every path)';
  return 'response is not valid JSON';
}

// ---------------------------------------------------------------------------
// Link header parsing (RFC 8288)
// ---------------------------------------------------------------------------

export interface LinkValue {
  href: string;
  rel: string[];
  type?: string;
}

export function parseLinkHeader(header: string | undefined): LinkValue[] {
  if (header === undefined || header.trim() === '') return [];
  const out: LinkValue[] = [];
  const pattern = /<([^>]*)>\s*((?:;\s*[^;,]+(?:=(?:"[^"]*"|[^;,]*))?\s*)*)/g;
  for (const m of header.matchAll(pattern)) {
    const params = m[2] ?? '';
    const link: LinkValue = { href: m[1] ?? '', rel: [] };
    for (const pm of params.matchAll(/;\s*([a-z*-]+)\s*=\s*("([^"]*)"|[^;,\s]+)/gi)) {
      const key = (pm[1] ?? '').toLowerCase();
      const value = pm[3] ?? pm[2] ?? '';
      if (key === 'rel') link.rel = value.toLowerCase().split(/\s+/).filter((r) => r !== '');
      if (key === 'type') link.type = value.toLowerCase();
    }
    out.push(link);
  }
  return out;
}

const AGENT_LINK_RELS = new Set(['api-catalog', 'service-desc', 'service-doc', 'service-meta', 'describedby', 'status']);

function agentUsefulLinks(links: LinkValue[]): LinkValue[] {
  return links.filter(
    (l) => l.rel.some((r) => AGENT_LINK_RELS.has(r)) || (l.rel.includes('alternate') && (l.type ?? '').includes('markdown')),
  );
}

// ---------------------------------------------------------------------------
// robots.txt Content Signals (contentsignals.org)
// ---------------------------------------------------------------------------

export function findContentSignals(robotsTxt: string | null): string[] {
  if (robotsTxt === null) return [];
  return robotsTxt
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter((l) => /^content-signal\s*:/i.test(l) && /\b(ai-train|search|ai-input)\s*=\s*(yes|no)\b/i.test(l));
}

// ---------------------------------------------------------------------------
// llms.txt (llmstxt.org)
// ---------------------------------------------------------------------------

export function validateLlmsTxt(body: string): { valid: boolean; reason: string; links: number } {
  const text = body.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/).find((l) => l.trim() !== '') ?? '';
  const links = (text.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length;
  if (!/^#\s+\S/.test(firstLine)) {
    return { valid: false, reason: 'first line is not a Markdown H1 title ("# Site name")', links };
  }
  return { valid: true, reason: links > 0 ? `H1 title and ${links} Markdown link(s)` : 'H1 title (no Markdown links to key pages yet)', links };
}

// ---------------------------------------------------------------------------
// Fix prompts
// ---------------------------------------------------------------------------

function prompt(origin: string, task: string, verify: string, spec: string): string {
  return [
    `You are working in the codebase that serves ${origin}.`,
    task,
    'Keep existing behavior for browsers unchanged. Choose the right place for this in the framework and hosting the project already uses (static file in the public folder, a route handler, middleware or edge function, or server/CDN config).',
    `Spec: ${spec}`,
    `When done, verify with: ${verify}`,
  ].join('\n\n');
}

function fixPromptFor(id: AgentCheckId, origin: string, host: string): string {
  switch (id) {
    case 'llmsTxt':
      return prompt(
        origin,
        `Add /llms.txt at the site root, served as text/plain or text/markdown with HTTP 200. Format per llmstxt.org: first line "# <Site name>", then a "> " one-paragraph summary of what the site offers, then "## " sections listing the most important pages as Markdown links with a short note each ("- [Pricing](${origin}/pricing): plans and prices"). Only list pages that really exist.`,
        `curl -si ${origin}/llms.txt`,
        'https://llmstxt.org/',
      );
    case 'contentSignals':
      return prompt(
        origin,
        'In /robots.txt, inside the "User-agent: *" group, add a Content-Signal line that states how AI systems may use the content, for example:\n\nUser-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=no\nAllow: /\n\nsearch = building a search index, ai-input = using content as input to an AI answer (RAG, grounding), ai-train = training models. Ask me which values I want if unsure; do not change existing Allow/Disallow rules.',
        `curl -s ${origin}/robots.txt | grep -i content-signal`,
        'https://contentsignals.org/',
      );
    case 'markdownNegotiation':
      return prompt(
        origin,
        'Implement Markdown for Agents: when a request has "Accept: text/markdown", return a clean Markdown version of the page (main content only, no nav/footer/scripts) with "Content-Type: text/markdown; charset=utf-8" and "Vary: Accept". Requests without that Accept header must keep getting HTML. Also add <link rel="alternate" type="text/markdown" href="..."> to the HTML head pointing to the Markdown version.',
        `curl -si -H "Accept: text/markdown" ${origin}/ | head -20`,
        'https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/',
      );
    case 'linkHeaders':
      return prompt(
        origin,
        `Add RFC 8288 Link response headers to the homepage response that point agents to machine-readable resources, for example:\n\nLink: </.well-known/api-catalog>; rel="api-catalog", </llms.txt>; rel="describedby"; type="text/plain"\n\nOnly reference resources that exist (create /.well-known/api-catalog first if the site has an API).`,
        `curl -sI ${origin}/ | grep -i ^link`,
        'https://www.rfc-editor.org/rfc/rfc8288',
      );
    case 'mcpServerCard':
      return prompt(
        origin,
        `If ${host} has (or should have) an MCP server, publish an MCP Server Card as JSON at /.well-known/mcp/server-card.json with Content-Type application/json:\n\n{\n  "serverInfo": { "name": "${host}", "version": "1.0.0" },\n  "description": "<what the tools do>",\n  "transport": { "type": "streamable-http", "endpoint": "${origin}/mcp" },\n  "capabilities": { "tools": {} }\n}\n\nUse the real endpoint and capabilities of the MCP server. Make sure the path is not swallowed by an SPA fallback that returns index.html.`,
        `curl -si ${origin}/.well-known/mcp/server-card.json`,
        'https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2127',
      );
    case 'a2aAgentCard':
      return prompt(
        origin,
        `If ${host} exposes an agent that other agents can call, publish an A2A Agent Card at /.well-known/agent-card.json (application/json) with name, description, version, supportedInterfaces (each with url and protocol binding, for example JSON-RPC over HTTPS), capabilities, defaultInputModes, defaultOutputModes and skills (id, name, description, tags).`,
        `curl -si ${origin}/.well-known/agent-card.json`,
        'https://a2a-protocol.org/latest/specification/',
      );
    case 'agentSkills':
      return prompt(
        origin,
        `Publish an Agent Skills discovery index at /.well-known/agent-skills/index.json (application/json): an object with "$schema" and a "skills" array. Each entry has name, type, description, url (a SKILL.md that explains how an agent should use ${host}: its API, MCP server or key flows) and digest (sha256 of that file). Create the SKILL.md files too.`,
        `curl -si ${origin}/.well-known/agent-skills/index.json`,
        'https://github.com/cloudflare/agent-skills-discovery-rfc',
      );
    case 'apiCatalog':
      return prompt(
        origin,
        `If ${host} has a public API, publish an RFC 9727 API catalog at /.well-known/api-catalog with Content-Type application/linkset+json:\n\n{ "linkset": [ { "anchor": "${origin}/api", "service-desc": [{ "href": "${origin}/openapi.json", "type": "application/openapi+json" }], "service-doc": [{ "href": "${origin}/docs", "type": "text/html" }], "status": [{ "href": "${origin}/health" }] } ] }\n\nUse the real API base URL, OpenAPI document and docs.`,
        `curl -si ${origin}/.well-known/api-catalog`,
        'https://www.rfc-editor.org/rfc/rfc9727',
      );
    case 'oauthDiscovery':
      return prompt(
        origin,
        `If ${host} has user accounts or an API with login, publish OAuth 2.0 Authorization Server Metadata (RFC 8414) at /.well-known/oauth-authorization-server (or OpenID Connect discovery at /.well-known/openid-configuration) as JSON with issuer, authorization_endpoint, token_endpoint, grant_types_supported, response_types_supported and code_challenge_methods_supported ["S256"]. If an identity provider (Auth0, Clerk, Cognito, ...) issues the tokens, serve or proxy its metadata here.`,
        `curl -si ${origin}/.well-known/oauth-authorization-server`,
        'https://www.rfc-editor.org/rfc/rfc8414',
      );
    case 'oauthProtectedResource':
      return prompt(
        origin,
        `If ${host} has an API protected by OAuth, publish OAuth Protected Resource Metadata (RFC 9728) at /.well-known/oauth-protected-resource as JSON with resource ("${origin}"), authorization_servers (array of issuer URLs) and scopes_supported. Return a WWW-Authenticate header with resource_metadata on 401 responses.`,
        `curl -si ${origin}/.well-known/oauth-protected-resource`,
        'https://www.rfc-editor.org/rfc/rfc9728',
      );
  }
}

const TITLES: Record<AgentCheckId, string> = {
  llmsTxt: 'llms.txt',
  contentSignals: 'Content Signals in robots.txt',
  markdownNegotiation: 'Markdown for Agents',
  linkHeaders: 'Link headers for discovery',
  mcpServerCard: 'MCP Server Card',
  a2aAgentCard: 'A2A Agent Card',
  agentSkills: 'Agent Skills index',
  apiCatalog: 'API Catalog',
  oauthDiscovery: 'OAuth / OIDC discovery',
  oauthProtectedResource: 'OAuth Protected Resource',
};

const SPECS: Record<AgentCheckId, string> = {
  llmsTxt: 'https://llmstxt.org/',
  contentSignals: 'https://contentsignals.org/',
  markdownNegotiation: 'https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/',
  linkHeaders: 'https://www.rfc-editor.org/rfc/rfc8288',
  mcpServerCard: 'https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2127',
  a2aAgentCard: 'https://a2a-protocol.org/latest/specification/',
  agentSkills: 'https://github.com/cloudflare/agent-skills-discovery-rfc',
  apiCatalog: 'https://www.rfc-editor.org/rfc/rfc9727',
  oauthDiscovery: 'https://www.rfc-editor.org/rfc/rfc8414',
  oauthProtectedResource: 'https://www.rfc-editor.org/rfc/rfc9728',
};

function check(
  id: AgentCheckId,
  points: number,
  detail: string,
  evidence: Evidence[],
  origin: string,
  host: string,
): AgentCheck {
  const maxPoints = AGENT_CHECK_POINTS[id];
  const result: AgentCheck = {
    id,
    title: TITLES[id],
    passed: points >= maxPoints,
    points,
    maxPoints,
    detail,
    evidence,
    specUrl: SPECS[id],
  };
  if (points < maxPoints) result.fixPrompt = fixPromptFor(id, origin, host);
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Runs the agent readiness checks for the origin of `pageUrl`.
 * `crawlInput` may be a promise so the well-known probes run in parallel with the main crawl;
 * only the robots.txt and HTML based checks wait for it.
 */
export async function runAgentReadinessChecks(
  pageUrl: string,
  crawlInput: CrawlResult | Promise<CrawlResult>,
  fetcher: Fetcher = fetch,
): Promise<AgentReadinessResult> {
  let origin: string;
  let host: string;
  try {
    const u = new URL(pageUrl);
    origin = u.origin;
    host = u.hostname;
  } catch {
    return { score: 0, checks: [] };
  }
  const at = (path: string): string => `${origin}${path}`;
  const get = (path: string, headers: Record<string, string> = {}): Promise<ProbeResult> => probe(at(path), headers, fetcher);

  const [llms, markdown, home, mcp1, mcp2, mcp3, a2a, skills, skillsLegacy, catalog, oauthAs, oidc, prm] = await Promise.all([
    get('/llms.txt'),
    get('/', { Accept: 'text/markdown' }),
    get('/'),
    get('/.well-known/mcp/server-card.json'),
    get('/.well-known/mcp/server-cards.json'),
    get('/.well-known/mcp.json'),
    get('/.well-known/agent-card.json'),
    get('/.well-known/agent-skills/index.json'),
    get('/.well-known/skills/index.json'),
    get('/.well-known/api-catalog'),
    get('/.well-known/oauth-authorization-server'),
    get('/.well-known/openid-configuration'),
    get('/.well-known/oauth-protected-resource'),
  ]);
  const crawl = await crawlInput;

  const checks: AgentCheck[] = [];

  // 1. llms.txt
  {
    let points = 0;
    let detail: string;
    if (llms.error !== undefined || llms.status !== 200) {
      detail = llms.error !== undefined ? `/llms.txt request failed (${llms.error})` : `/llms.txt answered HTTP ${llms.status}`;
    } else if (looksLikeHtml(llms)) {
      detail = '/llms.txt returned HTML, not a Markdown text file';
    } else {
      const v = validateLlmsTxt(llms.body);
      points = v.valid ? AGENT_CHECK_POINTS.llmsTxt : 2;
      detail = v.valid ? `/llms.txt found: ${v.reason}` : `/llms.txt found but ${v.reason}`;
    }
    checks.push(check('llmsTxt', points, detail, [evidenceOf(llms)], origin, host));
  }

  // 2. Content Signals
  {
    const signals = findContentSignals(crawl.robotsTxt);
    const robotsEvidence: Evidence = {
      request: { method: 'GET', url: at('/robots.txt') },
      note:
        crawl.robotsTxt === null
          ? 'robots.txt not found'
          : signals.length > 0
            ? `Matching lines: ${signals.join(' | ')}`
            : `No Content-Signal line. robots.txt starts with: ${crawl.robotsTxt.slice(0, 300)}`,
    };
    const passed = signals.length > 0;
    checks.push(
      check(
        'contentSignals',
        passed ? AGENT_CHECK_POINTS.contentSignals : 0,
        passed ? `Content-Signal declared: ${signals[0] ?? ''}` : crawl.robotsTxt === null ? 'No robots.txt, so no Content-Signal' : 'robots.txt has no Content-Signal directive',
        [robotsEvidence],
        origin,
        host,
      ),
    );
  }

  // 3. Markdown for Agents
  {
    const negotiated = markdown.status === 200 && contentType(markdown).includes('text/markdown');
    let points = negotiated ? AGENT_CHECK_POINTS.markdownNegotiation : 0;
    let detail = negotiated
      ? 'Accept: text/markdown returns Content-Type text/markdown'
      : `Accept: text/markdown returned ${markdown.error !== undefined ? `an error (${markdown.error})` : `HTTP ${markdown.status} with Content-Type "${contentType(markdown) || 'none'}"`}`;
    const evidence = [evidenceOf(markdown)];
    if (!negotiated) {
      // Partial credit: a Markdown alternate advertised in the HTML head
      const alt = crawl.html.match(/<link\b[^>]*\brel=["']?alternate["']?[^>]*\btype=["']?text\/markdown["']?[^>]*>/i)?.[0];
      const href = alt?.match(/\bhref=["']?([^"'\s>]+)/i)?.[1];
      if (href !== undefined) {
        let altUrl = '';
        try {
          altUrl = new URL(href, crawl.finalUrl || pageUrl).toString();
        } catch {
          altUrl = '';
        }
        if (altUrl !== '') {
          const altRes = await probe(altUrl, {}, fetcher);
          evidence.push(evidenceOf(altRes, 'Markdown alternate advertised with <link rel="alternate" type="text/markdown">'));
          if (altRes.status === 200 && !looksLikeHtml(altRes)) {
            points = 2;
            detail += '; a Markdown alternate (.md) is linked from the page (partial credit)';
          }
        }
      }
    }
    checks.push(check('markdownNegotiation', points, detail, evidence, origin, host));
  }

  // 4. Link headers
  {
    const links = agentUsefulLinks(parseLinkHeader(home.headers['link']));
    const passed = links.length > 0;
    checks.push(
      check(
        'linkHeaders',
        passed ? AGENT_CHECK_POINTS.linkHeaders : 0,
        passed
          ? `Homepage Link header advertises: ${links.map((l) => l.rel.join(' ')).join(', ')}`
          : home.headers['link'] !== undefined
            ? 'Homepage has a Link header, but none with an agent-useful rel (api-catalog, service-desc, service-doc, describedby)'
            : 'Homepage response has no Link header',
        [evidenceOf(home)],
        origin,
        host,
      ),
    );
  }

  // 5. MCP Server Card
  {
    const candidates = [mcp1, mcp2, mcp3];
    let found: ProbeResult | undefined;
    let name = '';
    for (const p of candidates) {
      const json = parseJson(p);
      const cards: unknown[] = Array.isArray(json)
        ? json
        : isObject(json) && Array.isArray(json['servers'])
          ? (json['servers'] as unknown[])
          : isObject(json) && Array.isArray(json['cards'])
            ? (json['cards'] as unknown[])
            : [json];
      for (const card of cards) {
        if (!isObject(card)) continue;
        const info = card['serverInfo'];
        const n = isObject(info) && nonEmptyString(info['name']) ? info['name'] : nonEmptyString(card['name']) ? card['name'] : '';
        if (n !== '') {
          found = p;
          name = n;
          break;
        }
      }
      if (found) break;
    }
    checks.push(
      check(
        'mcpServerCard',
        found ? AGENT_CHECK_POINTS.mcpServerCard : 0,
        found ? `MCP Server Card at ${new URL(found.url).pathname} (server "${name}")` : `No MCP Server Card: ${jsonFailureReason(mcp1)}`,
        found ? [evidenceOf(found)] : candidates.map((p) => evidenceOf(p)),
        origin,
        host,
      ),
    );
  }

  // 6. A2A Agent Card
  {
    const json = parseJson(a2a);
    let points = 0;
    let detail = `No A2A Agent Card: ${jsonFailureReason(a2a)}`;
    if (isObject(json)) {
      const hasName = nonEmptyString(json['name']);
      const hasVersion = nonEmptyString(json['version']);
      const hasInterfaces = Array.isArray(json['supportedInterfaces']) && (json['supportedInterfaces'] as unknown[]).length > 0;
      const legacyUrl = nonEmptyString(json['url']);
      if (hasName && hasVersion && hasInterfaces) {
        points = AGENT_CHECK_POINTS.a2aAgentCard;
        detail = `A2A Agent Card for "${String(json['name'])}"`;
      } else if (hasName && (hasInterfaces || legacyUrl)) {
        points = 1;
        detail = `A2A Agent Card found but missing ${[!hasVersion ? 'version' : '', !hasInterfaces ? 'supportedInterfaces' : ''].filter((s) => s !== '').join(' and ')}`;
      } else {
        detail = 'agent-card.json is JSON but lacks name, version and supportedInterfaces';
      }
    }
    checks.push(check('a2aAgentCard', points, detail, [evidenceOf(a2a)], origin, host));
  }

  // 7. Agent Skills
  {
    let found: ProbeResult | undefined;
    let count = 0;
    for (const p of [skills, skillsLegacy]) {
      const json = parseJson(p);
      if (isObject(json) && Array.isArray(json['skills'])) {
        const valid = (json['skills'] as unknown[]).filter((s) => isObject(s) && nonEmptyString(s['name']));
        if (valid.length > 0) {
          found = p;
          count = valid.length;
          break;
        }
      }
    }
    checks.push(
      check(
        'agentSkills',
        found ? AGENT_CHECK_POINTS.agentSkills : 0,
        found ? `Agent Skills index with ${count} skill(s) at ${new URL(found.url).pathname}` : `No Agent Skills index: ${jsonFailureReason(skills)}`,
        found ? [evidenceOf(found)] : [evidenceOf(skills), evidenceOf(skillsLegacy)],
        origin,
        host,
      ),
    );
  }

  // 8. API Catalog
  {
    const json = parseJson(catalog);
    const linkset = isObject(json) && Array.isArray(json['linkset']) ? (json['linkset'] as unknown[]) : [];
    const passed = linkset.length > 0;
    checks.push(
      check(
        'apiCatalog',
        passed ? AGENT_CHECK_POINTS.apiCatalog : 0,
        passed
          ? `API catalog with ${linkset.length} entr${linkset.length === 1 ? 'y' : 'ies'}${contentType(catalog).includes('linkset+json') ? '' : ' (tip: serve it as application/linkset+json)'}`
          : isObject(json)
            ? 'api-catalog is JSON but has no "linkset" array'
            : `No API catalog: ${jsonFailureReason(catalog)}`,
        [evidenceOf(catalog)],
        origin,
        host,
      ),
    );
  }

  // 9. OAuth / OIDC discovery
  {
    let found: ProbeResult | undefined;
    for (const p of [oauthAs, oidc]) {
      const json = parseJson(p);
      if (isObject(json) && nonEmptyString(json['issuer']) && (nonEmptyString(json['authorization_endpoint']) || nonEmptyString(json['token_endpoint']))) {
        found = p;
        break;
      }
    }
    checks.push(
      check(
        'oauthDiscovery',
        found ? AGENT_CHECK_POINTS.oauthDiscovery : 0,
        found ? `Authorization server metadata at ${new URL(found.url).pathname}` : `No OAuth/OIDC discovery metadata: ${jsonFailureReason(oauthAs)}`,
        found ? [evidenceOf(found)] : [evidenceOf(oauthAs), evidenceOf(oidc)],
        origin,
        host,
      ),
    );
  }

  // 10. OAuth Protected Resource
  {
    const json = parseJson(prm);
    const passed = isObject(json) && nonEmptyString(json['resource']) && Array.isArray(json['authorization_servers']);
    checks.push(
      check(
        'oauthProtectedResource',
        passed ? AGENT_CHECK_POINTS.oauthProtectedResource : 0,
        passed ? 'Protected resource metadata found' : isObject(json) ? 'oauth-protected-resource lacks resource or authorization_servers' : `No protected resource metadata: ${jsonFailureReason(prm)}`,
        [evidenceOf(prm)],
        origin,
        host,
      ),
    );
  }

  const score = checks.reduce((sum, c) => sum + c.points, 0);
  logger.debug('Agent readiness computed', { origin, score });
  return { score, checks };
}
