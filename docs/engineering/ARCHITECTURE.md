# AIScore - Architecture & Tech Stack Decision

**Date**: 2026-03-26
**Status**: Ready for Phase 1 Implementation
**Timeline**: 4 weeks

---

## Technology Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js (lightweight, battle-tested for this use case)
- **Language**: TypeScript (type safety, better debugging)

**Rationale**: Express is perfect for this MVP—minimal boilerplate, excellent middleware ecosystem, and you prefer Node. Easy to scale if needed.

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite (faster dev server than Create React App, better build performance)
- **State Management**: Context API + React Hooks (sufficient for Phase 1; not complex enough for Redux)
- **CSS**: Tailwind CSS (rapid styling, consistent design system, minimal CSS to ship)

**Rationale**: React aligns with your preference. Vite is faster for local dev. Tailwind keeps CSS footprint small and designs consistent.

### Database
- **Primary**: PostgreSQL 14+ (hosted on AWS RDS)
- **Justification**:
  - Relational data (checks, leads, rate-limits)
  - Strong ACID guarantees (financial accuracy, no double-counting leads)
  - Excellent JSON support (issues stored as JSONB)
  - Scales well up to 10M+ records
  - Managed service (RDS) = minimal ops overhead
  - Cost-effective at 1000 checks/day scale

**Alternative considered**: MySQL (compatible, slightly cheaper) — but PostgreSQL's JSONB + window functions are more powerful for analytics.

### Cache Layer
- **Technology**: Redis (AWS ElastiCache)
- **Configuration**: cache.t3.micro ($20-30/mo, 512MB)
- **Strategy**:
  - Primary: 24-hour TTL for domain-based cache
  - Fallback: 7-day DB cache (if Redis down)
  - Key format: `check:${domain_normalized}:v1` (version tag for cache-busting)

**Rationale**: Redis is the industry standard. ElastiCache is managed, no ops overhead. 512MB handles 50K+ cached results easily.

### Hosting & Deployment
- **Compute**: AWS Lambda + API Gateway
- **Database**: AWS RDS PostgreSQL (t3.micro starter, auto-scaling CPU)
- **Cache**: AWS ElastiCache Redis (managed)
- **Static Assets**: CloudFront CDN
- **Storage**: S3 (for email confirmations, future exports)
- **CI/CD**: GitHub Actions (free, integrated with repo)

**Rationale**:
- Lambda scales automatically (no server management)
- Pay-per-request model matches bursty traffic pattern
- Integrated AWS ecosystem (RDS, ElastiCache, CloudFront)
- Easy regional expansion if needed

**Cost estimate**: $155-320/mo at 1000 checks/day (see breakdown below).

### Monitoring & Logging (FREE TOOLS)
- **Logs**: CloudWatch (AWS native, free tier included)
- **Metrics**: CloudWatch + basic dashboards (free)
- **Uptime**: Pingdom free tier or AWS Health Dashboard
- **Error tracking**: Sentry free tier (10K events/month, sufficient for Phase 1)

**Rationale**: Minimal ops cost, tight AWS integration. Upgrade to Datadog/New Relic only if traffic scales past 10K checks/day.

### i18n Implementation
- **Library**: i18next (industry standard for React)
- **Translation management**: JSON files in `/src/locales/{lang}/translation.json`
- **Auto-detection**: Browser + GeoIP (MaxMind free tier or AWS native GeoIP headers)
- **Manual override**: Language selector in top-right (persisted to localStorage)

**Rationale**: i18next is proven, widely used, minimal bundle size (~15KB). JSON-based is simple to manage and version control.

---

## Data Flow

```
User Browser
    ↓
    ├─→ POST /api/analyze {url}
    ↓
API Gateway + Lambda
    ↓
    ├─→ Check cache (Redis) → Hit? Return cached result
    ├─→ Check rate-limit (Redis) → Exceeded? Return 429
    ├─→ Fetch website (Node HTTP client)
    ├─→ Parse HTML (Cheerio)
    ├─→ Score (in-memory algorithm)
    ├─→ Store in DB (RDS PostgreSQL)
    ├─→ Cache result (ElastiCache Redis, 24h TTL)
    └─→ Return response
    ↓
Frontend
    ├─→ Display score + dimensions + issues
    ├─→ Show "Last analyzed: X hours ago"
    ├─→ Show lead form (name, email, phone)
    ↓
User submits form
    ↓
    ├─→ POST /api/leads {name, email, phone, check_id}
    ├─→ Check rate-limit (form submission, 5/day per IP)
    ├─→ Validate email format + domain
    ├─→ Validate phone format (libphonenumber, strict)
    ├─→ Insert into leads table
    ├─→ Send confirmation email (SendGrid)
    └─→ Return success
```

---

## Database Schema (PostgreSQL)

### checks table
```sql
CREATE TABLE checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL,
  url_hash VARCHAR(64) NOT NULL UNIQUE,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  crawlability_score INT NOT NULL,
  content_score INT NOT NULL,
  technical_score INT NOT NULL,
  quality_score INT NOT NULL,
  issues JSONB NOT NULL DEFAULT '[]',
  checked_at TIMESTAMP NOT NULL DEFAULT now(),
  cached_until TIMESTAMP NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  fallback_until TIMESTAMP NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  ip_hash VARCHAR(64) NOT NULL,
  user_agent TEXT,
  language_detected VARCHAR(10),

  created_at TIMESTAMP NOT NULL DEFAULT now(),
  INDEX idx_domain (domain),
  INDEX idx_cached_until (cached_until),
  INDEX idx_ip_hash (ip_hash)
);
```

### leads table
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID NOT NULL REFERENCES checks(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE(check_id, email),
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
);
```

### rate_limits table
```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL UNIQUE,
  count INT NOT NULL DEFAULT 1,
  reset_at TIMESTAMP NOT NULL,

  INDEX idx_reset_at (reset_at)
);
```

---

## API Design

### POST /api/analyze
**Request**:
```json
{
  "url": "https://example.com",
  "force_refresh": false
}
```

**Response (200 OK)**:
```json
{
  "check_id": "550e8400-e29b-41d4-a716-446655440000",
  "score": 72,
  "dimensions": {
    "crawlability": 28,
    "content": 24,
    "technical": 15,
    "quality": 5
  },
  "issues": ["metadata_optimization", "structured_data_missing"],
  "cached": false,
  "checked_at": "2026-03-26T10:00:00Z",
  "cached_until": "2026-03-27T10:00:00Z",
  "fallback_until": "2026-04-02T10:00:00Z"
}
```

**Response (429 Rate Limited)**:
```json
{
  "error": "rate_limit_exceeded",
  "message": "You've reached 50 checks today. Try again tomorrow.",
  "retry_after": 86400
}
```

### POST /api/leads
**Request**:
```json
{
  "check_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-1234"
}
```

**Phone Validation**: Uses libphonenumber library (Google's international phone parser). Validates format and number validity strictly. Returns 400 if invalid.

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Thank you! We'll follow up soon.",
  "lead_id": "660f9511-f40c-52e5-b827-557766551111"
}
```

---

## Cost Breakdown (1000 checks/day)

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| Lambda (compute) | $40 | 1000 checks × 10s avg = 10K compute seconds/day ≈ $40/mo |
| RDS PostgreSQL (t3.micro) | $25 | Managed database, 100GB storage |
| ElastiCache Redis | $25 | cache.t3.micro, 512MB |
| CloudFront (CDN) | $15 | Static assets (JS, CSS) |
| SendGrid (email) | $15 | 10K emails/month (1000 checks × 10 emails) |
| Monitoring (free) | $0 | CloudWatch + Sentry free tier |
| Data transfer | $5 | Egress from AWS |
| **Total** | **$125/month** | Aggressive estimate = **$0.004/check** |

**Conservative estimate** (with overhead): **$155-320/month = $0.01/check average**

---

## Scaling Path

| Milestone | Checks/Day | Action Items |
|-----------|-----------|--------------|
| **Week 4** | 500-1000 | Monitor costs, validate cache hit rate >40% |
| **Month 2** | 2000-5000 | Consider RDS read replicas if CPU >80%, increase Redis to cache.t3.small |
| **Month 3** | 5000-10000 | Evaluate Lambda concurrency; consider ECS Fargate for sustained load |
| **Month 6** | 10000+ | Migrate to ECS/Kubernetes for better cost efficiency at scale |

---

## Security & Compliance

### Input Validation
- URL format validation (HTTP/HTTPS only, valid domain)
- Rate-limit checking before processing
- Email format validation in lead form
- SQL injection prevention (parameterized queries, Prisma ORM)
- XSS prevention (React auto-escaping, Content-Security-Policy headers)

### Rate-Limiting Strategy
- **Layer 1**: IP-based (50 checks/day) — prevents individual DOS
- **Layer 2**: Form submission (5 leads/day per IP) — prevents spam
- Redis keys: `ratelimit:ip:{ip_hash}:checks` and `ratelimit:ip:{ip_hash}:leads`
- Auto-reset at UTC midnight

### Privacy & Data Protection
- IP hashing (SHA256) for privacy
- Email stored as plaintext in DB (Phase 1; encryption in Phase 2)
- HTTPS enforced (CloudFront + API Gateway)
- No third-party tracking or ads
- GDPR-compliant (export/delete data on request)

### Deployment Security
- Environment variables for secrets (API keys, DB credentials)
- No secrets in code or version control
- CloudFront blocks direct RDS access (security groups)
- Lambda execution role with minimal permissions

---

## Development Environment Setup

```bash
# Node.js 18+, npm/yarn

# Backend
npm install express typescript ts-node cors dotenv
npm install --save-dev @types/express @types/node

# Database
npm install pg prisma @prisma/client
npx prisma init

# Cache & Rate-Limiting
npm install redis ioredis

# Phone Validation
npm install libphonenumber-js

# Utilities
npm install cheerio axios lodash
npm install --save-dev nodemon

# Frontend
npm create vite@latest aiscore-frontend -- --template react-ts
cd aiscore-frontend
npm install react-router-dom axios i18next react-i18next
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## Deployment Pipeline (GitHub Actions)

1. **On PR**: Lint + Unit Tests + Type Check
2. **On Merge to Main**: Build + Deploy to Lambda + RDS migrations
3. **Monitoring**: CloudWatch alerts on errors, latency >3s, 429 rate-limit spikes

---

## Key Decisions Rationale

| Decision | Why |
|----------|-----|
| Node.js + Express | Lightweight, fast iteration, your preference |
| React + Vite | Your preference, fast dev experience |
| PostgreSQL | ACID guarantees for financial accuracy, JSONB for issues |
| ElastiCache Redis | Managed, easy scaling, cost-effective |
| Lambda | Auto-scaling, pay-per-request, minimal ops |
| CloudWatch + Sentry free | No ops overhead, sufficient for Phase 1 |
| 24h primary + 7d fallback cache | Balance freshness (avoid attacks), cost savings, resilience |
| i18next | Industry standard, minimal bundle size |

---

**Document Version**: 1.0
**Status**: Ready for Implementation Planning
**Next Step**: Create IMPLEMENTATION_PLAN.md (4-week breakdown)
