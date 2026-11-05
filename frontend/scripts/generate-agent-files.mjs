// Generates GradeByAI's own agent discovery files into public/ before each build,
// using the API base URL the build already gets (VITE_API_URL).
//
//   public/.well-known/mcp/server-card.json   MCP Server Card (points at <API>/mcp)
//   public/.well-known/api-catalog            RFC 9727 API catalog
//   public/.well-known/agent-skills/index.json + gradebyai-scan/SKILL.md
//   public/api.md                             public scan API documentation
//   public/index.md                           Markdown version of the home page
//                                             (served for Accept: text/markdown by the CloudFront function)
//
// These files are generated, not committed (see .gitignore).

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = (process.env.SITE_URL || 'https://www.gradebyai.com').replace(/\/$/, '');
const API = (process.env.VITE_API_URL || '').replace(/\/$/, '');
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

function write(rel, content) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

if (!API || API.includes('localhost')) {
  console.warn('[agent-files] VITE_API_URL is not a public URL; MCP card, API catalog and API docs point at', API || '(unset)');
}
const api = API || 'http://localhost:3000';

const apiDoc = `# GradeByAI public API

Base URL: ${api}

No API key. Rate limit: 50 requests per IP per day. Results are cached for 7 days per URL.

## POST /api/analyze

Score one page.

    curl -s -X POST ${api}/api/analyze -H 'Content-Type: application/json' -d '{"url":"https://example.com"}'

Body: \`{ "url": "https://example.com", "force_refresh": false }\`

Response (abridged):

    {
      "checkId": "uuid",
      "url": "https://example.com",
      "score": 76,
      "dimensions":    { "crawlability": 22, "content": 23, "technical": 19, "quality": 8, "agentReadiness": 4 },
      "maxDimensions": { "crawlability": 22, "content": 26, "technical": 19, "quality": 8, "agentReadiness": 25 },
      "issues": ["structured_data_missing"],
      "agentChecks": [{ "id": "llmsTxt", "passed": true, "points": 4, "maxPoints": 4, "detail": "...", "evidence": [ ... ], "specUrl": "..." }],
      "fixes": [{ "id": "markdownNegotiation", "kind": "agent", "title": "Markdown for Agents", "gain": 4, "prompt": "You are working in the codebase that serves ..." }],
      "summary": "...",
      "checkedAt": "2026-11-05T09:00:00.000Z"
    }

## POST /api/compare

\`{ "myUrl": "https://a.com", "competitorUrl": "https://b.com" }\` returns both results, \`winner\` and \`delta\`.

## GET endpoints

- \`GET /api/history/{domain}\`: past scores, newest first
- \`GET /api/leaderboard\`: top 50 domains by best score
- \`GET /api/stats\`: total checks and domains
- \`GET /api/badge/{domain}\`: SVG badge with the latest score, for READMEs and sites

## MCP

Streamable HTTP endpoint: ${api}/mcp (JSON responses, no session). One tool, \`scan_site\` (\`url\`, optional \`force_refresh\`).

Server card: ${SITE}/.well-known/mcp/server-card.json
`;

const skill = `---
name: gradebyai-scan
description: Score any website 0-100 for AI search and AI agent readiness with GradeByAI, and get a ranked fix list with coding-agent prompts.
---

# Scan a website with GradeByAI

Use this when someone asks how ready a site is for ChatGPT, Claude, Perplexity or AI agents, or what to fix first.

1. Call the MCP tool \`scan_site\` at ${api}/mcp with \`{ "url": "https://example.com" }\`, or POST the same JSON to ${api}/api/analyze.
2. Report \`score\` and the five \`dimensions\` against \`maxDimensions\`.
3. Offer the top entries of \`fixes\` (already sorted by \`gain\`). Each has a \`prompt\` that can be pasted into a coding agent as is.
4. For a failed agent check, \`agentChecks[].evidence\` holds the exact request and response.

Full API: ${SITE}/api.md
`;

const indexMd = `# GradeByAI: is your website ready for AI?

GradeByAI gives any website a free 0-100 score for AI readiness: whether AI search engines (ChatGPT, Claude, Perplexity) can crawl, read and cite it, and whether AI agents can discover it, read it as Markdown and connect to it.

## What is scored

- Crawlability (22 points): status, noindex/nofollow (meta and X-Robots-Tag), redirects, speed, sitemap
- Content structure (26 points): semantic HTML, title, meta description, Open Graph, JSON-LD, publish date, viewport, language
- Technical SEO (19 points): canonical, HTTPS, clean URL, response time, visible text
- Content quality (8 points): text depth, internal links
- Agent readiness (25 points): llms.txt, Content Signals, Markdown for Agents, Link headers, MCP Server Card, A2A Agent Card, Agent Skills, API catalog, OAuth discovery

Every failed check comes with the evidence behind it and a ready prompt for Cursor or Claude Code, ranked by how many points it is worth.

## Links

- [Score a website](${SITE}/)
- [How it works](${SITE}/how-it-works)
- [Leaderboard](${SITE}/leaderboard)
- [Public API](${SITE}/api.md)
- [llms.txt](${SITE}/llms.txt)
`;

write('api.md', apiDoc);
write('index.md', indexMd);
write('.well-known/agent-skills/gradebyai-scan/SKILL.md', skill);

write(
  '.well-known/mcp/server-card.json',
  JSON.stringify(
    {
      protocolVersion: '2025-06-18',
      serverInfo: { name: 'gradebyai', title: 'GradeByAI', version: '1.0.0' },
      description: 'Score any website 0-100 for AI search and AI agent readiness, with a ranked fix list.',
      documentationUrl: `${SITE}/api.md`,
      transport: { type: 'streamable-http', endpoint: `${api}/mcp` },
      capabilities: { tools: { listChanged: false } },
      tools: [{ name: 'scan_site', title: 'Score a website for AI readiness' }],
    },
    null,
    2,
  ) + '\n',
);

write(
  '.well-known/api-catalog',
  JSON.stringify(
    {
      linkset: [
        {
          anchor: `${api}/api`,
          'service-doc': [{ href: `${SITE}/api.md`, type: 'text/markdown' }],
          status: [{ href: `${api}/health`, type: 'application/json' }],
        },
      ],
    },
    null,
    2,
  ) + '\n',
);

const digest = 'sha256:' + createHash('sha256').update(skill).digest('hex');
write(
  '.well-known/agent-skills/index.json',
  JSON.stringify(
    {
      $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
      skills: [
        {
          name: 'gradebyai-scan',
          type: 'skill-md',
          description: 'Score a website for AI readiness and get a ranked fix list.',
          url: `${SITE}/.well-known/agent-skills/gradebyai-scan/SKILL.md`,
          digest,
        },
      ],
    },
    null,
    2,
  ) + '\n',
);

console.log('[agent-files] generated for API', api);
