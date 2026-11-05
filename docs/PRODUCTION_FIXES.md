# Production fixes (Nov 2026)

What was broken on gradebyai.com, why, and what this change does about it.

## 1. /api/stats, /api/leaderboard, /api/badge/:domain returned HTTP 500

**Cause (two problems stacked):**

1. The deployed frontend calls `/api/stats`, `/api/leaderboard`, `/api/badge/:domain` and `/share/:domain`, but the API on `main` never had those routes.
2. Any request that matched no route fell through to Express's default 404 handler (finalhandler). Under `@vendia/serverless-express` that handler crashes with `TypeError: ee.on is not a function`, so every unknown path became a 500 instead of a 404. Reproduced locally with an API Gateway event; covered by `tests/lambda.test.ts`.

Also found on the way: `/api/analyze` never wrote a `Check` row, but `/api/leads` inserts a `Lead` with a foreign key to `Check`. So lead submissions could not succeed, and `/api/history` was a stub that always returned `[]`.

**Fix:**

- Explicit JSON 404 handler and error handler, so nothing reaches finalhandler (unknown path = 404, malformed JSON = 400).
- New routes: `GET /api/stats` (`{ totalChecks, totalDomains }`), `GET /api/leaderboard` (`{ leaderboard: [{ rank, domain, score, checks }] }`, top 50 by best score), `GET /api/badge/:domain` (SVG), `GET /share/:domain?score=N` (Open Graph page that redirects to `/analysis/:domain`).
- Every analysis is now stored in `Check` (`src/services/checkStore.ts`), which feeds stats, leaderboard, history and badges and makes leads work. A lead for an unknown check answers 404 instead of 500.
- If the database is unreachable, stats and leaderboard answer 503 JSON (the badge still answers an image), never an HTML 500.
- `prisma/migrations/20261105000000_init/migration.sql`: the repo had no migrations at all (`prisma/migrations/*.sql` is in `.gitignore`, and the CI "migrate" step reads `prisma/migrations/<folder>/migration.sql`). This one is idempotent (`IF NOT EXISTS` everywhere), so it is safe if some tables already exist. The migrate handler now also fails with a clear message if the folder is missing.

**What Or needs to check after deploy:**

- The Lambda has `DATABASE_URL` set (Terraform sets it from SSM). Without it the API falls back to an in-memory store and stats reset on every cold start.
- The CI step "Run DB migrations via Lambda" prints `{"success":true,"applied":["20261105000000_init"]}` on the first deploy. If it prints an error, the tables are not there and stats/leaderboard will answer 503.
- Optional: set `FRONTEND_URL` (defaults to `https://www.gradebyai.com`) and `IP_HASH_SALT` on the Lambda.

## 2. Unknown paths on gradebyai.com returned 200 HTML

**Cause:** CloudFront mapped every S3 403/404 to `/index.html` with status 200 (classic SPA trick). So `/.well-known/anything`, `/nosuch` and typos all answered 200 HTML. Crawlers see soft 404s, and agent scanners (for example Cloudflare's isitagentready.com) log "returned HTML instead of JSON".

**Fix (Terraform, `infra/`):**

- `infra/cloudfront-spa-router.js`: a CloudFront Function on viewer-request rewrites only real app routes (`/`, `/analysis/:domain`, `/compare`, `/check`, `/faq`, `/leaderboard`, `/guides/...`, `/how-it-works`, `/privacy`, `/terms`, `/admin`) to `/index.html`.
- The 403/404 custom error responses now return **404** (body is still `index.html`, so the app renders its new Not Found page).
- Frontend: a `*` route with a localized Not Found page.

**What Or needs to do:** CI does not run Terraform. Apply it (`cd infra && terraform plan && terraform apply`), or make the same two changes in the AWS console: create the CloudFront Function from `cloudfront-spa-router.js` and attach it to the default behavior (viewer request), then change both custom error responses to response code 404. When a new app route is added, add it to `SPA_ROUTES` too.

## 3. X-Robots-Tag was read from the page body

The crawler discarded HTTP response headers, and the scorer searched the HTML text for "x-robots-tag". A header-level `noindex` was missed, and a page that merely mentioned the header could be penalized.

**Fix:** the crawler keeps the final response headers (`CrawlResult.headers`). The scorer parses `X-Robots-Tag` properly: global directives, `none`, and directives scoped to GPTBot / ClaudeBot / PerplexityBot (scopes for other crawlers such as `googlebot:` are ignored). `noindex` gets the same penalty as meta robots noindex; `nofollow` now also costs the nofollow points. Meta robots tags named after the AI bots (`<meta name="GPTBot" ...>`) are read too.

## 4. robots.txt parsing

The old parser only flagged a literal `Disallow: /`, ignored grouped `User-agent` lines, Allow overrides, wildcards and path rules.

**Fix:** `robots-parser` (RFC 9309): grouped user-agents, most specific group wins over `*`, longest match wins, Allow wins ties, `*` and `$` wildcards. The check now asks "may GPTBot / ClaudeBot / PerplexityBot fetch this page URL", not "is the whole site disallowed".

## 5. Summary cut at the first apostrophe

`extractMetaContent` used `content=["']([^"']+)["']`, so `content="it's ready"` became `it`. It now parses attributes respecting each value's own quote style and decodes HTML entities (`&amp;`, `&#39;`, ...). The cache key has a version prefix (`v2:`), so results cached with the old bug are not served again.

## 6. llms.txt and "How it works" claimed checks that do not exist

They promised JavaScript rendering, readability and topical coverage. None of those exist in the scorer (it reads raw HTML only). `frontend/public/llms.txt` and the How it works copy (all 6 languages) now describe what is really scored, and say plainly that JavaScript is not executed.
