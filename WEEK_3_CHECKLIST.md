# AIScore - Week 3 Checklist (Deploy + Test)

**Duration**: 5 work days (~10 hours/day)
**Blocker**: LLM crawler verification must pass before Week 4
**Success**: Live production deployment + performance + security validated

---

## Parallel Execution Overview

```
Day 1: AWS Infrastructure Setup (BLOCKING — all streams depend on this)
       ↓
Day 2-3: PARALLEL STREAMS (can run simultaneously)
  Stream A: Lambda + API Gateway deployment
  Stream B: CloudFront + CDN + Frontend deploy
  Stream C: CloudWatch monitoring + alerting
  Stream D: Performance testing + load testing
Day 4: PARALLEL STREAMS (depend on Day 2-3 completing)
  Stream E: LLM crawler verification (BLOCKER for Week 4)
  Stream F: Security audit
Day 5: Integration fixes + final validation
```

**Dependency Summary**:
- Day 1 must complete before any stream starts
- Streams A+B+C+D are fully independent (run in parallel)
- Stream E (LLM crawlers) requires Stream A to be live
- Stream F (security) requires Streams A+B to be live
- Day 5 fixes depend on Streams E+F results

---

## Day 1: AWS Infrastructure Setup (BLOCKING)

> **All other tasks depend on this. Complete this before starting any stream.**

### RDS PostgreSQL (Production)
- [ ] Launch RDS PostgreSQL 15 t3.micro in `us-east-1`
- [ ] Enable automated backups (7-day retention)
- [ ] Create `aiscore_prod` database
- [ ] Create DB user with least-privilege (no superuser)
- [ ] Security group: allow Lambda only (no public access)
- [ ] Note down: `DATABASE_URL` for Lambda env
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Verify tables exist: `psql -c "\dt"`

### ElastiCache Redis (Production)
- [ ] Launch ElastiCache Redis 7 cache.t3.micro in `us-east-1`
- [ ] Enable in-transit encryption
- [ ] Security group: allow Lambda only (no public access)
- [ ] Note down: `REDIS_URL` for Lambda env
- [ ] Verify connectivity from local with SSH tunnel

### IAM Roles + Policies
- [ ] Create `aiscore-lambda-role` with:
  - [ ] `AWSLambdaVPCAccessExecutionRole`
  - [ ] `CloudWatchLogsFullAccess`
  - [ ] Custom RDS policy (least privilege)
  - [ ] Custom ElastiCache policy (least privilege)
- [ ] Create `aiscore-deploy-role` for CI/CD:
  - [ ] `AWSLambdaFullAccess`
  - [ ] `CloudFrontFullAccess`
  - [ ] `S3FullAccess` (for deployment bucket)

### VPC Configuration
- [ ] Create VPC for Lambda + RDS + Redis (or use default)
- [ ] Create private subnets for Lambda execution
- [ ] Verify Lambda can reach RDS + Redis in same VPC
- [ ] Verify Lambda can reach public internet (for crawling)
  - [ ] Add NAT Gateway if needed

### S3 Buckets
- [ ] Create `aiscore-frontend-prod` bucket (static hosting)
- [ ] Enable static website hosting
- [ ] Block all public access (CloudFront will serve it)
- [ ] Create `aiscore-lambda-deployments` bucket (Lambda zip storage)

### SendGrid Setup
- [ ] Create SendGrid account (free tier: 100 emails/day)
- [ ] Verify sending domain
- [ ] Create API key, add to SSM Parameter Store
- [ ] Test email delivery: `curl -X POST` with API key

**Time**: 6 hours
**Output**: All AWS resources created, env vars ready, migrations applied

---

## Stream A: Lambda + API Gateway Deployment
**Depends on**: Day 1 complete
**Independent of**: Streams B, C, D, F
**Time**: 8 hours (1 engineer)

### Lambda Package Build
- [ ] Add `package.json` build script:
  ```json
  "build:lambda": "tsc && cd dist && zip -r ../lambda.zip . && cd .. && zip -r lambda.zip node_modules"
  ```
- [ ] Verify `dist/` compiles cleanly: `npm run build`
- [ ] Estimate package size: `du -sh lambda.zip` (must be <50MB)
- [ ] If >50MB: add `.lambdaignore` to exclude dev deps

### Lambda Function Setup
- [ ] Create Lambda function `aiscore-api-prod`:
  - [ ] Runtime: Node.js 20.x
  - [ ] Memory: 512MB
  - [ ] Timeout: 30 seconds
  - [ ] VPC: same VPC as RDS + Redis
  - [ ] Role: `aiscore-lambda-role`
- [ ] Upload `lambda.zip` to S3, deploy from S3
- [ ] Set environment variables:
  ```
  DATABASE_URL=postgresql://...
  REDIS_URL=redis://...
  NODE_ENV=production
  PORT=3000
  SENDGRID_API_KEY=...
  ```
- [ ] Configure Lambda handler: `dist/index.handler`

### Lambda Handler Wrapper
- [ ] Install `@vendia/serverless-express`:
  ```bash
  npm install @vendia/serverless-express
  ```
- [ ] Update `src/index.ts` to export handler:
  ```typescript
  import serverlessExpress from '@vendia/serverless-express';
  export const handler = serverlessExpress({ app });
  ```
- [ ] Test locally with `serverless-offline` (optional)

### API Gateway Setup
- [ ] Create REST API: `aiscore-api`
- [ ] Create resource `/{proxy+}` (catch-all)
- [ ] Create method `ANY` → Lambda proxy integration
- [ ] Enable CORS at API Gateway level:
  - [ ] `Access-Control-Allow-Origin: https://aiscore.io`
  - [ ] `Access-Control-Allow-Methods: POST, OPTIONS`
  - [ ] `Access-Control-Allow-Headers: Content-Type`
- [ ] Create `prod` stage, enable access logging
- [ ] Note down: API Gateway URL

### Smoke Test
- [ ] Test `/api/analyze` via API Gateway URL:
  ```bash
  curl -X POST https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"url":"https://example.com"}'
  ```
- [ ] Verify: 200 response with score
- [ ] Verify: DB write confirmed (check RDS)
- [ ] Verify: Redis cache set (check ElastiCache)

### CI/CD Deployment Pipeline
- [ ] Update `.github/workflows/ci.yml`:
  ```yaml
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - run: npm run build:lambda
      - run: aws s3 cp lambda.zip s3://aiscore-lambda-deployments/
      - run: aws lambda update-function-code --function-name aiscore-api-prod --s3-key lambda.zip
  ```
- [ ] Add AWS credentials to GitHub Secrets:
  - [ ] `AWS_ACCESS_KEY_ID`
  - [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] Push to main, verify auto-deploy works

**Output**: Lambda + API Gateway live, CI/CD pipeline deploying on push

---

## Stream B: CloudFront + Frontend Deployment
**Depends on**: Day 1 complete (S3 buckets)
**Independent of**: Streams A, C, D
**Partially depends on**: Stream A (API Gateway URL needed for `VITE_API_URL`)
**Time**: 6 hours (1 engineer)

### Frontend Build Config
- [ ] Create `.env.production`:
  ```
  VITE_API_URL=https://{api-id}.execute-api.us-east-1.amazonaws.com/prod
  VITE_APP_ENV=production
  ```
- [ ] Test production build: `npm run build`
- [ ] Verify `dist/` output size <5MB
- [ ] Verify no `.env` variables leaking into build

### S3 Deployment
- [ ] Upload build to S3:
  ```bash
  aws s3 sync dist/ s3://aiscore-frontend-prod --delete
  ```
- [ ] Set correct content types:
  - `index.html` → `text/html`
  - `*.js` → `application/javascript`
  - `*.css` → `text/css`
- [ ] Set cache headers:
  - `index.html` → `max-age=0, no-cache`
  - `assets/*` → `max-age=31536000, immutable`

### CloudFront Distribution
- [ ] Create CloudFront distribution:
  - [ ] Origin: S3 bucket (using OAC, not public URL)
  - [ ] Default root object: `index.html`
  - [ ] Error pages: 404 → `/index.html` (for React Router)
  - [ ] Cache behaviors:
    - `/api/*` → forward to API Gateway (no cache)
    - `/*` → serve from S3 (cache)
- [ ] Enable HTTPS (use ACM certificate)
- [ ] Configure custom domain (if DNS is ready):
  - [ ] Add CNAME in DNS: `aiscore.io` → CloudFront URL
  - [ ] Wait for DNS propagation

### OG Tags for Social Sharing
- [ ] Verify `index.html` has correct OG tags:
  ```html
  <meta property="og:title" content="AIScore — Check Your Website's AI Readiness" />
  <meta property="og:description" content="Free tool. Score your website..." />
  <meta property="og:image" content="https://aiscore.io/og-image.png" />
  ```
- [ ] Create `og-image.png` (1200x630px, upload to S3)
- [ ] Test sharing on LinkedIn + Twitter using card validators

### CI/CD Frontend Pipeline
- [ ] Add frontend deploy step to GitHub Actions:
  ```yaml
  deploy-frontend:
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - run: npm run build
      - run: aws s3 sync dist/ s3://aiscore-frontend-prod --delete
      - run: aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*"
  ```
- [ ] Add `CF_DISTRIBUTION_ID` to GitHub Secrets

**Output**: Frontend live on CloudFront, auto-deploys on push to main

---

## Stream C: CloudWatch Monitoring + Alerting
**Depends on**: Day 1 complete
**Independent of**: Streams A, B, D (can set up dashboards even before deployment)
**Time**: 5 hours (1 engineer)

### Cost Dashboard
- [ ] Create CloudWatch dashboard `AIScore-Cost-Tracking`:
  - [ ] Widget: Lambda invocations/day
  - [ ] Widget: Lambda duration (avg + p99)
  - [ ] Widget: Lambda errors/hour
  - [ ] Widget: RDS connections active
  - [ ] Widget: ElastiCache hits vs misses
  - [ ] Widget: API Gateway 4xx/5xx rate
- [ ] Enable AWS Cost Explorer with daily granularity
- [ ] Set up billing alert: notify if daily cost >$15

### Performance Dashboard
- [ ] Create CloudWatch dashboard `AIScore-Performance`:
  - [ ] Widget: API latency (p50, p95, p99) by endpoint
  - [ ] Widget: Cache hit rate (calculated from Redis hits/misses)
  - [ ] Widget: Check volume by hour
  - [ ] Widget: Lead submissions per day
  - [ ] Widget: Rate-limit violations per hour

### Log Insights Queries
- [ ] Save these log insight queries:
  ```
  # Slow requests (>3s)
  fields @timestamp, @duration, @message
  | filter @duration > 3000
  | sort @duration desc

  # Error rate by type
  fields @timestamp, errorType, @message
  | filter @message like /ERROR/
  | stats count() by errorType

  # Top domains checked
  fields domain
  | stats count() as checks by domain
  | sort checks desc | limit 20
  ```

### Alerts + Notifications
- [ ] Create SNS topic: `aiscore-alerts`
- [ ] Subscribe dev email to SNS topic
- [ ] Create CloudWatch Alarms:
  - [ ] Lambda error rate >5% for 5 min → alert
  - [ ] Lambda p99 latency >5s → alert
  - [ ] RDS connection count >50 → alert
  - [ ] API Gateway 5xx rate >10% → alert
  - [ ] Daily Lambda cost >$10 → alert

### Structured Logging
- [ ] Verify `src/utils/logger.ts` outputs JSON:
  ```json
  {
    "level": "info",
    "message": "check completed",
    "domain": "example.com",
    "score": 78,
    "duration_ms": 1234,
    "cached": false,
    "timestamp": "2026-03-26T12:00:00Z"
  }
  ```
- [ ] Lambda logs should stream to CloudWatch Logs group `/aws/lambda/aiscore-api-prod`
- [ ] Verify log retention set to 30 days

**Output**: Full observability dashboard live, alerts configured

---

## Stream D: Performance Testing
**Depends on**: Stream A (Lambda must be live)
**Independent of**: Streams B, C, F
**Time**: 6 hours (1 engineer)

> **Note**: Can start basic setup before Stream A is live; run actual tests once Lambda is live.

### Load Testing Setup
- [ ] Install k6: `brew install k6`
- [ ] Create `tests/load/analyze-load-test.js`:
  ```javascript
  import http from 'k6/http';
  import { check, sleep } from 'k6';

  export const options = {
    vus: 100,           // 100 virtual users
    duration: '60s',    // 60-second test
    thresholds: {
      http_req_duration: ['p(99)<3000'],  // p99 < 3s
      http_req_failed: ['rate<0.01'],     // <1% errors
    },
  };

  const TEST_URLS = [
    'https://example.com',
    'https://github.com',
    'https://stripe.com',
    // ... add more for variety
  ];

  export default function() {
    const url = TEST_URLS[Math.floor(Math.random() * TEST_URLS.length)];
    const res = http.post(
      'https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/api/analyze',
      JSON.stringify({ url }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(0.5);
  }
  ```

### Lambda Cold Start Testing
- [ ] Run 10 sequential invocations, measure cold start:
  ```bash
  for i in {1..10}; do
    time curl -X POST {api-url}/api/analyze -d '{"url":"https://example.com"}'
  done
  ```
- [ ] If cold starts >1s: enable Lambda Provisioned Concurrency (1 instance)
- [ ] Document cold start vs warm request latency

### Cache Performance Testing
- [ ] Run same URL 10 times, measure cache hits:
  ```bash
  for i in {1..10}; do
    curl -X POST {api-url}/api/analyze -d '{"url":"https://example.com"}'
  done
  ```
- [ ] Expected: First request ~2-3s, subsequent <200ms
- [ ] Verify Redis cache key set: `redis-cli GET check:example.com:v1`

### Rate-Limit Stress Test
- [ ] Test IP rate-limit (50/day):
  ```bash
  for i in {1..55}; do
    curl -X POST {api-url}/api/analyze -d '{"url":"https://site-$i.com"}'
  done
  ```
- [ ] Verify: requests 51-55 return 429
- [ ] Verify: retry-after header present
- [ ] Verify: rate-limit counter in Redis

### Concurrency Test
- [ ] Run k6 test: `k6 run tests/load/analyze-load-test.js`
- [ ] **Success Criteria**:
  - [ ] p99 latency <3s ✅
  - [ ] Error rate <1% ✅
  - [ ] No Lambda timeouts ✅
  - [ ] No DB connection exhaustion ✅
- [ ] Document results in `tests/load/performance-results.md`

### Cost Per Check Calculation
- [ ] After load test, check CloudWatch cost metrics:
  - Lambda cost: invocations × duration × memory
  - RDS cost: instance hours (always running)
  - Redis cost: instance hours (always running)
  - Data transfer cost: GB transferred
- [ ] Calculate: total cost / total invocations = cost per check
- [ ] **Target**: <$0.01/check
- [ ] Document in `tests/load/cost-analysis.md`

**Output**: Performance results documented, p99 <3s confirmed or issues flagged

---

## Stream E: LLM Crawler Verification (BLOCKER FOR WEEK 4)
**Depends on**: Stream A (Lambda + API must be live), Stream B (CloudFront must be live)
**Independent of**: Streams C, D, F
**Time**: 4 hours (1 engineer)

> **This is a critical blocker. Must pass before Week 4 starts.**

### robots.txt Verification
- [ ] Create `public/robots.txt`:
  ```
  User-agent: *
  Allow: /

  User-agent: GPTBot
  Allow: /

  User-agent: ClaudeBot
  Allow: /

  User-agent: PerplexityBot
  Allow: /

  Sitemap: https://aiscore.io/sitemap.xml
  ```
- [ ] Verify accessible: `curl https://aiscore.io/robots.txt`
- [ ] Test with robots.txt checker: `https://www.google.com/webmasters/tools/robots-testing-tool`

### sitemap.xml Creation
- [ ] Create `public/sitemap.xml`:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://aiscore.io/</loc>
      <changefreq>weekly</changefreq>
      <priority>1.0</priority>
    </url>
  </urlset>
  ```
- [ ] Verify accessible: `curl https://aiscore.io/sitemap.xml`
- [ ] Submit to Google Search Console (if domain ready)

### Open Graph Tags Verification
- [ ] Test OG tags with validators:
  - [ ] LinkedIn Post Inspector: `https://www.linkedin.com/post-inspector/`
  - [ ] Twitter Card Validator: `https://cards-dev.twitter.com/validator`
  - [ ] Facebook Debugger: `https://developers.facebook.com/tools/debug/`
- [ ] All validators should show: title, description, image

### Meta Tags Audit
- [ ] Verify `index.html` has:
  ```html
  <title>AIScore — Check Your Website's AI Readiness</title>
  <meta name="description" content="Free tool to score your website..." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://aiscore.io/" />
  <meta property="og:title" content="..." />
  <meta property="og:description" content="..." />
  <meta property="og:url" content="https://aiscore.io/" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://aiscore.io/og-image.png" />
  ```
- [ ] No noindex meta tag present (that would block AI crawlers)

### JSON-LD Schema for Landing Page
- [ ] Add JSON-LD to `index.html`:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "AIScore",
    "description": "Free website AI-friendliness scoring tool",
    "url": "https://aiscore.io",
    "applicationCategory": "SEO Tool",
    "offers": { "@type": "Offer", "price": "0" }
  }
  ```
- [ ] Validate: `https://validator.schema.org/`

### LLM Crawler Simulation Test
- [ ] Simulate GPTBot crawl (no JS execution):
  ```bash
  curl -A "GPTBot/1.0" https://aiscore.io/ | grep -i "aiscore\|score\|AI"
  ```
  - [ ] Verify meaningful content visible without JS
  - [ ] Verify title + description in HTML source
- [ ] Simulate ClaudeBot:
  ```bash
  curl -A "ClaudeBot/0.5" https://aiscore.io/
  ```
  - [ ] Verify accessible (robots.txt allows ClaudeBot)

**Pass Criteria**:
- [ ] robots.txt allows all major LLM bots
- [ ] sitemap.xml exists + accessible
- [ ] OG tags valid (all 3 validators pass)
- [ ] JSON-LD schema valid
- [ ] Content visible without JS execution

**Output**: LLM crawler verification PASSED or issues documented for Day 5 fix

---

## Stream F: Security Audit
**Depends on**: Streams A + B (both must be live)
**Independent of**: Streams C, D, E
**Time**: 5 hours (1 engineer)

### SQL Injection Testing
- [ ] Test `/api/analyze` with malicious payloads:
  ```bash
  curl -X POST {api-url}/api/analyze \
    -d '{"url":"https://example.com\"; DROP TABLE checks;--"}'
  # Expected: 400 (URL validation rejects)

  curl -X POST {api-url}/api/analyze \
    -d '{"url":"javascript:alert(1)"}'
  # Expected: 400 (URL validation rejects)
  ```
- [ ] Verify Prisma parameterized queries (no string interpolation in SQL)
- [ ] Check all DB queries use Prisma ORM (no raw SQL without parameterization)

### XSS Testing
- [ ] Test lead form:
  ```bash
  curl -X POST {api-url}/api/leads \
    -d '{"name":"<script>alert(1)</script>","email":"test@test.com","phone":"+15551234567","checkId":"..."}'
  # Expected: stored as-is in DB (not executed), but HTML-escaped on display
  ```
- [ ] Verify frontend escapes all user-generated content (React does this by default)
- [ ] Verify no `dangerouslySetInnerHTML` in React components

### Rate-Limit Bypass Testing
- [ ] Test with spoofed IP headers:
  ```bash
  curl -X POST {api-url}/api/analyze \
    -H "X-Forwarded-For: 1.2.3.4" \
    -d '{"url":"https://example.com"}'
  ```
- [ ] Verify: Rate-limit uses real IP (not spoofed via headers)
- [ ] Verify: `X-Forwarded-For` header sanitized properly (take first IP only)

### HTTPS Enforcement
- [ ] Verify HTTP → HTTPS redirect:
  ```bash
  curl -I http://aiscore.io/
  # Expected: 301 redirect to https://
  ```
- [ ] Verify HSTS header: `Strict-Transport-Security: max-age=31536000`

### Security Headers Audit
- [ ] Add security headers to CloudFront response headers policy:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  ```
- [ ] Test with: `https://securityheaders.com/?q=aiscore.io`

### Secrets Audit
- [ ] Verify no secrets in git history: `git log --all -p | grep -i "api_key\|password\|secret"`
- [ ] Verify `.env` in `.gitignore`
- [ ] Verify Lambda env vars not logged (no `console.log(process.env)`)
- [ ] Verify SENDGRID_API_KEY stored in SSM Parameter Store (not hardcoded)

### OWASP Top 10 Checklist
- [ ] A01 Broken Access Control: No admin routes exposed
- [ ] A02 Cryptographic Failures: HTTPS enforced, no plaintext passwords
- [ ] A03 Injection: Prisma parameterized queries, URL validation
- [ ] A04 Insecure Design: Rate-limiting implemented
- [ ] A05 Security Misconfiguration: Security headers set, no debug mode in prod
- [ ] A06 Vulnerable Components: `npm audit --production` passes
- [ ] A07 Auth Failures: N/A (no auth in Phase 1)
- [ ] A08 Software Integrity: CI/CD pipeline with linting
- [ ] A09 Logging Failures: CloudWatch structured logging active
- [ ] A10 SSRF: URL validation rejects private IPs (localhost, 10.x, 192.168.x)

### SSRF Protection
- [ ] Add to `src/utils/validators.ts`:
  ```typescript
  // Block private/localhost URLs from being crawled
  const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'];
  const BLOCKED_RANGES = ['10.', '192.168.', '172.16.', '172.17.'];
  ```
- [ ] Test:
  ```bash
  curl -X POST {api-url}/api/analyze \
    -d '{"url":"http://169.254.169.254/latest/meta-data/"}'
  # Expected: 400 (blocked)
  ```

**Output**: Security audit complete, all OWASP Top 10 addressed, issues documented

---

## Day 5: Integration + Final Validation

> **Depends on**: All streams A-F complete
> **Sequential (not parallelizable)** — fixing issues found in streams

### Fix LLM Crawler Issues (if any from Stream E)
- [ ] Fix any robots.txt/sitemap/OG tag issues found
- [ ] Re-run LLM crawler simulation tests
- [ ] Confirm BLOCKER cleared

### Fix Security Issues (if any from Stream F)
- [ ] Fix any security headers missing
- [ ] Fix any SSRF vulnerabilities found
- [ ] Re-run `npm audit --production`
- [ ] Re-test injection payloads

### End-to-End Flow Test
- [ ] Full user journey test (production):
  1. [ ] Open `https://aiscore.io`
  2. [ ] Enter URL in form
  3. [ ] Wait for score (must be <3s)
  4. [ ] See score breakdown + issues
  5. [ ] Submit lead form (name, email, phone)
  6. [ ] Receive confirmation email
  7. [ ] Check DB: lead recorded in `leads` table
- [ ] Test both EN and FR language versions

### Final Checklist
- [ ] Lambda responding: ✅
- [ ] RDS connected + data persisting: ✅
- [ ] Redis caching working: ✅
- [ ] CloudFront serving frontend: ✅
- [ ] Rate-limiting active: ✅
- [ ] Email delivery working: ✅
- [ ] LLM crawler verification PASSED: ✅
- [ ] Security audit PASSED: ✅
- [ ] p99 <3s confirmed: ✅
- [ ] Cost per check documented: ✅

**Time**: 6 hours

---

## End of Week 3 Checklist

### Deployments Verified
- [ ] Lambda `aiscore-api-prod`: running
- [ ] API Gateway `prod` stage: responding
- [ ] CloudFront distribution: serving HTTPS
- [ ] RDS: migrations applied, data persisting
- [ ] ElastiCache Redis: caching working

### Tests Passed
- [ ] p99 latency <3s under 100 concurrent users ✅
- [ ] Error rate <1% under load ✅
- [ ] LLM crawler verification ✅ (BLOCKER cleared)
- [ ] Security audit (OWASP Top 10) ✅
- [ ] No SQL injection vulnerabilities ✅
- [ ] No XSS vulnerabilities ✅

### Monitoring Active
- [ ] CloudWatch dashboards live
- [ ] Billing alerts configured
- [ ] Error rate alerts configured
- [ ] Structured JSON logging active

### CI/CD Pipeline
- [ ] Push to `main` → Lambda auto-deploys
- [ ] Push to `main` → Frontend auto-deploys
- [ ] All GitHub Actions passing

### Before Moving to Week 4
- [ ] LLM crawler verification PASSED (non-negotiable blocker)
- [ ] p99 <3s confirmed under load
- [ ] Cost per check calculated (target: <$0.01)
- [ ] No critical security vulnerabilities
- [ ] Production URL accessible + functional

---

## Files Created This Week

```
tests/load/
├── analyze-load-test.js       (k6 load test script)
├── performance-results.md     (p99 results + cost analysis)
└── cost-analysis.md           (cost per check breakdown)

public/
├── robots.txt                 (LLM bot access rules)
├── sitemap.xml                (search engine sitemap)
└── og-image.png               (1200x630 social share image)

.github/workflows/
└── deploy.yml                 (updated with Lambda + CloudFront deploy)
```

---

## Time Budget

| Task | Estimated | Actual | Notes |
|------|-----------|--------|-------|
| Day 1 (AWS Setup) | 6h | ? | Blocking |
| Stream A (Lambda + APIGW) | 8h | ? | |
| Stream B (CloudFront) | 6h | ? | |
| Stream C (CloudWatch) | 5h | ? | |
| Stream D (Performance) | 6h | ? | |
| Stream E (LLM Crawlers) | 4h | ? | **BLOCKER** |
| Stream F (Security) | 5h | ? | |
| Day 5 (Integration) | 6h | ? | |
| **Total** | **46 hours** | ? | ~5-6 days if 8h/day |

---

**Status**: Ready for Week 3
**Next**: Week 4 is Polish + Launch
**Blocker**: LLM crawler verification MUST pass before Week 4
