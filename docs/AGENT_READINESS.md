# Agent readiness (25 of 100 points)

GradeByAI already measured whether AI search crawlers can read and cite a page. This dimension measures whether an AI agent can **discover** the site, **read** it as Markdown and **connect** to it. The checks follow the specs published by Cloudflare's scanner (https://isitagentready.com/llms-full.txt), so a site that passes there passes here.

## Scoring

The four original dimensions keep their checks and are scaled proportionally into 75 points: crawlability 30 to 22, content 35 to 26, technical 25 to 19, quality 10 to 8. Penalties are unchanged.

| Check | Points | Passes when |
|---|---|---|
| llms.txt | 4 | `/llms.txt` answers 200, not HTML, first line is a Markdown H1 (2 points if it exists but is not valid) |
| Content Signals | 3 | robots.txt has `Content-Signal:` with `ai-train`, `search` or `ai-input` = yes/no |
| Markdown for Agents | 4 | `GET /` with `Accept: text/markdown` returns `Content-Type: text/markdown` (2 points for a working `<link rel="alternate" type="text/markdown">` only) |
| Link headers | 2 | Homepage `Link` header has `api-catalog`, `service-desc`, `service-doc`, `service-meta`, `describedby`, `status` or a Markdown alternate |
| MCP Server Card | 3 | `/.well-known/mcp/server-card.json`, `/.well-known/mcp/server-cards.json` or `/.well-known/mcp.json` is JSON with `serverInfo.name` or `name` |
| A2A Agent Card | 2 | `/.well-known/agent-card.json` has `name`, `version` and `supportedInterfaces` (1 point if partially valid) |
| Agent Skills | 2 | `/.well-known/agent-skills/index.json` (or legacy `/.well-known/skills/index.json`) has a `skills` array with named entries |
| API Catalog | 2 | `/.well-known/api-catalog` is JSON with a non-empty `linkset` array |
| OAuth discovery | 2 | `/.well-known/oauth-authorization-server` or `/.well-known/openid-configuration` has `issuer` plus an authorization or token endpoint |
| OAuth Protected Resource | 1 | `/.well-known/oauth-protected-resource` has `resource` and `authorization_servers` |

A JSON check that gets HTML back (an SPA fallback answering 200 for every path) fails with that reason spelled out.

The probes run in parallel with the page crawl, 5 second timeout each, 256 KB body cap.

Not scored (same as Cloudflare treats them as informational or out of scope here): DNS-AID, Web Bot Auth, WebMCP (needs JavaScript execution), Auth.md, ARD, commerce protocols.

## Output

`POST /api/analyze` now also returns:

- `dimensions.agentReadiness` and `maxDimensions` (so clients stop hard-coding 30/35/25/10)
- `agentChecks[]`: `{ id, title, passed, points, maxPoints, detail, evidence[], fixPrompt?, specUrl }`. Evidence has the exact request (URL, headers) and response (status, key headers, first 600 characters of the body)
- `fixes[]`: every failed agent check and classic issue, biggest gain first, each with a copy-paste prompt for Cursor / Claude Code. Classic gains are the rebalanced points plus any penalty the fix removes

The results page shows "Fix these first to gain X points" (top 3, copy one or all prompts) and the agent readiness checks with expandable request/response. All UI text is translated into the 6 languages; the prompts stay in English on purpose.

## Live comparison (Nov 5, 2026)

| Site | Agent readiness | Total |
|---|---|---|
| or-nuri.com | 25 / 25 | 94 |
| monday.com | 20 / 25 (no Markdown negotiation, A2A card without supportedInterfaces) | 89 |
| isitagentready.com | 20 / 25 (no A2A card, no OAuth) | 82 |
| gradebyai.com | 4 / 25 (only llms.txt) | 76 |
