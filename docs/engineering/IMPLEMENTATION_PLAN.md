# AIScore - Phase 1 Implementation Plan

**Duration**: 4 weeks (March 26 - April 23, 2026)
**Target**: MVP ready for beta launch with 100-150 leads captured
**Status**: Ready for execution

---

## Phase 1 Goals

| Metric | Target | Priority |
|--------|--------|----------|
| **Leads Captured** | 100-150 | 🔴 CRITICAL |
| **Cost per Check** | <$0.01 | 🔴 CRITICAL |
| **Scoring Accuracy** | 90% on test harness (±10 pts) | 🔴 CRITICAL |
| **LLM Crawlability** | robots.txt, sitemap, og:* verified | 🔴 CRITICAL |
| **Performance** | p99 <3s under 100 concurrent users | 🟡 IMPORTANT |
| **Security** | Rate-limiting enforced, no SQL injection | 🟡 IMPORTANT |
| **Cache Hit Rate** | >40% by end of Phase 1 | 🟢 NICE TO HAVE |

---

## Current Status (as of 2026-03-29)

Phase 1 is complete and deployed. Summary of what was built:

### Backend
- ✅ `/api/analyze` — scoring endpoint with 4-dimension algorithm
- ✅ `/api/leads` — lead capture
- ✅ Crawler fetches page + `robots.txt` + `sitemap.xml` in parallel
- ✅ robots.txt parsed for AI bot blocking (GPTBot, ClaudeBot, PerplexityBot)
- ✅ Real sitemap check (not just HTML link heuristic)
- ✅ -20 penalty for AI crawler blocking (`ai_crawlers_blocked` issue key)
- ✅ Website summary extraction from meta/og/body (no AI call)
- ✅ Redis cache with 7-day TTL
- ✅ Rate limiting (IP: 50/day, domain: 100/day)
- ✅ PostgreSQL persistence via Prisma
- ✅ CI/CD (GitHub Actions: lint → type-check → test)

### Frontend
- ✅ Neural Overlay design system (dark, glassmorphism, Material Symbols)
- ✅ Landing page with hero, how-it-works bento grid, CTA
- ✅ Analysis-in-progress page (neural orb animation, progress grid)
- ✅ Results page (SVG circular gauge, dimension bento grid, site summary card, issues)
- ✅ How It Works page with FAQ (anchored at `/how-it-works#faq`)
- ✅ Privacy + Terms pages
- ✅ Shared NavBar (consistent across all pages, language selector everywhere)
- ✅ 6 languages: EN, FR, DE, ES, HE, RU (all in Phase 1)
- ✅ RTL support for Hebrew
- ✅ URL input auto-prefixes `https://` if missing
- ✅ Social sharing (Twitter/LinkedIn)
- ✅ Lead capture form with phone validation

### Infrastructure
- ✅ Terraform — AWS VPC, RDS, ElastiCache, Lambda, API Gateway, CloudFront
- ✅ Deployed to staging

### What remains for Phase 2
- JavaScript rendering (headless browser for SPAs)
- Multi-page crawling or sitemap-guided page sampling
- Historical score tracking
- PDF export
- Premium tier

---

## Week 1: Backend Setup + Scoring Algorithm

### Objectives
- Database schema deployed
- `/api/analyze` endpoint functional with scoring algorithm
- Rate-limiting middleware (2 layers)
- Cache logic (Redis + DB fallback)
- Scoring validation test harness built & passing

### Deliverables

#### Day 1-2: Project Setup & Infrastructure
- [ ] GitHub repo created with Node.js + Express + TypeScript boilerplate
- [ ] `.env.example` file with all configuration needed
- [ ] Docker setup for local development (optional but recommended)
- [ ] CI/CD pipeline (GitHub Actions): lint, type-check, test on every PR
- [ ] AWS account setup:
  - [ ] RDS PostgreSQL t3.micro created (dev environment)
  - [ ] ElastiCache Redis cache.t3.micro created
  - [ ] Lambda execution role configured
  - [ ] S3 bucket for artifacts
- [ ] Local development environment tested (can run `npm run dev`)

**Time estimate**: 8 hours

#### Day 3-4: Database & ORM Setup
- [ ] Prisma ORM configured (schema.prisma written)
- [ ] Database migrations created:
  - [ ] checks table (DDL from ARCHITECTURE.md)
  - [ ] leads table
  - [ ] rate_limits table
- [ ] Indexes verified for performance (domain, cached_until, ip_hash, email)
- [ ] Database connection pooling configured (Prisma connection pool)
- [ ] Seed script for testing (optional: populate test data)

**Files**:
- `/prisma/schema.prisma`
- `/prisma/migrations/001_initial.sql`

**Time estimate**: 6 hours

#### Day 5: Scoring Algorithm Implementation
- [ ] Implement `scoreWebsite(url)` function (pseudocode from TECHNICAL_SPECIFICATION.md)
- [ ] All dimension calculators working:
  - [ ] crawlability (6 checks × 5 pts)
  - [ ] content (8 checks, variable pts)
  - [ ] technical (5 checks × 5 pts)
  - [ ] quality (2 checks × 5 pts)
- [ ] Penalties implemented:
  - [ ] noindex/robots blocked = -30
  - [ ] auth/unreachable = -25
  - [ ] redirects/timeout = -15
- ✅ robots.txt fetched per-check; GPTBot/ClaudeBot/PerplexityBot blocking detected (-20 penalty)
- ✅ sitemap.xml fetched and validated (replaces HTML <link> heuristic)
- ✅ ai_crawlers_blocked issue key added
- [ ] Issues array populated (high-level categories, not prescriptive)
- [ ] Unit tests written for scoring (edge cases: missing headers, slow sites, etc.)
- [ ] Algorithm documented in code (comment explaining each check)

**Files**:
- `/src/services/scorer.ts`
- `/src/services/scorer.test.ts`

**Time estimate**: 8 hours

#### Day 6-7: API & Cache Implementation
- [ ] `/api/analyze` endpoint implemented:
  - [ ] Accept URL + force_refresh flag
  - [ ] HTTP client (Axios) fetches URL with 10s timeout
  - [ ] HTML parsing (Cheerio) extracts metadata
  - [ ] Calls scorer service
  - [ ] Stores result in PostgreSQL
  - [ ] Caches in Redis (24h TTL)
  - [ ] Returns JSON response
- [ ] Cache logic implemented:
  - [ ] Check Redis first (key: `check:${domain}:v1`)
  - [ ] If miss or force_refresh, fetch & score
  - [ ] Store in DB + Redis
  - [ ] Handle Redis failure gracefully (fall back to DB)
- [ ] Rate-limiting middleware (2 layers):
  - [ ] IP-based (50/day): check Redis key `ratelimit:ip:${ip_hash}:checks`
  - [ ] Form submission (5/day): check Redis key `ratelimit:ip:${ip_hash}:leads`
  - [ ] Return 429 with Retry-After header if exceeded
- [ ] API response format matches ARCHITECTURE.md examples
- [ ] Error handling for malformed URLs, timeouts, unreachable sites

**Files**:
- `/src/routes/analyze.ts`
- `/src/middleware/rateLimiter.ts`
- `/src/services/cache.ts`
- `/src/services/crawler.ts`

**Time estimate**: 12 hours

#### Day 7: Scoring Validation Test Harness (CRITICAL BLOCKER)
- [ ] Identify 20 test websites:
  - [ ] 5 static sites (blogs, docs): expected 75-92/100
  - [ ] 3 SPAs without schema: expected 30-50/100
  - [ ] 2 SPAs with schema: expected 65-85/100
  - [ ] 3 e-commerce sites: expected 70-88/100
  - [ ] 3 media sites: expected 60-85/100
  - [ ] 1 noindex site: expected 0-40/100
- [ ] Manually score all 20 sites using algorithm (spreadsheet)
- [ ] Run AIScore API on all 20 sites, record results
- [ ] Compare actual vs. expected:
  - [ ] Document any anomalies (e.g., "Site X scored 55 but expected 70-85")
  - [ ] Investigate anomalies, fix algorithm if needed
  - [ ] **Acceptance**: 18/20 sites within ±10 points (90% accuracy)
- [ ] Create automated test suite:
  - [ ] `/tests/scoring-validation.test.ts`
  - [ ] Calls `/api/analyze` on all 20 URLs
  - [ ] Asserts score within expected range
  - [ ] Can run with `npm run test:scoring`
- [ ] Document results in `/tests/scoring-validation-results.md`

**Files**:
- `/tests/scoring-validation.test.ts`
- `/tests/scoring-validation-results.md`
- `/tests/test-websites.json`

**Time estimate**: 8 hours

### Week 1 Quality Checklist
- [ ] All code has TypeScript types (no `any`)
- [ ] Unit tests pass locally
- [ ] Scoring validation test passes (90% accuracy)
- [ ] CI/CD pipeline green
- [ ] Database migrations run successfully
- [ ] `.env.example` documents all required env vars
- [ ] README.md has "Getting Started" instructions for local dev

---

## Week 2: Frontend + Lead Form + Results Page

### Objectives
- Homepage with URL input field (clean, minimal UI)
- Results page with score display, dimension breakdown, issues
- Lead form (name, email, phone with libphonenumber validation)
- Mobile-responsive design (desktop-first, mobile polish in Phase 2 if needed)
- API integration complete

### Deliverables

#### Day 1-2: Frontend Setup & Homepage
- [ ] Vite React app created with TypeScript
- [ ] Tailwind CSS configured
- [ ] Project structure:
  - [ ] `/src/pages/Home.tsx` — URL input form
  - [ ] `/src/pages/Results.tsx` — Score display
  - [ ] `/src/components/Header.tsx` — Navigation + language selector
  - [ ] `/src/components/LeadForm.tsx` — Lead form with phone validation
  - [ ] `/src/services/api.ts` — API calls
  - [ ] `/src/utils/phoneValidator.ts` — libphonenumber integration
- [ ] Homepage design:
  - [ ] Single URL input field (placeholder: "Enter your website URL")
  - [ ] Submit button (CTA: "Check Your AI Score")
  - [ ] Brief value prop above input
  - [ ] Loading state while fetching
  - [ ] Error handling (invalid URL, site unreachable, rate-limited)
- [ ] i18n setup with i18next (EN + FR initially):
  - [ ] `/src/locales/en/translation.json`
  - [ ] `/src/locales/fr/translation.json`
  - [ ] Language selector in header (top-right)
  - [ ] GeoIP auto-detection (browser language + IP detection fallback)
  - [ ] localStorage persistence for user-selected language

**Files**:
- `/src/pages/Home.tsx`
- `/src/components/Header.tsx`
- `/src/services/api.ts`
- `/src/locales/en/translation.json`
- `/src/locales/fr/translation.json`

**Time estimate**: 10 hours

#### Day 3-4: Results Page + Timestamp + Sharing
- [ ] Results page layout:
  - [ ] Large score display (centered, big number)
  - [ ] Dimension breakdown (4 bars or circles showing crawlability, content, technical, quality)
  - [ ] Issue categories listed (high-level, not prescriptive)
  - [ ] **Timestamp**: "Last analyzed: March 26, 2026 at 10:30 AM (2 hours ago)"
  - [ ] **Freshness indicator**: "This result is from our cache. Fresh analysis takes ~10 seconds."
  - [ ] **Refresh button**: "Analyze Again" (calls `/api/analyze?force_refresh=true`)
- [ ] Social sharing:
  - [ ] Open Graph meta tags on results page:
    - [ ] `og:title`: "AIScore: example.com Analysis - 72/100"
    - [ ] `og:description`: "{domain} scores 72/100 on AI-friendliness. Issues: {issue1}, {issue2}"
    - [ ] `og:image`: Static/generated image (score card)
    - [ ] `og:url`: Unique URL per analysis (`/analysis/{domain-slug}?checkId={uuid}`)
  - [ ] Canonical tag: `<link rel="canonical" href="..."`
  - [ ] **Social buttons**: LinkedIn + X (Twitter) with pre-filled share text
  - [ ] Unique URL structure: `/analysis/{domain-slug}?checkId={uuid}` (allows direct linking)
- [ ] Phase 1 limitation notice (for JS-heavy sites):
  - [ ] If crawlability <25: "Tip: This site uses JavaScript heavily. Add JSON-LD schema to your HTML <head> to improve your score."

**Files**:
- `/src/pages/Results.tsx`
- `/src/components/ScoreCard.tsx`
- `/src/components/DimensionBreakdown.tsx`
- `/src/utils/sharing.ts`

**Time estimate**: 10 hours

#### Day 5-6: Lead Form Implementation
- [ ] Form UI (minimal, clear):
  - [ ] "Get Your AEO Action Plan" as heading
  - [ ] **Name field** (required, text input)
  - [ ] **Email field** (required, email validation)
  - [ ] **Phone field** (required, strictly validated with libphonenumber)
  - [ ] Submit button
  - [ ] Success message: "Thank you! We'll follow up soon."
- [ ] Form validation:
  - [ ] Email format check (regex + domain validation)
  - [ ] **Phone validation**: libphonenumber library (strict format validation, international support)
  - [ ] Required fields present
  - [ ] Duplicate email detection (warn if same email submitted twice in 24h)
  - [ ] Client-side validation before submit (show error on invalid phone)
  - [ ] Show phone validation errors clearly (e.g., "Invalid phone number for region")
- [ ] API integration:
  - [ ] POST `/api/leads` with {check_id, name, email, phone}
  - [ ] Handle response (success + email confirmation sent)
  - [ ] Error handling (network error, rate-limited, duplicate email)
- [ ] Rate-limit handling:
  - [ ] If user hits form limit (5/day), show: "You've submitted 5 times today. Check your email for a response."

**Files**:
- `/src/components/LeadForm.tsx`
- `/src/pages/Results.tsx` (integrated with form)

**Time estimate**: 6 hours

#### Day 7: Mobile Responsiveness + API Polish
- [ ] Mobile viewport meta tag configured
- [ ] Design responsive:
  - [ ] Homepage: stacked layout on mobile
  - [ ] Results: score card fits on small screens
  - [ ] Form: touch-friendly inputs (larger tap targets)
- [ ] API error handling:
  - [ ] Timeout handling (show "Analysis is taking longer than expected" after 10s)
  - [ ] 429 handling (show rate-limit message with retry time)
  - [ ] 5xx handling (show "Service error, please try again later")
- [ ] Loading states:
  - [ ] Spinner during analysis
  - [ ] "Fetching results..." message
  - [ ] Cancel button (optional)

**Time estimate**: 6 hours

### Week 2 Quality Checklist
- [ ] Frontend builds without errors (`npm run build`)
- [ ] All pages responsive (desktop, tablet, mobile)
- [ ] API calls working (test in browser DevTools)
- [ ] i18n working (language selector switches content)
- [ ] Open Graph tags render correctly (test with Facebook Share Debugger)
- [ ] Form validation working
- [ ] Error messages are user-friendly
- [ ] Accessibility: buttons have labels, forms have placeholders

---

## Week 3: Deployment + Testing + LLM Crawler Verification

### Objectives
- Deploy to AWS (Lambda + RDS + Redis)
- SSL/HTTPS working
- Monitoring & alerting configured (free tools)
- Performance testing (latency, load test)
- LLM crawler verification complete (CRITICAL BLOCKER)
- Security audit

### Deliverables

#### Day 1-2: AWS Deployment
- [ ] Lambda function setup:
  - [ ] Create Lambda function for Node.js backend
  - [ ] Set up API Gateway (REST API)
  - [ ] Connect RDS security group (allow Lambda ingress)
  - [ ] Set environment variables (DB_HOST, REDIS_URL, NODE_ENV, etc.)
  - [ ] Configure function timeout (30s)
  - [ ] Configure memory (512MB, auto-scaling for CPU)
- [ ] Frontend deployment:
  - [ ] Build React app (`npm run build`)
  - [ ] Deploy to S3 bucket
  - [ ] CloudFront distribution setup (CDN for /dist folder)
  - [ ] Configure origin to point to S3
  - [ ] Set cache headers (assets: 1 year, index.html: 1 day)
- [ ] Domain setup:
  - [ ] Register domain (aiscore.co or similar)
  - [ ] Route 53 DNS records:
    - [ ] API: api.aiscore.co → API Gateway
    - [ ] Frontend: aiscore.co → CloudFront
  - [ ] SSL certificate (AWS Certificate Manager, free)
  - [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] Database migration to production:
  - [ ] RDS PostgreSQL t3.micro deployed
  - [ ] Prisma migration run (`npx prisma migrate deploy`)
  - [ ] Backups enabled (daily snapshots)
- [ ] Redis setup:
  - [ ] ElastiCache Redis cache.t3.micro deployed
  - [ ] Security groups configured (allow Lambda access)
  - [ ] No public endpoint (security best practice)

**Time estimate**: 10 hours

#### Day 3: Monitoring & Alerting Setup (FREE TOOLS)
- [ ] CloudWatch dashboards:
  - [ ] Requests per minute (API Gateway metrics)
  - [ ] Lambda errors (invocations vs. errors)
  - [ ] Latency (p50, p95, p99 response times)
  - [ ] Cache hit rate (custom metric from Lambda logs)
  - [ ] Cost per check (custom metric)
- [ ] Sentry integration (error tracking):
  - [ ] Sentry account created (free tier)
  - [ ] SDK integrated in Lambda + React
  - [ ] Alerts configured (errors > 5 per minute → Slack notification)
- [ ] Logs aggregation:
  - [ ] Lambda logs → CloudWatch Logs
  - [ ] React errors → Sentry
  - [ ] Database slow queries → CloudWatch (log groups)
- [ ] Uptime monitoring (free options):
  - [ ] Pingdom free tier for homepage uptime
  - [ ] CloudWatch synthetic canaries (free tier)

**Files**:
- AWS CloudFormation template (or AWS CDK) for infrastructure as code (optional but recommended)

**Time estimate**: 6 hours

#### Day 4: Latency & Performance Testing (CRITICAL BLOCKER)
- [ ] Cache hit latency:
  - [ ] [ ] Query same domain 10x
  - [ ] [ ] Measure p99 latency
  - [ ] [ ] **Target**: p99 <100ms (Redis read)
  - [ ] [ ] Document results
- [ ] Fresh check latency:
  - [ ] [ ] Query new domain
  - [ ] [ ] Measure p99 latency
  - [ ] [ ] **Target**: p99 <5 seconds
  - [ ] [ ] Document results
- [ ] Load testing:
  - [ ] [ ] Use Apache JMeter or Artillery to simulate 100 concurrent users
  - [ ] [ ] Run for 5 minutes
  - [ ] [ ] Measure p99 latency
  - [ ] [ ] **Target**: p99 <3 seconds (blocker if exceeded)
  - [ ] [ ] If exceeding 3s, investigate: Lambda cold start? RDS connection pool? Cache misconfiguration?
  - [ ] [ ] **Fix or escalate** before proceeding

**Files**:
- `/tests/load-test.yml` (Artillery config)
- `/tests/performance-report.md` (results documentation)

**Time estimate**: 6 hours

#### Day 5: LLM Crawler Verification (CRITICAL BLOCKER)
- [ ] robots.txt verification:
  - [ ] [ ] Check file exists at `/robots.txt`
  - [ ] [ ] Verify contains User-agent rules for GPTBot, Claude-web, Googlebot
  - [ ] [ ] Test with curl: `curl https://aiscore.co/robots.txt | grep -i "gptbot\|claude"`
  - [ ] [ ] Document results
- [ ] sitemap.xml verification:
  - [ ] [ ] Generate sitemap with all public pages (homepage, /analysis/* pages)
  - [ ] [ ] Validate sitemap XML format (use online validator)
  - [ ] [ ] Verify robots.txt links to sitemap: `Sitemap: https://aiscore.co/sitemap.xml`
  - [ ] [ ] Test with curl: `curl https://aiscore.co/sitemap.xml`
  - [ ] [ ] Document results
- [ ] Results page crawlability:
  - [ ] [ ] Verify results pages have unique `<title>` tags: "AIScore: {domain} Analysis - {score}/100"
  - [ ] [ ] Verify `<meta name="description">` present and unique
  - [ ] [ ] Verify Open Graph tags (og:title, og:description, og:image, og:url, og:type)
  - [ ] [ ] Verify canonical tags present: `<link rel="canonical" href="..."`
  - [ ] [ ] **CRITICAL**: Verify NO `<meta name="robots" content="noindex">` (results must be indexable)
  - [ ] [ ] Test og:* tags with Open Graph Debugger (https://developers.facebook.com/tools/debug/og/object/)
- [ ] Manual LLM crawl test:
  - [ ] [ ] Query Claude: "Is AIScore.co AI-friendly? Please check it for me."
    - [ ] **Expected**: Claude accesses AIScore and provides analysis or score
  - [ ] [ ] Query GPT: "What's my website's AI score? Check example.com."
    - [ ] **Expected**: GPT references AIScore or provides analysis
  - [ ] [ ] Search Google: `site:aiscore.co`
    - [ ] **Expected**: Homepage and at least 2-3 other pages indexed
  - [ ] [ ] Document all results with screenshots
- [ ] Create documentation:
  - [ ] [ ] `/tests/llm-crawler-verification.md` with:
    - [ ] robots.txt verification results
    - [ ] sitemap.xml validation results
    - [ ] og:* tag verification results
    - [ ] Claude test results + screenshot
    - [ ] GPT test results + screenshot
    - [ ] Google indexing results + screenshot

**Files**:
- `/tests/llm-crawler-verification.md` (documentation)
- `/public/robots.txt`
- `/public/sitemap.xml`

**Time estimate**: 8 hours

#### Day 6-7: Security Audit
- [ ] Input validation:
  - [ ] [ ] Test malformed URLs (e.g., "not a url", "javascript:alert(1)", file:///etc/passwd)
  - [ ] [ ] Verify API returns 400 Bad Request, not 500 or SQL error
  - [ ] [ ] Test SQL injection: `name: "'; DROP TABLE leads; --"`
  - [ ] [ ] Verify parameterized queries (no SQL concatenation)
- [ ] Rate-limiting:
  - [ ] [ ] Make 51 requests from same IP in one day → verify 429 response
  - [ ] [ ] Make 6 form submissions from same IP in one day → verify 429 response
  - [ ] [ ] Verify rate-limit reset at midnight UTC
  - [ ] [ ] Verify Retry-After header present
- [ ] HTTPS / SSL:
  - [ ] [ ] All requests redirect HTTP → HTTPS
  - [ ] [ ] Certificate valid and not expired
  - [ ] [ ] Test with SSL Labs (https://www.ssllabs.com/ssltest/)
- [ ] XSS prevention:
  - [ ] [ ] Test form with `<script>alert(1)</script>` in name field
  - [ ] [ ] Verify no alert fires (React auto-escapes)
  - [ ] [ ] Test API response injection: `url: "<script>alert(1)</script>"`
  - [ ] [ ] Verify no script injection in results page
- [ ] CORS (if API separate from frontend):
  - [ ] [ ] Verify API allows requests only from aiscore.co domain
  - [ ] [ ] Verify API rejects requests from other origins
- [ ] Documentation:
  - [ ] [ ] `/docs/security-audit.md` with all findings

**Files**:
- `/docs/security-audit.md`

**Time estimate**: 6 hours

### Week 3 Quality Checklist
- [ ] API Gateway endpoint responding (check `curl https://api.aiscore.co/health`)
- [ ] Frontend deployed and accessible (https://aiscore.co)
- [ ] RDS database responding (Lambda can connect)
- [ ] Redis cache responding (Lambda can connect and set/get keys)
- [ ] CloudWatch logs showing requests
- [ ] Sentry receiving errors
- [ ] Performance test results documented (p99 <3s for 100 concurrent users)
- [ ] LLM crawler verification passing (robots.txt, sitemap, og:*, manual tests)
- [ ] Security audit passing (no SQL injection, XSS, CSRF vulnerabilities)
- [ ] HTTPS working (no mixed content warnings)

---

## Week 4: Polish + Launch + Partnership Prep

### Objectives
- Fix bugs discovered in testing
- Add French + 4 additional languages (or defer if short on time)
- Verify email confirmation delivery
- Cost analysis
- Marketing & partnership preparation
- Launch to production

### Deliverables

#### Day 1-2: Bug Fixes & Polish
- [ ] Fix any bugs from Week 3 testing
- [ ] Improve UX edge cases:
  - [ ] Handle very slow websites (>10s timeout) gracefully
  - [ ] Handle sites that return 403/401 (auth required)
  - [ ] Handle redirects (too many, circular, etc.)
  - [ ] Handle very large HTML files (>10MB)
- [ ] Visual polish:
  - [ ] Check mobile layout on actual devices
  - [ ] Verify font sizes are readable
  - [ ] Check color contrast (WCAG AA)
  - [ ] Verify buttons are clickable (minimum 48x48px on mobile)
- [ ] Performance optimization:
  - [ ] Minify CSS/JS in production build
  - [ ] Lazy-load images (if any)
  - [ ] Verify bundle size <100KB (gzipped)
- [ ] Error messages:
  - [ ] Review all error messages for clarity
  - [ ] Add helpful suggestions (e.g., "Site is behind authentication. Make sure your robots.txt allows public crawling.")

**Time estimate**: 6 hours

#### Day 3-4: Multilingual Support
✅ All 6 languages shipped in Phase 1: EN, FR, DE, ES, HE, RU (with RTL support for Hebrew)

- [x] Translation files created for all 6 locales:
  - [x] `/src/locales/en/translation.json`
  - [x] `/src/locales/fr/translation.json`
  - [x] `/src/locales/de/translation.json`
  - [x] `/src/locales/es/translation.json`
  - [x] `/src/locales/he/translation.json`
  - [x] `/src/locales/ru/translation.json`
- [x] RTL support for Hebrew (`document.dir = 'rtl'` on language switch)
- [x] Language selector supports all 6
- [x] Language detection: `localStorage.language` → `navigator.language` → `en`

**Time estimate**: 4-8 hours (depending on option)

#### Day 5: Email Confirmation & Cost Analysis
- [ ] Email confirmation delivery:
  - [ ] [ ] Submit lead form with email
  - [ ] [ ] Check email inbox (wait 30s)
  - [ ] [ ] Verify email received from aiscore.co
  - [ ] [ ] Verify email content is clear (thank you message, next steps)
  - [ ] [ ] Test spam filter (make sure email doesn't land in spam)
- [ ] Email template review:
  - [ ] [ ] HTML email template (nicely formatted)
  - [ ] [ ] Plain text fallback
  - [ ] [ ] Unsubscribe link (legal requirement, but Phase 1 can skip)
- [ ] Cost analysis:
  - [ ] [ ] Export CloudWatch metrics for Week 1-4
  - [ ] [ ] Calculate total cost (actual AWS billing)
  - [ ] [ ] Calculate per-check cost (total cost / total checks)
  - [ ] [ ] Calculate cache hit rate (cached checks / total checks)
  - [ ] [ ] Verify cost <$0.01/check (blocker if exceeded)
  - [ ] [ ] Document in `/docs/cost-analysis.md`
- [ ] Key metrics:
  - [ ] [ ] Total checks: ____ (target: 500-2000)
  - [ ] [ ] Total leads: ____ (target: 100-150)
  - [ ] [ ] Lead conversion rate: ____% (target: 15-20%)
  - [ ] [ ] Cost per check: $____ (target: <$0.01)
  - [ ] [ ] Cost per lead: $____ (calculation: total cost / total leads)
  - [ ] [ ] Cache hit rate: ____% (target: >40%)

**Files**:
- `/docs/cost-analysis.md`
- Email template HTML/text

**Time estimate**: 4 hours

#### Day 6-7: Marketing Prep + Partnership Discovery + Launch
- [ ] Marketing documentation:
  - [ ] [ ] `/marketing/scoring-validation-results.md`: Test results (20 websites, 90% accuracy)
  - [ ] [ ] `/marketing/phase1-limitations.md`: What works well (static sites, structured data) vs. Phase 1 gaps (JS rendering)
  - [ ] [ ] `/marketing/case-study.md`: Example site improvement (e.g., "Site X improved from 45 to 82 by adding JSON-LD schema")
  - [ ] [ ] AIScore's own AEO score: Run AIScore on aiscore.co, document score + breakdown
    - [ ] *Living benchmark*: Week 1 baseline, will track weekly going forward
    - [ ] Monthly transparency reports on improvements
- [ ] Partnership discovery (for Phase 2):
  - [ ] [ ] Research & create list of 5-10 target AEO agencies (potential lead buyers)
    - [ ] Company name, website, contact info, estimated volume
  - [ ] [ ] Research & create list of 3-5 enterprise SEO tools (for white-label partnerships)
    - [ ] Ahrefs, SEMrush, Moz, Conductor, BrightEdge: contact info, partnership page
  - [ ] [ ] Research & create list of 3-5 website builders (for integration partnerships)
    - [ ] Wix, Squarespace, Webflow, WordPress.com: partnership/integration contact
  - [ ] [ ] Draft partnership pitch outline (1 page):
    - [ ] Problem: Most websites don't know if they're AI-friendly
    - [ ] Solution: AIScore (instant diagnosis)
    - [ ] Your opportunity: White-label / embed / revenue-share
    - [ ] Metrics: {X} checks/month, {Y}% lead conversion, {Z} qualified leads/month
- [ ] Launch day:
  - [ ] [ ] Create simple landing page / blog post announcing launch
  - [ ] [ ] Verify all systems operational (API, database, cache, monitoring)
  - [ ] [ ] Load test one final time
  - [ ] [ ] Create Slack alert channel for production errors
  - [ ] [ ] Deploy to production (`npm run deploy:prod`)
  - [ ] [ ] Send first lead through (test with your own email)
  - [ ] [ ] Monitor CloudWatch dashboards for first 24 hours
  - [ ] [ ] Document launch notes (`/docs/phase1-launch-notes.md`)
- [ ] Phase 1 retrospective:
  - [ ] [ ] What went well?
  - [ ] [ ] What was harder than expected?
  - [ ] [ ] What to improve in Phase 2?
  - [ ] [ ] Document in `/docs/phase1-retrospective.md`

**Files**:
- `/marketing/scoring-validation-results.md`
- `/marketing/phase1-limitations.md`
- `/marketing/case-study.md`
- `/marketing/partnership-targets.json` (list of agencies, tools, builders)
- `/marketing/partnership-pitch.md`
- `/docs/phase1-launch-notes.md`
- `/docs/phase1-retrospective.md`

**Time estimate**: 8 hours

### Week 4 Quality Checklist
- [ ] All bugs from Week 3 testing fixed
- [ ] Email confirmation delivery verified (test with real email)
- [ ] Cost analysis complete (actual per-check cost <$0.01)
- [ ] Scoring validation test results documented (marketing asset)
- [ ] AIScore's own score documented (living benchmark baseline)
- [ ] Phase 1 limitations guide created (helps users understand what's possible)
- [ ] Partnership targets identified (5-10 agencies, 3-5 tools, 3-5 builders)
- [ ] Launch verified (can access https://aiscore.co, submit lead)
- [ ] Phase 1 retrospective documented

---

## Critical Blockers (Cannot Proceed Without)

1. **✅ Scoring Validation Harness (End of Week 1)**
   - 18/20 websites within ±10 points (90% accuracy)
   - If failed: Debug algorithm, re-test, fix any calculation errors

2. **✅ Performance Testing (End of Week 3)**
   - p99 latency <3 seconds under 100 concurrent users
   - If exceeded: Investigate (Lambda cold start? RDS bottleneck? Redis misconfiguration?)
   - Options: Increase Lambda memory, add RDS read replicas, scale Redis tier

3. **✅ LLM Crawler Verification (End of Week 3)**
   - robots.txt, sitemap.xml, og:* tags all verified
   - Claude/GPT can access and understand AIScore content
   - Google indexes at least 3 pages
   - If failed: Fix robots.txt, regenerate sitemap, add og:* tags, test again

4. **✅ Cost per Check (End of Week 4)**
   - Actual measured cost <$0.01 per check
   - If exceeded: Optimize (cache hit rate, reduce Lambda invocations, check for bugs)

---

## Resource Allocation

**Estimated time**: 40-45 hours of engineering work over 4 weeks

| Week | Hours | Focus |
|------|-------|-------|
| Week 1 | 12 | Backend: DB, API, scoring, cache, validation harness |
| Week 2 | 10 | Frontend: Homepage, results, form, mobile, i18n |
| Week 3 | 12 | Deployment, testing (perf, security, LLM), monitoring |
| Week 4 | 8 | Polish, languages, cost analysis, marketing, launch |

---

## Success Metrics (Phase 1 Complete)

| Metric | Target | Status |
|--------|--------|--------|
| Leads captured | 100-150 | □ Complete |
| Cost per check | <$0.01 | □ Complete |
| Scoring accuracy | 90% (18/20 sites) | □ Complete |
| LLM crawlability | Verified | □ Complete |
| Performance (p99) | <3 seconds | □ Complete |
| Security audit | Passed | □ Complete |
| Uptime | >99% | □ Monitor |
| Cache hit rate | >40% | □ Monitor |
| Email delivery | 100% | □ Monitor |

---

## Risks & Contingencies

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| **Scoring algorithm inaccuracy** | Medium | Validation harness catches issues early; algorithm review if >10% fail |
| **Cache TTL too aggressive** | Low | 24h is balanced; if issues arise, reduce to 6h |
| **Rate-limiting too strict** | Low | 50/day is generous; increase if complaints |
| **RDS bottleneck** | Low | t3.micro can handle 1000 checks/day; scale if needed |
| **Lambda cold start** | Low | Monitor; add provisioned concurrency if >5s p99 |
| **Email delivery failure** | Low | Use SendGrid (reliable); test before launch |
| **LLM crawler fails** | Low | robots.txt + sitemap usually sufficient; test with actual LLMs |

---

**Document Version**: 1.0
**Status**: Ready for Week 1 execution
**Last Updated**: 2026-03-26
