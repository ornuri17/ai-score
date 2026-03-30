# AIScore

AI readiness scoring tool — analyzes any website and returns a 0-100 score measuring how well AI systems (ChatGPT, Claude, Perplexity) can find, read, and understand it.

**Stack**: Node.js + Express + TypeScript (API) · React + Vite + Tailwind v4 (frontend) · PostgreSQL · Redis · AWS Lambda + API Gateway + CloudFront

---

## Project Structure

```
ai-score/
├── src/                    # Backend API (Express + TypeScript)
│   ├── config/             # Typed env-var configuration
│   ├── db/                 # Prisma repositories (checks, leads, rate limits)
│   ├── middleware/         # Rate limiter (IP + domain layers)
│   ├── routes/             # Express route handlers
│   │   ├── analyze.ts      # POST /api/analyze — main scoring endpoint
│   │   └── leads.ts        # POST /api/leads — lead capture
│   ├── services/
│   │   ├── crawler.ts      # Fetches page + robots.txt + sitemap.xml in parallel
│   │   ├── scorer.ts       # 4-dimension scoring engine + summary extraction
│   │   └── cache.ts        # Redis-backed 7-day result cache
│   ├── types/index.ts      # Shared type contracts — single source of truth
│   └── index.ts            # App entry point
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── components/     # NavBar, ScoreCard, DimensionBreakdown, LeadForm, SocialShare
│   │   ├── pages/          # Home, Results, HowItWorks, Privacy, Terms
│   │   ├── locales/        # i18n translations (en, fr, de, es, he, ru)
│   │   ├── services/api.ts # Axios API client
│   │   └── i18n/config.ts  # i18next setup with 6 languages
│   └── index.html
├── prisma/                 # Database schema + migrations
├── infra/                  # Terraform — AWS VPC, RDS, Redis, Lambda, API GW, CloudFront
├── docs/                   # Product + engineering documentation
│   ├── product/            # PRD, monetization, enhancements
│   └── engineering/        # Technical spec, architecture, implementation plan
└── tests/                  # Integration + scoring validation tests
```

---

## Backend: Getting Started

### Prerequisites

- Node.js 20+
- Docker + Docker Compose (for local Postgres + Redis)

```bash
# 1. Clone
git clone https://github.com/ornuri17/ai-score.git
cd ai-score

# 2. Environment
cp .env.example .env

# 3. Start Postgres + Redis
docker-compose up -d

# 4. Install dependencies
npm install

# 5. Run migrations
npx prisma migrate dev

# 6. Start dev server
npm run dev
```

API available at `http://localhost:3000`. Verify:
```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

### Running Tests

```bash
npm test                   # All tests
npm run test:scoring       # Scoring-specific tests only
npm test -- --coverage     # With coverage report
```

### Lint + Type Check

```bash
npm run lint               # ESLint (bans any, warns on console)
npm run type-check         # TypeScript strict mode
```

### Build for Production

```bash
npm run build
npm start
```

---

## Frontend: Getting Started

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
npm run build              # Production build
```

### Environment

```bash
# frontend/.env
VITE_API_URL=http://localhost:3000   # Backend API base URL
```

---

## API Reference

### `POST /api/analyze`

Analyzes a website and returns its AI-readiness score.

**Request**
```json
{ "url": "https://example.com", "force_refresh": false }
```

**Response**
```json
{
  "check_id": "uuid",
  "score": 74,
  "dimensions": {
    "crawlability": 25,
    "content": 27,
    "technical": 15,
    "quality": 7
  },
  "issues": ["structured_data_missing", "crawlability_issues"],
  "summary": "Example Domain is a placeholder domain maintained by IANA for illustrative examples in documents.",
  "cached": false,
  "checked_at": "2026-03-29T12:00:00.000Z",
  "expires_at": "2026-04-05T12:00:00.000Z"
}
```

**Issue keys**

| Key | Meaning |
|---|---|
| `blocked_from_crawlers` | `noindex` meta tag present |
| `ai_crawlers_blocked` | GPTBot, ClaudeBot, or PerplexityBot blocked in `robots.txt` |
| `not_publicly_accessible` | Auth required or non-200 response |
| `crawlability_issues` | No sitemap found (neither `/sitemap.xml` nor `robots.txt` Sitemap directive) |
| `structured_data_missing` | No JSON-LD schema markup |
| `metadata_optimization` | Missing/invalid meta description, title, or Open Graph tags |
| `mobile_unfriendly` | No viewport meta tag |
| `no_https` | Site not using HTTPS |
| `slow_page_load` | Response time > 3s |
| `no_internal_links` | Fewer than 3 internal links found |
| `no_language_tag` | Missing `<html lang>` attribute |
| `access_or_speed_issues` | Too many redirects or response time > 10s |

### `POST /api/leads`

Captures a lead after a user views their score.

**Request**
```json
{
  "check_id": "uuid",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1 555 123 4567"
}
```

---

### `GET /api/history/:domain`

Returns historical score checks for a domain (up to 30), ordered oldest → newest.

**Example**
```
GET /api/history/example.com
```

**Response**
```json
{
  "domain": "example.com",
  "history": [
    {
      "check_id": "uuid",
      "score": 62,
      "dimensions": { "crawlability": 20, "content": 24, "technical": 13, "quality": 5 },
      "checked_at": "2026-03-01T10:00:00.000Z"
    },
    {
      "check_id": "uuid",
      "score": 74,
      "dimensions": { "crawlability": 25, "content": 27, "technical": 15, "quality": 7 },
      "checked_at": "2026-03-29T12:00:00.000Z"
    }
  ]
}
```

History is only available for domains that have been scanned more than once. Data is retained for 12 months.

---

## Scoring Algorithm

Each check is binary — full points or zero.

### Crawlability (30 pts)
| Check | Points |
|---|---|
| No `noindex` meta (check 1) | +5 |
| No `noindex` meta (check 2) | +5 |
| No `nofollow` meta | +5 |
| Not auth-gated | +5 |
| Response time < 10s and ≤ 5 redirects | +5 |
| Sitemap accessible (`/sitemap.xml` exists, or declared in `robots.txt`, or `<link rel="sitemap">`) | +5 |

### Content Structure (35 pts)
Semantic HTML (+4), meta description 50-160 chars (+4), title 30-60 chars (+4), Open Graph tags (+4), JSON-LD schema (+5), publication date (+4), viewport meta (+4), `<html lang>` (+2)

### Technical SEO (25 pts)
Canonical tag (+5), HTTPS (+5), clean URL (+5), response < 3s (+5), body text > 200 chars without JS (+5)

### Content Quality (10 pts)
Body text > 300 chars (+5), > 2 internal links (+5)

### Penalties
| Condition | Penalty |
|---|---|
| `noindex` or auth-required | -30 |
| Non-200 status | -25 |
| Too many redirects or timeout | -15 |
| AI crawlers blocked in `robots.txt` | -20 |

---

## What the Crawler Fetches

Per check, three parallel HTTP requests are made:

1. **Page** — `GET {url}` — full HTML for scoring
2. **robots.txt** — `GET {origin}/robots.txt` — checks for AI bot blocking (GPTBot, ClaudeBot, PerplexityBot) and `Sitemap:` directives
3. **sitemap.xml** — `GET {origin}/sitemap.xml` — checks existence, counts `<loc>` entries (capped at 500 KB)

robots.txt and sitemap fetches are fire-and-forget with a 5s timeout — failures are non-fatal.

---

## Website Summary

The scorer extracts a plain-language description of what the site is about, returned in the `summary` field. Priority order:

1. `<meta name="description">`
2. `<meta property="og:description">`
3. First `<p>` element with ≥ 80 characters
4. First 250 characters of visible body text

No AI call. No extra cost. All from the existing page fetch.

---

## Multilingual Support

The frontend supports 6 languages with auto-detection from `localStorage` (user preference) → `navigator.language` → English fallback.

| Code | Language | RTL |
|---|---|---|
| `en` | English | No |
| `fr` | Français | No |
| `de` | Deutsch | No |
| `es` | Español | No |
| `he` | עברית | Yes (auto-applied) |
| `ru` | Русский | No |

Translation files: `frontend/src/locales/{lang}/translation.json`

---

## Services

| Service | Responsibility |
|---|---|
| `crawler.ts` | Fetches page, `robots.txt`, and `sitemap.xml` in parallel; parses robots.txt for AI bot rules |
| `scorer.ts` | 4-dimension binary scoring engine; extracts site summary |
| `cache.ts` | Redis-backed result cache with 7-day TTL; falls back to DB on miss |
| `middleware/rateLimiter.ts` | IP-based (50/day) and domain-based (100/day) rate limiting via Redis |
| `routes/history.ts` | `GET /api/history/:domain` — returns up to 30 past checks for a domain |

---

## Environment Variables

See `.env.example` for full reference.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string (required) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `PORT` | `3000` | HTTP port |
| `CRAWLER_TIMEOUT_MS` | `10000` | Max ms to wait for a page fetch |
| `CACHE_TTL_SECONDS` | `604800` | Score cache lifetime (7 days) |
| `RATE_LIMIT_CHECKS_IP` | `50` | Max checks per IP per day |
| `CIRCUIT_BREAKER_FAILURES` | `3` | Failures before circuit opens |

---

## Cost Estimate

At 1,000 checks/day (~30,000/month): **~$82/month** (~$0.0027/check).

Biggest cost driver: NAT Gateway (~$35/mo). See `docs/ops/COST_ANALYSIS.md` for full breakdown.

---

## Logging

All code uses `src/logger.ts` — never `console.log` directly.

```typescript
import { logger } from './logger';
logger.info('Server started', { port: 3000 });
logger.warn('Rate limit hit', { ip: '1.2.3.4' });
logger.error('DB error', error);
```

---

## Infrastructure

Terraform config in `infra/` provisions: VPC, RDS PostgreSQL (db.t3.micro), ElastiCache Redis (cache.t3.micro), Lambda, API Gateway, CloudFront. See `infra/README.md`.
