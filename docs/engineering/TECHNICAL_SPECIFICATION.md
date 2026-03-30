# AIScore - Technical Specification Supplement

This document complements the PRD with technical specifics for the staff engineer to reference during implementation planning.

---

## 1. Scoring Algorithm (Reference Implementation)

```pseudocode
function analyzeWebsite(url: string): AnalysisResult {
  // Fetch page + robots.txt + sitemap in parallel (3 concurrent HTTP requests)
  const origin = new URL(url).origin
  const [html, robotsTxt, sitemap] = await Promise.all([
    fetch(url, timeout: 10s),
    fetch(origin + '/robots.txt', timeout: 5s),
    fetch(origin + '/sitemap.xml', timeout: 5s, maxSize: 500KB)
  ])

  const dom = parse(html)
  const bodyText = extractText(dom)   // strips <script>, <style>, <noscript>

  // Initialize scores
  let crawlability = 0      // max 30
  let content = 0           // max 35
  let technical = 0         // max 25
  let quality = 0           // max 10
  const issues = []

  // === CRAWLABILITY (30 points — 6 binary checks × 5 pts) ===
  if (!hasMetaNoindex(dom)) crawlability += 5             // Check 1
  if (!hasMetaNoindex(dom)) crawlability += 5             // Check 2
  if (!hasMetaNofollow(dom)) crawlability += 5            // Check 3
  if (!requiresAuth(html)) crawlability += 5              // Check 4
  if (responseTime < 10s && redirectCount <= 5) crawlability += 5  // Check 5
  // Check 6: real sitemap check (not just HTML link)
  if (sitemap.status == 200 || robotsTxt.hasSitemapDirective() || dom.has('link[rel=sitemap]'))
    crawlability += 5
  else issues.push("crawlability_issues")

  // === CONTENT STRUCTURE (35 points) ===
  if (hasSemanticHTML(dom)) content += 4
  if (hasMetaDescription(dom) && length in [50,160]) content += 4
  if (hasTitle(dom) && length in [30,60]) content += 4
  if (hasOpenGraphTags(dom)) content += 4
  if (hasJSONLDSchema(dom)) { content += 5 } else { issues.push("structured_data_missing") }
  if (hasPublicationDate(dom)) content += 4
  if (hasMobileViewport(dom)) content += 4
  if (hasLanguageTag(dom)) content += 2

  // === TECHNICAL SEO (25 points) ===
  if (hasCanonicalTag(dom)) technical += 5
  if (url.startsWith("https")) technical += 5
  if (queryParamCount(url) < 3) technical += 5
  if (responseTime < 3s) technical += 5
  if (bodyText.length > 200) technical += 5

  // === CONTENT QUALITY (10 points) ===
  if (bodyText.length > 300) quality += 5
  if (internalLinkCount(dom) > 2) quality += 5

  // === PENALTIES ===
  let baseScore = crawlability + content + technical + quality

  if (hasMetaNoindex(dom) || requiresAuth(html)) {
    baseScore = max(0, baseScore - 30)
    issues.push("blocked_from_crawlers")
  } else if (responseStatus != 200) {
    baseScore = max(0, baseScore - 25)
    issues.push("not_publicly_accessible")
  }

  if (redirectCount > 5 || responseTime > 10s) {
    baseScore = max(0, baseScore - 15)
    issues.push("access_or_speed_issues")
  }

  // NEW: AI crawler-specific penalty
  if (robotsTxt.blocksGPTBot() || robotsTxt.blocksClaudeBot() || robotsTxt.blocksPerplexityBot()) {
    baseScore = max(0, baseScore - 20)
    issues.push("ai_crawlers_blocked")
  } else if (robotsTxt.blocksAllUserAgents()) {
    baseScore = max(0, baseScore - 20)
    issues.push("ai_crawlers_blocked")
  }

  // === SUMMARY EXTRACTION ===
  // Extract a plain-language description of the site (no AI call)
  const summary =
    metaDescription(dom) ||        // priority 1: meta description
    ogDescription(dom) ||          // priority 2: og:description
    firstMeaningfulParagraph(dom) || // priority 3: first <p> >= 80 chars
    bodyText.slice(0, 250)          // fallback: first 250 chars of body text

  return {
    score: min(100, baseScore),
    dimensions: { crawlability, content, technical, quality },
    issues: dedup(issues),
    summary,
    checked_at: now(),
    expires_at: now() + 7.days
  }
}
```

**Notes**:
- All checks are **binary** (0 or full points, no partial credit)
- Penalties apply first, then caps apply
- Issues array is a list of high-level category strings (not prescriptive how-to's)
- Engineer should implement robust error handling for parsing failures

### Issue Keys Reference

| Issue Key | Condition | Effect |
|---|---|---|
| `crawlability_issues` | Sitemap not found via any method | No score penalty (points not awarded) |
| `structured_data_missing` | No JSON-LD schema detected | No score penalty (points not awarded) |
| `blocked_from_crawlers` | `noindex` meta tag or auth required | -30 penalty |
| `not_publicly_accessible` | HTTP response status ≠ 200 | -25 penalty |
| `access_or_speed_issues` | >5 redirects or response time >10s | -15 penalty |
| `ai_crawlers_blocked` | GPTBot, ClaudeBot, or PerplexityBot explicitly blocked in robots.txt (or User-agent: * blocks all) | -20 penalty |

---

## 2. Crawler Architecture

Each `/api/analyze` request makes **3 parallel HTTP fetches** (no sequential waiting):

| Request | URL | Timeout | Purpose |
|---|---|---|---|
| Page | `{url}` | 10s | Full HTML for scoring |
| robots.txt | `{origin}/robots.txt` | 5s | AI bot blocking rules + Sitemap directives |
| sitemap.xml | `{origin}/sitemap.xml` | 5s | Existence check + URL count (capped 500KB) |

**robots.txt parsing** identifies:
- `blocksAllCrawlers`: `User-agent: *` with `Disallow: /`
- `blocksAiCrawlers`: Any of `GPTBot`, `ClaudeBot`, `PerplexityBot`, `anthropic-ai`, `cohere-ai` with `Disallow: /`
- `sitemapUrls`: All `Sitemap:` directive values

**sitemap.xml parsing**: counts `<loc>` elements to get declared URL count. Failure is non-fatal — treated as `{ exists: false, urlCount: 0 }`.

**Summary extraction** (no AI, no extra fetch):
1. `<meta name="description">` content if ≥ 40 chars
2. `<meta property="og:description">` if ≥ 40 chars
3. First `<p>` element with ≥ 80 chars of text (truncated to 300)
4. First 250 chars of visible body text

---

## 1.5 Phase 1 Known Limitations & Validation Testing

**JavaScript Execution**:
- Phase 1 uses HTTP + HTML parsing only (no JavaScript execution)
- Sites heavily dependent on client-side rendering (React SPAs, Vue apps, etc.) will appear less AI-friendly because dynamic content isn't visible to the parser
- **Workaround for users**: Add JSON-LD schema markup to HTML `<head>` (static, executable without JS) to signal content structure to crawlers
- **Phase 3 upgrade**: JS rendering will be added for more accurate analysis of dynamic sites
- **Impact on score**: SPAs scoring low in Phase 1 can still improve by adding proper metadata, schema, and robots.txt configuration

**Example**: A React app with rich content but minimal HTML will score ~40/100 in Phase 1 (no visible content for crawlers). Adding schema.org markup in the HTML head would boost the score to ~70/100 without changing the app itself.

### Scoring Validation Test Harness (CRITICAL PHASE 1 DELIVERABLE)

**By end of Week 1**, engineer must create and validate a **scoring test suite** with 20+ real websites:

**Test Website Categories**:
1. **Static Content Sites** (5 sites): Blogs, documentation, news sites
   - Expected score range: 75-92/100
   - Examples: Medium.com articles, dev blogs, news sites
2. **SPAs without Schema** (3 sites): React/Vue apps with minimal HTML
   - Expected score range: 30-50/100
   - Examples: Figma, Notion, similar web apps
3. **SPAs with Schema** (2 sites): React/Vue apps with JSON-LD markup
   - Expected score range: 65-85/100
   - Examples: sites that properly implement schema
4. **E-commerce Sites** (3 sites): Product pages, category listings
   - Expected score range: 70-88/100
   - Examples: Shopify, WooCommerce sites
5. **Media/Entertainment** (3 sites): Video platforms, news outlets
   - Expected score range: 60-85/100
6. **Problematic Sites** (4 sites): Auth walls, noindex, slow sites
   - Expected score range: 0-40/100
   - Examples: paywall sites, API endpoints, intentionally broken sites

**Validation Process**:
- [ ] Engineer manually analyzes all 20 sites (score them "by hand" using the algorithm)
- [ ] Engineer runs AIScore on all 20 sites
- [ ] Compare actual vs. expected scores
- [ ] **Tolerance**: Actual score must fall within ±10 points of expected range
- [ ] Document any anomalies (e.g., "Site X scored 55 but expected 70-85" → investigate why)
- [ ] Create test suite in codebase: `tests/scoring-validation/websites.json`
  ```json
  {
    "url": "https://medium.com/some-article",
    "category": "static_content",
    "expected_score_min": 75,
    "expected_score_max": 92,
    "crawlability_expected": 28,
    "content_expected": 32,
    "technical_expected": 23,
    "quality_expected": 9,
    "notes": "Well-structured article with metadata"
  }
  ```
- [ ] Run automated test: `npm run test:scoring-validation` confirms all sites score within tolerance
- [ ] **Gate**: Cannot deploy Phase 1 without passing 18/20 sites (90% accuracy)

**Why This Matters**:
- Catches algorithm bugs early (Week 1 vs. Week 3 is huge)
- Validates that penalties work correctly
- Builds confidence in scoring accuracy before launch
- Provides real-world data for marketing ("Tested on 20+ real websites")
- Identifies Phase 1 limitations clearly (e.g., "SPAs score 20% lower without schema")

---

## 2. Database Schema (SQL)

```sql
-- Checks table (immutable, audit trail)
CREATE TABLE checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL,  -- normalized: example.com (no www, lowercase)
  url_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA256(full_url) for dedup
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  crawlability_score INT NOT NULL CHECK (crawlability_score >= 0 AND crawlability_score <= 30),
  content_score INT NOT NULL CHECK (content_score >= 0 AND content_score <= 35),
  technical_score INT NOT NULL CHECK (technical_score >= 0 AND technical_score <= 25),
  quality_score INT NOT NULL CHECK (quality_score >= 0 AND quality_score <= 10),
  issues JSONB NOT NULL DEFAULT '[]',  -- ["metadata_optimization", "structured_data_missing", ...]
  checked_at TIMESTAMP NOT NULL DEFAULT now(),
  cached_at TIMESTAMP NOT NULL DEFAULT now(),
  expires_at TIMESTAMP NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  ip_hash VARCHAR(64) NOT NULL,  -- SHA256(IP) for rate-limit, privacy
  user_agent TEXT,
  language_detected VARCHAR(10),  -- "en", "fr", "es", etc.
  referrer_source VARCHAR(255),  -- source of traffic (marketing utm, direct, etc.)

  CREATED_AT TIMESTAMP NOT NULL DEFAULT now(),
  INDEX idx_domain (domain),
  INDEX idx_expires_at (expires_at),  -- for cache expiration queries
  INDEX idx_ip_hash (ip_hash)  -- for rate-limiting
);

-- Leads table (sales funnel tracking)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID NOT NULL REFERENCES checks(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,  -- website owner company or domain
  phone VARCHAR(20),
  budget_range VARCHAR(50),  -- e.g., "$5K-10K", "$10K-50K"
  timeline VARCHAR(50),  -- e.g., "Next 30 days", "Q2 2026"
  cto_status VARCHAR(50) NOT NULL DEFAULT 'new',  -- "new", "contacted", "qualified", "converted"
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now() ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE (check_id, email),  -- prevent duplicate submissions
  INDEX idx_email (email),  -- for CRM dedup
  INDEX idx_cto_status (cto_status),  -- for sales tracking
  INDEX idx_created_at (created_at)  -- for daily reports
);

-- Rate-limiting helper (TTL-based, auto-cleanup via Redis preferred)
-- Falls back to DB if Redis unavailable
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL UNIQUE,  -- "ip:{ip_hash}" or "domain:{domain}" or "form:{ip_hash}"
  count INT NOT NULL DEFAULT 1,
  expires_at TIMESTAMP NOT NULL,  -- DELETE rows WHERE expires_at < now()

  INDEX idx_expires_at (expires_at)
);
```

**Design Notes**:
- `checks` is immutable (append-only audit log)
- `url_hash` prevents duplicate analysis of same URL
- `expires_at` tracks cache validity; engineer can cleanup with `DELETE FROM checks WHERE expires_at < now()`
- `ip_hash` and `email` indexed for rate-limit queries and dedup
- `cto_status` tracks sales funnel for analytics
- Use Redis for rate-limiting in production; falls back to DB for simplicity in MVP

---

## 3. Cache Logic (Pseudocode)

```pseudocode
function getOrAnalyzeWebsite(url: string, forceRefresh: bool = false): AnalysisResult {
  const domain = normalizeDomain(url)
  const urlHash = sha256(url)

  if (!forceRefresh) {
    // Try cache (Redis first, then DB)
    const cached = redis.get(`checks:${domain}`)
    if (cached && cached.expires_at > now()) {
      return {
        ...cached,
        cached: true,
        check_id: cached.id
      }
    }
  }

  // Cache miss or force refresh: analyze fresh
  const result = analyzeWebsite(url)

  // Store in DB
  const checkId = db.insert('checks', {
    domain: domain,
    url_hash: urlHash,
    score: result.score,
    crawlability_score: result.dimensions.crawlability,
    content_score: result.dimensions.content,
    technical_score: result.dimensions.technical,
    quality_score: result.dimensions.quality,
    issues: result.issues,
    checked_at: now(),
    expires_at: now() + 7.days,
    ip_hash: sha256(request.ip),
    user_agent: request.user_agent,
    language_detected: detectLanguage(request),
    referrer_source: request.referrer
  })

  // Cache in Redis with TTL
  redis.setex(`checks:${domain}`, 604800, {  // 7 days
    id: checkId,
    ...result,
    expires_at: now() + 7.days
  })

  return {
    ...result,
    cached: false,
    check_id: checkId
  }
}

// Stale-while-revalidate: background refresh after 80% of TTL
function backgroundRefreshIfStale(domain: string) {
  const cached = redis.get(`checks:${domain}`)
  if (!cached) return  // not in cache

  const age = now() - cached.checked_at
  const ttl = 604800  // 7 days

  if (age > ttl * 0.8) {  // 80% of 7 days = 5.6 days
    // Queue background job: re-analyze this domain
    queue.enqueue({
      type: 'refresh_check',
      domain: domain,
      url: cached.original_url
    })
  }
}
```

**Implementation Notes**:
- Redis is **primary** cache (fast, auto-expiry)
- DB is **secondary** cache & audit trail
- Use Redis sorted set for expiration tracking: `redis.zadd('checks:expiring', score=expires_at, member=domain)`
- Background job queue (Bull, Celery, etc.) handles stale-while-revalidate refresh
- If Redis is down, fall back to DB for cache reads (slower but functional)

---

## 4. Rate-Limiting Implementation

```pseudocode
// Middleware for /api/analyze
function analyzeRateLimitMiddleware(req, res, next) {
  const ipHash = sha256(req.ip)
  const domain = normalizeDomain(req.body.url)

  // Check Layer 1: IP limit
  const ipLimit = 50
  const ipCount = redis.incr(`ratelimit:ip:${ipHash}`)
  redis.expire(`ratelimit:ip:${ipHash}`, 86400)  // reset daily

  if (ipCount > ipLimit) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      message: "You've reached 50 checks today. Try again tomorrow."
    }).set('Retry-After', 86400)
  }

  // Check Layer 2: Domain limit
  const domainLimit = 100
  const domainCount = redis.incr(`ratelimit:domain:${domain}`)
  redis.expire(`ratelimit:domain:${domain}`, 86400)

  if (domainCount > domainLimit) {
    return res.status(429).json({
      error: "Domain limit exceeded",
      message: `This website has been checked 100 times today. Try again tomorrow.`
    }).set('Retry-After', 86400)
  }

  next()
}

// Middleware for /api/leads
function leadsRateLimitMiddleware(req, res, next) {
  const ipHash = sha256(req.ip)

  // Check Layer 3: Form submission limit
  const formLimit = 3
  const formCount = redis.incr(`ratelimit:form:${ipHash}`)
  redis.expire(`ratelimit:form:${ipHash}`, 86400)

  if (formCount > formLimit) {
    return res.status(429).json({
      error: "Too many submissions",
      message: "You've submitted 3 times today. Check your email for a response."
    }).set('Retry-After', 86400)
  }

  next()
}

// CRM Integration (Phase 1: Zapier Webhook)
function onLeadSubmitted(lead: Lead) {
  // Phase 1 approach: Simple webhook to Zapier for flexible routing
  // Zapier handles: duplicate detection, CRM sync, email notifications

  const payload = {
    name: lead.name,
    email: lead.email,
    company: lead.company,
    phone: lead.phone || null,
    budget_range: lead.budget_range || null,
    timeline: lead.timeline || null,
    check_id: lead.check_id,
    score: lead.check.score,
    issues: lead.check.issues,
    analyzed_url: lead.check.domain,
    submitted_at: new Date().toISOString()
  }

  // POST to Zapier webhook (configured in env vars)
  fetch(process.env.ZAPIER_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .catch(err => {
    // Log error but don't fail the response (user has already submitted)
    console.error('Zapier webhook failed:', err)
  })
}
```

**CRM Strategy for Phase 1**:
- **No direct CRM integration initially**. Use Zapier webhook (simple, flexible, low-ops)
- Zapier routes leads to email, Slack, HubSpot, Pipedrive, or custom destination
- **Phase 2**: Build direct API integration if volume warrants (100+ leads/day)
- **Lead capture goal**: Volume over immediate monetization; focus on collecting quality leads
- Email confirmation sent immediately to user (manages expectations, confirms receipt)
- Sales team responds within 24 hours with initial consultation offer

// Alert threshold
function monitorRateLimitAbuse() {
  // Count violations in last hour
  const violationCount = redis.zcount('ratelimit:violations', now() - 3600, now())

  if (violationCount > 500) {
    // Likely attack: alert ops team
    sendAlert('Rate limit spike detected: ' + violationCount + ' violations/hour')
  }
}
```

**Notes**:
- Use Redis `INCR` + `EXPIRE` for automatic daily reset (not manual)
- Return `Retry-After: 86400` (seconds until midnight UTC) for user-friendly response
- Log all violations for abuse pattern detection
- Consider IP geolocation (GeoIP) to detect datacenter IPs and block proactively

---

## 5. Deployment & Cost Targets

### Infrastructure

| Component | Technology | Cost/mo | Notes |
|-----------|-----------|---------|-------|
| **Web Server** | AWS Lambda + API Gateway | $30-50 | Auto-scaling, pay-per-request |
| **Database** | RDS PostgreSQL (t3.micro) | $15-30 | 100GB storage, < 100 concurrent connections |
| **Cache** | ElastiCache Redis (cache.t3.micro) | $20-30 | 512MB, auto-failover |
| **Crawling** | Lambda functions | $50-100 | 1000 checks/day @ 10s each |
| **CDN** | CloudFront | $10-20 | Static assets, global distribution |
| **Email** | SendGrid | $10-20 | 10K emails/month |
| **Monitoring** | CloudWatch + Datadog free tier | $0-50 | Logs, metrics, alerts |
| **DNS** | Route 53 | $0.50 | Minimal |
| **Backup & Ops** | AWS Backup | $10-20 | Daily snapshots |
| **Total** | | **$155-320/mo** | |

**Per-Check Cost Breakdown**:
- 1000 checks/day = 30,000 checks/month
- Total cost: $300/month → **$0.01 per check**
- With 50% cache hits: avg cost = $0.005 per check

### Scaling Targets

| Metric | Target | Cost Impact |
|--------|--------|------------|
| 1K checks/day | $10/day | Baseline (above) |
| 10K checks/day | $50-70/day | Lambda scaling, needs larger RDS |
| 100K checks/day | $500-800/day | RDS read replicas, bigger Redis, dedicated crawlers |

**Recommendation**: Start on AWS Lambda (minimal ops), migrate to containers (ECS/Kubernetes) at 10K+ checks/day.

---

## 6. API Response Examples

### AnalyzeResponse Type

```typescript
interface AnalyzeResponse {
  score: number                          // 0–100
  dimensions: {
    crawlability: number                 // 0–30
    content: number                      // 0–35
    technical: number                    // 0–25
    quality: number                      // 0–10
  }
  issues: string[]                       // e.g. ["structured_data_missing", "ai_crawlers_blocked"]
  summary?: string                       // Plain-language description of what the site is about
  cached: boolean
  checked_at: string                     // ISO 8601
  expires_at: string                     // ISO 8601
  check_id?: string                      // UUID (omitted on cache hits)
  cache_hit?: string                     // Human-readable freshness note (on cache hits)
}
```

### Success: Fresh Check
```json
POST /api/analyze
{
  "url": "https://example.com",
  "force_refresh": false
}

200 OK
{
  "score": 72,
  "dimensions": {
    "crawlability": 28,
    "content": 24,
    "technical": 15,
    "quality": 5
  },
  "issues": ["metadata_optimization", "structured_data_missing"],
  "summary": "example.com is a platform for developers to read, write, and collaborate on technical articles.",
  "cached": false,
  "checked_at": "2026-03-26T10:00:00Z",
  "expires_at": "2026-04-02T10:00:00Z",
  "check_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Success: Cached Check
```json
200 OK
{
  "score": 72,
  "dimensions": { ... },
  "issues": [ ... ],
  "cached": true,
  "checked_at": "2026-03-22T14:30:00Z",
  "expires_at": "2026-03-29T14:30:00Z",
  "cache_hit": "Previously analyzed 4 days ago"
}
```

### Rate Limited
```json
429 Too Many Requests
Retry-After: 86400

{
  "error": "rate_limit_exceeded",
  "message": "You've reached 50 checks today. Try again tomorrow."
}
```

### Lead Captured
```json
POST /api/leads
{
  "check_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "john@example.com",
  "company": "example.com",
  "phone": "+1-555-1234",
  "budget_range": "$5K-10K"
}

201 Created
{
  "success": true,
  "message": "Thank you! We'll be in touch within 24 hours.",
  "lead_id": "660f9511-f40c-52e5-b827-557766551111"
}
```

---

## 7. Implementation Checklist for Staff Engineer

- [ ] **Phase 0: Setup** (2 days)
  - [ ] GitHub repo + CI/CD pipeline
  - [ ] Local dev environment (Docker, Node/Python)
  - [ ] Database migrations framework
  - [ ] Logging & observability setup

- [ ] **Phase 1a: Backend API** (5 days)
  - [ ] `/api/analyze` endpoint (HTTP + HTML parsing, scoring logic)
  - [ ] Rate-limiting middleware (Layer 1, 2)
  - [ ] Cache logic (Redis + DB)
  - [ ] Database schema (checks, leads, rate_limits tables)
  - [ ] Error handling & validation
  - [ ] Unit tests (scoring algorithm, rate-limit edge cases)

- [ ] **Phase 1b: Frontend** (4 days)
  - [ ] Homepage (URL input field, clean design)
  - [ ] Results page (score display, dimension breakdown, issue categories)
  - [ ] Lead form (name, email, company fields)
  - [ ] Loading states & error messages
  - [ ] Mobile responsive (Viewport, touch-friendly)

- [ ] **Phase 1c: Ops & Deployment** (2 days)
  - [ ] Deploy to staging (AWS Lambda + RDS)
  - [ ] SSL/HTTPS certificate
  - [ ] Domain setup (DNS, routing)
  - [ ] Monitoring & alerting (cost tracking, errors, rate limits)

- [ ] **Phase 1 QA** (3 days)
  - [ ] Test 20 real websites (edge cases: JS-heavy, JS-free, slow, fast) with validation test harness
  - [ ] Verify scoring accuracy (±10 point tolerance on 18/20 sites)
  - [ ] **Latency Testing**:
    - [ ] API response time: p99 latency <2 seconds for cache hits, <5 seconds for fresh checks
    - [ ] Load test: Simulate 100 concurrent users, verify p99 <3s (if exceeding 3s, architecture review required)
    - [ ] Cache hit rate: Verify >40% hit rate on repeat domains
  - [ ] LLM Crawler Testing:
    - [ ] Verify robots.txt allows GPTBot, Claude-web, Googlebot (test with curl)
    - [ ] Verify sitemap.xml is valid (test with online validators)
    - [ ] Verify results pages have proper og:* tags (test with Open Graph debuggers)
    - [ ] Test that Claude/GPT can crawl AIScore.co and cite our content
  - [ ] Security audit (input validation, SQL injection, XSS, rate-limit enforcement)

---

## 8. Known Unknowns (For Engineer to Decide)

1. **HTTP Client vs. Headless Browser**: Cheerio/jsdom vs. Puppeteer?
   - HTTP client: <1s, $0.001/check, misses JS content
   - Headless browser: ~5s, $0.005/check, sees rendered content
   - **Recommendation**: Start with HTTP client; add JS rendering in Phase 3 if needed

2. **API Versioning**: URL versioning (`/v1/analyze`) or header-based?
   - **Decision**: Staff engineer's call

3. **Frontend Framework**: React, Vue, Svelte, or lightweight vanilla JS?
   - **Decision**: Staff engineer's call based on team skills

4. **Translation i18n**: i18next library or custom JSON approach?
   - **Decision**: Staff engineer's call

5. **CRM Integration**: Zapier webhook or direct API (HubSpot, Salesforce)?
   - **Recommendation**: Webhook to Zapier (Phase 1), direct CRM API (Phase 2)

---

## 9. LLM Crawler Verification (Critical for Phase 1)

Since AIScore's mission is to help sites be "AI-friendly," we must verify that major AI crawlers can actually access and understand AIScore.co itself.

### Phase 1 LLM Crawler Checklist

**By end of Week 3**, engineer must complete:

#### robots.txt Verification
- [ ] Check `/robots.txt` explicitly allows GPTBot, Claude-web, Googlebot
- [ ] Verify correct format:
  ```
  User-agent: GPTBot
  Allow: /
  Crawl-delay: 1

  User-agent: Claude-web
  Allow: /
  Crawl-delay: 1
  ```
- [ ] Test with curl: `curl https://aiscore.co/robots.txt | grep -i "gptbot\|claude"`

#### Sitemap.xml Validation
- [ ] Generate `sitemap.xml` with all public pages (homepage, results pages, blog, etc.)
- [ ] Test validity: https://www.xml-sitemaps.com/ or similar validator
- [ ] Verify robots.txt references sitemap: `Sitemap: https://aiscore.co/sitemap.xml`
- [ ] Test with curl: `curl https://aiscore.co/sitemap.xml`

#### Results Page Crawlability
- [ ] Results pages (`/analysis/{domain-slug}`) must have:
  - [ ] Unique `<title>` tag: "AIScore: {domain} Analysis - 72/100"
  - [ ] Unique `<meta name="description">`: "{domain} scores 72/100 on AI-friendliness. Issues: metadata optimization, structured data missing."
  - [ ] Open Graph tags:
    ```html
    <meta property="og:title" content="AIScore: example.com Analysis - 72/100">
    <meta property="og:description" content="{domain} scores 72/100 on AI-friendliness...">
    <meta property="og:image" content="https://aiscore.co/score-card-72.png">
    <meta property="og:url" content="https://aiscore.co/analysis/example-com?checkId={uuid}">
    <meta property="og:type" content="website">
    ```
  - [ ] Canonical tag: `<link rel="canonical" href="https://aiscore.co/analysis/{domain-slug}">`
  - [ ] **NO `<meta name="robots" content="noindex">`** (results pages should be indexable & crawlable)

#### Manual LLM Crawl Test
- [ ] Test 1: Query Claude: "Is AIScore.co AI-friendly? Check it for me."
  - **Expected result**: Claude uses AIScore API or cites AIScore content with proper score
- [ ] Test 2: Query GPT: "What's my website's AI score? Check example.com."
  - **Expected result**: GPT returns AIScore analysis or directs to AIScore.co
- [ ] Test 3: Search Google: "site:aiscore.co"
  - **Expected result**: Homepage + blog posts + sample analysis pages appear
- [ ] Document results in: `tests/llm-crawler-verification.md`

### Expected Outcomes

**Success Criteria**:
- ✅ robots.txt is valid and welcomes AI crawlers
- ✅ sitemap.xml is valid and linked in robots.txt
- ✅ Results pages are indexable (no noindex tag, proper canonicalization)
- ✅ Open Graph tags render correctly in preview tools
- ✅ Claude/GPT can access and cite AIScore content
- ✅ Google search includes AIScore pages in results

**Why This Matters**:
- If we can't be crawled by LLMs, our credibility is damaged (we can't "walk the walk")
- If results pages aren't indexable, we miss organic traffic from LLM discussions
- If og:* tags are missing, our content doesn't preview correctly when shared
- This is a **blocking requirement for Phase 1 launch**

---

## 10. Results Page Enhancement: Timestamp & Sharing Features

### Results Page UX Improvements (Required for Phase 1)

**Timestamp Display**:
```
Last Analyzed: March 26, 2026 at 10:30 AM (4 days ago)

☐ This result is from our cache. Fresh analysis takes ~10 seconds.
[Refresh Now]
```

**For Cached Results**:
- Show age of cached result (builds transparency, trust)
- Optional: Show "Background refresh is running" if stale-while-revalidate job is queued

**Share Card**:
```
┌─────────────────────────────────┐
│  AIScore: example.com            │
│  AI-Friendliness Score: 72/100   │
│                                   │
│  Issues:                           │
│  • Metadata optimization needed   │
│  • Structured data missing        │
│  • Mobile performance issues      │
│                                   │
│  [Share on LinkedIn] [Share on X] │
└─────────────────────────────────┘
```

**Share Button Pre-Fill Text**:
- LinkedIn: "I just checked my website's AI-friendliness using AIScore. My score: 72/100. How does yours compare? [Check your AI score]"
- X/Twitter: "My website scores 72/100 on AI-friendliness 🤖 Metadata optimization + structured data are next. What's your score? Check here: [link]"

---

## 11. Multilingual Support

The frontend uses **react-i18next** with 6 locale files:

| Code | Language | Notes |
|---|---|---|
| `en` | English | Default |
| `fr` | Français | |
| `de` | Deutsch | |
| `es` | Español | |
| `he` | עברית | RTL — sets `document.dir = 'rtl'` on language switch |
| `ru` | Русский | |

All 6 languages were shipped in Phase 1 (PRD originally planned 4 for Phase 2).

Translation files: `frontend/src/locales/{lang}/translation.json`
Language detection: `localStorage.language` → `navigator.language` → `en`

---

**Document Version**: 1.2
**Last Updated**: 2026-03-29
**Prepared For**: Staff Engineer → Implementation Planning
