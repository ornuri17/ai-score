# AIScore - Week 1 Checklist (Backend + Scoring)

**Duration**: 5 work days (~12 hours per day is aggressive, can stretch to 6-7 days)
**Blocker**: Scoring validation test must pass (90% accuracy on 20 websites)
**Success**: End of Week 1 = `/api/analyze` fully functional + validated

---

## Day 1-2: Project Setup & Infrastructure (8 hours)

### Code Setup
- [ ] Create GitHub repo (private or public)
- [ ] Node.js + Express + TypeScript boilerplate
- [ ] `npm init` with dependencies:
  ```bash
  npm install express typescript ts-node cors dotenv
  npm install --save-dev @types/express @types/node nodemon
  npm install pg prisma @prisma/client
  npm install redis ioredis
  npm install cheerio axios lodash
  npm install libphonenumber-js  # Phone validation
  ```
- [ ] Create `.env.example` with all config vars:
  ```
  DATABASE_URL=postgresql://user:pass@localhost:5432/aiscore
  REDIS_URL=redis://localhost:6379
  NODE_ENV=development
  PORT=3000
  SENDGRID_API_KEY=...
  ```
- [ ] Create `src/` and `tests/` directories
- [ ] Create `.gitignore`, `tsconfig.json`, `package.json`

### AWS Account Setup
- [ ] **RDS PostgreSQL t3.micro**
  - [ ] Created in AWS console
  - [ ] Security group allows local connection
  - [ ] Note down: host, port, username, password, database name
  - [ ] Connection verified from local machine
- [ ] **ElastiCache Redis cache.t3.micro**
  - [ ] Created in AWS console
  - [ ] Security group allows local connection
  - [ ] Connection verified from local machine
  - [ ] Note down: endpoint, port
- [ ] **Lambda execution role**
  - [ ] Create IAM role with policies:
    - [ ] AmazonRDSFullAccess
    - [ ] AmazonElastiCacheFullAccess
    - [ ] CloudWatchLogsFullAccess
- [ ] **S3 bucket** (for future use)
  - [ ] Created, note down bucket name

### CI/CD Setup
- [ ] GitHub Actions workflow (`.github/workflows/ci.yml`):
  ```yaml
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-node@v3
        - run: npm install
        - run: npm run lint
        - run: npm run type-check
        - run: npm run test
  ```
- [ ] `npm scripts` in package.json:
  ```json
  {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src/**/*.ts",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:scoring": "jest --testPathPattern=scoring"
  }
```

### Local Development
- [ ] `npm run dev` works
- [ ] Server starts on port 3000
- [ ] No errors in console

**Time**: 8 hours
**Blocker**: None (but verify RDS + Redis connectivity before moving on)

---

## Day 3-4: Database & ORM Setup (6 hours)

### Prisma Schema
- [ ] `npx prisma init` (creates `.prisma/schema.prisma`)
- [ ] Configure `schema.prisma`:
  ```prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }

  generator client {
    provider = "prisma-client-js"
  }

  model Check {
    id              String   @id @default(uuid()) @db.Uuid
    domain          String
    urlHash         String   @unique
    score           Int      @db.SmallInt
    crawlability    Int      @db.SmallInt
    content         Int      @db.SmallInt
    technical       Int      @db.SmallInt
    quality         Int      @db.SmallInt
    issues          Json     @default("[]")
    checkedAt       DateTime @default(now())
    cachedUntil     DateTime @default(dbgenerated("now() + interval '24 hours'"))
    fallbackUntil   DateTime @default(dbgenerated("now() + interval '7 days'"))
    ipHash          String
    userAgent       String?
    languageDetected String?
    createdAt       DateTime @default(now())

    leads Lead[]

    @@index([domain])
    @@index([cachedUntil])
    @@index([ipHash])
  }

  model Lead {
    id        String   @id @default(uuid()) @db.Uuid
    checkId   String   @db.Uuid
    check     Check    @relation(fields: [checkId], references: [id])
    name      String
    email     String
    phone     String
    createdAt DateTime @default(now())

    @@unique([checkId, email])
    @@index([email])
    @@index([createdAt])
  }

  model RateLimit {
    id      String   @id @default(uuid()) @db.Uuid
    key     String   @unique
    count   Int      @default(1)
    resetAt DateTime

    @@index([resetAt])
  }
  ```

### Database Migrations
- [ ] Create migration: `npx prisma migrate dev --name initial`
- [ ] Review generated SQL (should match schema above)
- [ ] Migration applies successfully to RDS
- [ ] Verify tables exist in PostgreSQL:
  ```bash
  psql -h your-rds-endpoint -d aiscore -c "\dt"
  ```

### Connection Pooling
- [ ] Configure Prisma connection pool in `.env`:
  ```
  # Optional: increase if needed
  DATABASE_URL="postgresql://user:pass@host/db?connection_limit=5"
  ```

### Seed Script (Optional)
- [ ] Create `prisma/seed.ts` for test data (optional for Phase 1)

**Time**: 6 hours
**Blocker**: Database migrations must apply successfully

---

## Day 5: Scoring Algorithm Implementation (8 hours)

### Scoring Service
- [ ] Create `src/services/scorer.ts`
- [ ] Implement `scoreWebsite(url: string): ScoringResult` function
- [ ] Implement all 4 dimension calculators:
  - [ ] `calculateCrawlability()` — 30 pts
  - [ ] `calculateContent()` — 35 pts
  - [ ] `calculateTechnical()` — 25 pts
  - [ ] `calculateQuality()` — 10 pts
- [ ] Implement penalties:
  - [ ] `-30` for noindex/robots blocked
  - [ ] `-25` for auth/unreachable
  - [ ] `-15` for redirects/timeout
- [ ] Implement issues array population
- [ ] Add detailed code comments explaining each check

### HTML Parser Integration
- [ ] Install Cheerio: `npm install cheerio`
- [ ] Create `src/services/crawler.ts`:
  - [ ] `fetchWebsite(url: string): Promise<string>` — fetch HTML with 10s timeout
  - [ ] Handle redirects (count them)
  - [ ] Handle timeouts gracefully
  - [ ] Parse with Cheerio

### Unit Tests
- [ ] Create `src/services/scorer.test.ts`
- [ ] Test edge cases:
  - [ ] Site with all headers present
  - [ ] Site with missing headers
  - [ ] Site with timeout
  - [ ] Site with noindex tag
  - [ ] Site with auth
  - [ ] Site with many redirects
- [ ] All tests passing: `npm run test`

### Utilities
- [ ] Create `src/utils/validators.ts`:
  - [ ] URL validation (must be HTTP/HTTPS)
  - [ ] Domain extraction + normalization
- [ ] Create `src/utils/hasher.ts`:
  - [ ] SHA256 hashing for URLs + IPs

**Time**: 8 hours
**Blocker**: Scoring logic must be complete (validation test comes next)

---

## Day 6-7: API & Cache Implementation (12 hours)

### API Endpoint: `/api/analyze`
- [ ] Create `src/routes/analyze.ts`
- [ ] Implement `POST /api/analyze`:
  ```
  Request: { url: string, force_refresh?: boolean }
  Response: {
    check_id: string,
    score: number,
    dimensions: { crawlability, content, technical, quality },
    issues: string[],
    cached: boolean,
    checked_at: timestamp,
    cached_until: timestamp,
    fallback_until: timestamp
  }
  ```
- [ ] Parse request, validate URL
- [ ] Call cache service (check Redis)
- [ ] If cache hit + !force_refresh: return cached result
- [ ] If cache miss or force_refresh:
  - [ ] Fetch website (crawler service)
  - [ ] Score website (scorer service)
  - [ ] Store in PostgreSQL (Prisma)
  - [ ] Cache in Redis (24h TTL)
  - [ ] Return response
- [ ] Error handling:
  - [ ] Invalid URL → 400
  - [ ] Site unreachable → 503
  - [ ] Rate limited → 429
  - [ ] Other errors → 500

### Cache Layer
- [ ] Create `src/services/cache.ts`:
  - [ ] `get(key: string)` — fetch from Redis
  - [ ] `set(key: string, value, ttl: number)` — store in Redis
  - [ ] Handle Redis errors gracefully
  - [ ] Fallback to database cache:
    - [ ] If Redis down, read cached result from `checks` table
    - [ ] Check `fallback_until` timestamp
  - [ ] Circuit breaker: after 3 Redis failures, skip Redis for 5 min

### Rate-Limiting Middleware
- [ ] Create `src/middleware/rateLimiter.ts`
- [ ] **Layer 1**: IP-based (50 checks/day)
  - [ ] Hash IP with SHA256
  - [ ] Check Redis key: `ratelimit:ip:{ip_hash}:checks`
  - [ ] Increment counter
  - [ ] If count > 50: return 429 with retry-after header
  - [ ] Reset at UTC midnight
- [ ] **Layer 2**: Form submission (handled in `/api/leads`)
- [ ] Logging: log all rate-limit violations
- [ ] Alert (optional): log warning if >500 violations/hour

### Express App Setup
- [ ] Create `src/index.ts`:
  ```typescript
  import express from 'express';
  import cors from 'cors';
  import { analyzeRouter } from './routes/analyze';

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(rateLimiterMiddleware);

  app.post('/api/analyze', analyzeRouter);

  app.listen(3000, () => console.log('Server running on port 3000'));
  ```
- [ ] Test with curl:
  ```bash
  curl -X POST http://localhost:3000/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"url":"https://example.com"}'
  ```

**Time**: 12 hours
**Blocker**: `/api/analyze` fully functional before Day 7

---

## Day 7: Scoring Validation Test Harness (8 hours) — CRITICAL BLOCKER

### Identify Test Websites
- [ ] Select 20 websites across categories:
  - [ ] 5 static sites (blogs, docs): expect 75-92/100
  - [ ] 3 SPAs without schema: expect 30-50/100
  - [ ] 2 SPAs with schema: expect 65-85/100
  - [ ] 3 e-commerce sites: expect 70-88/100
  - [ ] 3 media sites: expect 60-85/100
  - [ ] 1 noindex site: expect 0-40/100

### Manual Scoring
- [ ] Create spreadsheet with all 20 URLs
- [ ] For each URL, manually score using your algorithm:
  - [ ] Check robots.txt (online tools)
  - [ ] Check meta tags (browser inspector)
  - [ ] Check page speed
  - [ ] Check JSON-LD schema
  - [ ] Record expected score range
- [ ] Note assumptions for each site

### Automated Testing
- [ ] Create `tests/scoring-validation.test.ts`:
  ```typescript
  describe('Scoring Validation', () => {
    const testWebsites = require('./test-websites.json');

    testWebsites.forEach(site => {
      test(`${site.name} scores within ${site.expectedMin}-${site.expectedMax}`, async () => {
        const result = await analyzeWebsite(site.url);
        expect(result.score).toBeGreaterThanOrEqual(site.expectedMin - 10);
        expect(result.score).toBeLessThanOrEqual(site.expectedMax + 10);
      });
    });
  });
  ```
- [ ] Create `tests/test-websites.json`:
  ```json
  [
    {
      "url": "https://example.com",
      "name": "Example Static Site",
      "expectedMin": 75,
      "expectedMax": 90,
      "category": "static"
    },
    // ... 19 more
  ]
  ```

### Run Validation
- [ ] Run all 20 tests: `npm run test:scoring`
- [ ] **Success Criteria**: 18/20 pass (90% accuracy, ±10 point tolerance)
- [ ] If failures:
  - [ ] Investigate anomalies (which sites scored wrong?)
  - [ ] Adjust scoring algorithm if needed
  - [ ] Document reasons for changes
  - [ ] Re-run tests
- [ ] Once passing, create `tests/scoring-validation-results.md`:
  ```markdown
  # Scoring Validation Results

  Date: 2026-03-26
  Result: 18/20 PASS (90% accuracy)

  ## Passes
  - [x] example.com (scored 78, expected 75-90)
  - ...

  ## Failures
  - [ ] site-x.com (scored 45, expected 70-85) — FAILED (too low)

  ## Analysis
  Adjusted penalty for missing schema from -10 to -15.
  Re-test showed improvement to 19/20.
  ```

**Time**: 8 hours
**BLOCKER**: **This must pass before moving to Week 2**. If not passing, debug + adjust algorithm.

---

## End of Week 1 Checklist

### Code Quality
- [ ] All TypeScript types defined (no `any`)
- [ ] No console.log spam (use logging library)
- [ ] ESLint passing: `npm run lint`
- [ ] Type checking passing: `npm run type-check`
- [ ] Unit tests passing: `npm run test`
- [ ] Scoring validation passing: `npm run test:scoring` (18/20)

### Documentation
- [ ] Code has inline comments explaining each scoring check
- [ ] README.md has "Getting Started" section with:
  - [ ] How to set up `.env`
  - [ ] How to run migrations
  - [ ] How to start dev server
  - [ ] How to run tests
  - [ ] How to run validation harness
- [ ] `.env.example` documents all required variables

### Deployment Prep
- [ ] Database migrations tested (RDS)
- [ ] Redis connectivity verified (ElastiCache)
- [ ] Lambda package size estimated (<50MB)
- [ ] Environment variables ready for AWS Lambda

### Before Moving to Week 2
- [ ] Git repo pushed to main branch
- [ ] CI/CD pipeline passing (GitHub Actions)
- [ ] Scoring validation passing (18/20 websites within ±10 points)
- [ ] Zero ambiguity in code — ready for handoff

---

## Files Created This Week

```
src/
├── index.ts                    (Express app entry point)
├── services/
│   ├── scorer.ts              (scoring algorithm)
│   ├── scorer.test.ts         (unit tests)
│   ├── crawler.ts             (HTML fetching + parsing)
│   └── cache.ts               (Redis + DB fallback)
├── routes/
│   └── analyze.ts             (`/api/analyze` endpoint)
├── middleware/
│   └── rateLimiter.ts         (rate-limiting logic)
└── utils/
    ├── validators.ts          (URL validation)
    └── hasher.ts              (SHA256 hashing)

prisma/
├── schema.prisma              (database schema)
└── migrations/
    └── 001_initial.sql        (initial tables)

tests/
├── scoring-validation.test.ts (20-website test)
├── test-websites.json         (test data)
└── scoring-validation-results.md (results)

.github/workflows/
└── ci.yml                     (GitHub Actions)

.gitignore
tsconfig.json
package.json
.env.example
README.md
```

---

## Known Risks (Mitigate Before Week 2)

1. **Redis failover**: Implement circuit breaker if Redis is flaky
2. **Slow sites**: Some sites might timeout (>10s). Log them, adjust timeout if needed
3. **Redirects**: Some sites have redirect loops. Test manually first
4. **SPA scoring**: SPAs without schema will score low (30-50). This is expected + documented

---

## Time Budget

| Task | Estimated | Actual | Notes |
|------|-----------|--------|-------|
| Day 1-2 (Setup) | 8h | ? | |
| Day 3-4 (Database) | 6h | ? | |
| Day 5 (Scoring) | 8h | ? | |
| Day 6-7 (API) | 12h | ? | |
| Day 7 (Validation) | 8h | ? | **CRITICAL BLOCKER** |
| **Total** | **42 hours** | ? | ~6-7 days if 6h/day |

---

**Status**: Ready for Week 1
**Next**: Week 2 is Frontend + Lead Form
**Blocker**: Scoring validation test MUST pass before Week 2

Good luck! 🚀
