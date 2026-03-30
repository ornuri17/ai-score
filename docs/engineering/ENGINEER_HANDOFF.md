# AIScore - Engineer Handoff Document

## Overview for Staff Engineer

You're being handed a **comprehensive PRD + technical spec** for AIScore, a lead generation tool that scores website AI-friendliness.

**Quick Context**:
- **Business Model**: Free website scoring → lead capture → sell qualified leads to AEO agencies ($100-200/lead)
- **Revenue Driver**: Not the tool itself, but the *leads* it generates
- **Phase 1 Goal**: MVP in 4 weeks, 100-150 qualified leads, prove unit economics

---

## Phase 1 Completion Summary (2026-03-29)

Phase 1 is complete. Key decisions and deviations from original plan:

| Item | Original Plan | Actual |
|---|---|---|
| Languages | EN + FR in Phase 1, 4 more in Phase 2 | All 6 shipped in Phase 1 |
| Language codes | GR, SP, HE, RU | DE, ES, HE, RU (corrected to ISO 639-1) |
| robots.txt/sitemap | Phase 2 | Phase 1 — 3 parallel fetches per check |
| Frontend design | Not specified | Neural Overlay ("The Cognitive Prism") dark theme from Stitch |
| Website summary | Not in PRD | Added — extracted from meta/og/body text |
| AI crawler penalty | Not in PRD | -20 for GPTBot/ClaudeBot/PerplexityBot blocking |
| RTL support | Not specified | Hebrew triggers `document.dir = 'rtl'` |

---

## Documents to Review

1. **PRODUCT_REQUIREMENTS_DOCUMENT.md** (Primary)
   - Comprehensive product spec covering all requirements
   - Scoring dimensions, lead capture, security, multilingual support
   - Business model, monetization strategy, phase roadmap

2. **TECHNICAL_SPECIFICATION.md** (Implementation Reference)
   - Scoring algorithm (pseudocode)
   - Database schema (checks, leads tables)
   - Cache logic (7-day TTL, Redis-backed)
   - Rate-limiting implementation (3 layers: IP, domain, form)
   - API endpoints (request/response examples)
   - Deployment targets & cost estimates ($0.01 per check)
   - Implementation checklist

---

## Key Product Decisions (Already Made)

### What's NOT Negotiable
- **7-day cache TTL** (saves 40-50% infrastructure costs, ~$73/month at 1000 checks/day)
- **3-layer rate limiting** (IP: 50/day, Domain: 100/day, Form: 3/day)
- **Scoring algorithm** (4 dimensions: crawlability 30pts, content 35pts, technical 25pts, quality 10pts)
- **No monetization from users** (free scoring; money comes from selling leads to agencies)
- **Lead fields** (name, email, company required; phone/budget optional)
- **6 languages** (EN, FR, DE, ES, HE, RU — all shipped in Phase 1; language codes corrected to ISO 639-1; auto-detection via localStorage + navigator.language)
- **Database schema** (PostgreSQL with checks/leads tables, rate_limits for tracking)

### What IS Flexible (You Decide)

As a staff engineer, you own these decisions:

1. **Analysis Engine**
   - HTTP + HTML parsing (fast, cheap, Phase 1) vs. headless browser (slower, expensive)
   - Recommendation: Start HTTP client (Cheerio/BeautifulSoup), defer JS rendering to Phase 3

2. **Frontend Stack**
   - React, Vue, Svelte, or vanilla JS
   - Recommendation: Whatever your team knows best (no special requirements)

3. **Backend Stack**
   - Node.js, Python, Go, etc.
   - Recommendation: Whatever your team knows best

4. **Database Flavor**
   - PostgreSQL (recommended in PRD) vs. MySQL, MongoDB, etc.
   - Recommendation: PostgreSQL (relational, strong consistency for financial tracking)

5. **Cache Layer**
   - Redis (recommended) vs. in-memory vs. database-backed
   - Recommendation: Redis for production, in-memory fallback in dev

6. **Hosting & CI/CD**
   - AWS Lambda (recommended), ECS, Kubernetes, VPS, etc.
   - Recommendation: Lambda for MVP (minimal ops), scale to ECS at 10K+ checks/day

7. **i18n Implementation**
   - i18next library vs. custom JSON approach
   - Recommendation: Whatever maintains consistency with existing codebase

8. **CRM Integration**
   - Zapier (Phase 1) vs. direct HubSpot/Salesforce API (Phase 2)
   - Recommendation: Zapier in MVP for speed, direct API integration later

9. **Monitoring & Observability**
   - Datadog, New Relic, CloudWatch, etc.
   - Recommendation: Whatever you already use (cost targets: <$50/mo for MVP)

---

## Critical Success Criteria

The engineer's implementation will be evaluated on:

1. **Cost Efficiency**
   - Target: <$0.01 per website check (infrastructure cost)
   - With caching, target average: <$0.005 per check
   - If exceeding $0.015/check, architecture needs review
   - **Monitor daily**: Track per-check cost + cache hit rate (target >40% by week 2)

2. **Performance**
   - Analysis must complete in <5 seconds (user experience)
   - Cache hits must serve in <100ms (Redis read)
   - API latency should be <200ms p99

3. **Accuracy**
   - Scoring algorithm must be implemented exactly as specified (no approximations)
   - **Critical**: By end of Week 1, build & validate scoring test harness with 20+ real websites
   - Test categories: Static sites, SPAs with/without schema, e-commerce, media, problematic sites
   - **Acceptance criteria**: Actual scores must fall within ±10 points of expected ranges on 18/20 sites (90% accuracy)
   - Critical penalties (noindex, auth-required) must be verified in test harness
   - **Note**: Phase 1 uses HTTP + HTML parsing only (no JS execution); document this limitation
   - Document expected score ranges per website type (for marketing: "Tested on 20+ real websites")

4. **Security & Crawler Compliance**
   - Rate limiting must be airtight (prevent DOS, abuse)
   - Input validation must prevent SQL injection, XSS, command injection
   - HTTPS enforced, IP hashing for privacy, email encryption at rest
   - **LLM Crawler Verification** (required by end of Week 3):
     - [ ] robots.txt explicitly allows GPTBot, Claude-web, Googlebot
     - [ ] sitemap.xml is valid and linked in robots.txt
     - [ ] Results pages have proper og:* tags and canonical tags
     - [ ] Manual test: Claude/GPT can cite AIScore content
     - [ ] Google Search includes AIScore pages in results

5. **Reliability**
   - Cache must handle stale data gracefully (soft-cache with expiry indicator)
   - Database schema must support high-volume lead inserts (indexes on email, created_at)
   - Graceful degradation if Redis is down (fall back to DB cache)

6. **Lead Capture** (PRIMARY GOAL)
   - Database must track every lead (name, email, company, score, issues)
   - Zapier webhook sends leads to sales team immediately on form submission
   - Email confirmation sent to user within 5 seconds of form submit
   - Duplicate email detection (don't insert same email twice in 24h)
   - **Target**: Capture 100-150 leads in Phase 1 (4 weeks)

---

## Phase 1 Implementation Checklist

**Phase 1 Duration**: 4 weeks (with flexibility below)

**Success Metrics**:
- **Primary**: 100-150 leads captured (lead volume is the goal)
- Infrastructure costs <$10/day
- 15-20% lead capture rate (checks → form submissions)
- Average response time <2 seconds
- Zero critical security issues

**Timeline Flexibility**:
The 4-week timeline is achievable with these trade-offs:
- **Aggressive scope**: All 6 languages + full mobile polish = **recommend 5 weeks**
- **Recommended scope**: English + French only + desktop-optimized + mobile polish in Phase 2 = **4 weeks achievable**

Discuss with team: Would you rather ship English/French in 4 weeks, or push to 5 weeks for all 6 languages?

**Implementation Breakdown** (from TECHNICAL_SPECIFICATION.md):

**Week 1: Setup + Backend API + Scoring Validation**
- [ ] GitHub repo, CI/CD, local dev environment
- [ ] Database schema (checks, leads, rate_limits)
- [ ] `/api/analyze` endpoint with scoring logic
- [ ] Rate-limiting middleware (Layer 1, 2)
- [ ] Cache logic (Redis + DB, with cost monitoring)
- [ ] Unit tests (scoring, rate-limit edge cases)
- [ ] **CRITICAL: Build scoring validation test harness**
  - [ ] Identify 20+ test websites (static, SPAs, e-commerce, media, problematic)
  - [ ] Manually score each website using algorithm
  - [ ] Run AIScore on all sites
  - [ ] Validate actual vs. expected (±10 point tolerance, 90% accuracy required)
  - [ ] Document anomalies + any algorithm fixes needed
  - [ ] Create automated test: `npm run test:scoring-validation` (gates deployment)

**Week 2: Frontend + API Completion + Results Page Enhancements**
- [ ] Homepage (URL input, clean design)
- [ ] Results page (score display, dimension breakdown, issues)
  - [ ] Show timestamp: "Last analyzed: [date]" with cache age indicator
  - [ ] Add "Refresh Now" button for stale results
  - [ ] Include Phase 1 limitation notice for JS-heavy sites (educate users about schema markup)
  - [ ] Add Open Graph meta tags (og:title, og:description, og:image, og:url, og:type)
  - [ ] Unique URL per analysis: `/analysis/{domain-slug}?checkId={uuid}` (shareable)
  - [ ] Social sharing buttons (LinkedIn, X) with pre-filled messages
- [ ] Lead form (name, email, company required; phone/budget optional)
  - [ ] Pre-fill company field with analyzed domain (reduce friction)
  - [ ] Add "Decision-Maker Title" optional field (helps agencies qualify)
  - [ ] Email format validation + warn if email doesn't match company domain
  - [ ] Duplicate email detection (suppress 2nd within 24h)
- [ ] Loading states, error messages
- [ ] Mobile responsiveness (desktop-first OK, mobile polish in Phase 2 if needed)
- [ ] Finish API polish (error handling, validation)
- [ ] Email confirmation template

**Week 3: Ops + Testing + LLM Crawler Verification**
- [ ] Deploy to staging (Lambda + RDS + Redis)
- [ ] SSL/HTTPS, domain setup, DNS
- [ ] Zapier webhook setup (webhook endpoint → Zapier → sales team)
- [ ] Monitoring & alerting (cost per check, cache hit rate, errors, latency p99)
- [ ] **Latency Testing**:
  - [ ] Verify cache hits: p99 <100ms (Redis reads)
  - [ ] Verify fresh checks: p99 <5 seconds
  - [ ] Load test: 100 concurrent users, verify p99 <3s
  - [ ] If exceeding 3s latency, trigger architecture review before proceeding
- [ ] **LLM Crawler Verification** (BLOCKING):
  - [ ] Verify robots.txt allows GPTBot, Claude-web, Googlebot
  - [ ] Validate sitemap.xml (test with online validator)
  - [ ] Verify results pages have proper og:* tags (test with Open Graph debugger)
  - [ ] Manual test: Query Claude "Is AIScore.co AI-friendly?" → verify proper response
  - [ ] Manual test: Search Google "site:aiscore.co" → verify pages indexed
  - [ ] Document results in `tests/llm-crawler-verification.md`
- [ ] Security audit (input validation, XSS, SQL injection, rate-limit enforcement)
- [ ] Load testing (simulate 100 concurrent users)

**Week 4: Polish + Launch + Partnership Prep**
- [ ] Fix bugs from QA
- [ ] Add EN + FR languages (other 4 languages in Phase 2)
- [ ] Verify email confirmation delivery + Zapier webhook
- [ ] Cost analysis: confirm <$0.01 per check with caching
- [ ] **Marketing Prep**:
  - [ ] Document scoring validation results (20 test websites, accuracy metrics)
  - [ ] Publish AIScore.co's own AEO score (living benchmark, transparent methodology)
  - [ ] Create "Phase 1 Limitations" guide for users (JS-heavy sites + schema solution)
  - [ ] Prepare case study: "Site X improved from 45 to 82 by adding schema markup"
- [ ] **Partnership Discovery** (Parallel track for Phase 2 planning):
  - [ ] Identify 5-10 target AEO agencies (research + outreach list)
  - [ ] Identify 3-5 enterprise SEO tools for white-label partnerships (Ahrefs, SEMrush, etc.)
  - [ ] Identify 3-5 website builders for integration partnerships (Wix, Webflow, etc.)
  - [ ] Draft partnership pitch deck (lead volume, quality metrics, case studies)
- [ ] Launch to production
- [ ] Monitor: checks/day, lead volume, cost, conversion rate, LLM citations
- [ ] Prepare Phase 2 roadmap (add 4 more languages, mobile polish, enterprise partnerships, etc.)

---

## Handing Off to You

**What You Have**:
- ✅ Complete product spec (PRD)
- ✅ Scoring algorithm (pseudocode, decision tree)
- ✅ Database schema (SQL DDL)
- ✅ API design (request/response formats)
- ✅ Rate-limiting logic (3 layers with edge cases)
- ✅ Cache strategy (7-day TTL, soft-cache, background refresh)
- ✅ Cost targets & deployment strategy
- ✅ Implementation checklist
- ✅ Neural Overlay design system implemented (dark theme, glassmorphism, Material Symbols)
- ✅ All 6 languages implemented (EN, FR, DE, ES, HE with RTL, RU)
- ✅ robots.txt + sitemap.xml crawling in Phase 1 (not deferred)
- ✅ AI crawler blocking detection + -20 penalty (GPTBot, ClaudeBot, PerplexityBot)
- ✅ Website summary extraction from page metadata
- ✅ Terraform infrastructure (VPC, RDS, Redis, Lambda, API GW, CloudFront)

**What You Own**:
- Architecture decisions (backend stack, frontend framework, hosting)
- Tech stack choices (database flavor, cache layer, monitoring)
- Implementation timeline & resource planning
- Build vs. buy decisions (libraries, services, third-party APIs)
- Code quality & testing strategy
- DevOps & deployment automation

**What's Not Your Problem** (yet):
- Sales strategy or lead nurturing (business team handles)
- Marketing or SEO for AIScore itself (brand team handles)
- Premium tier features (Phase 3, separate planning)
- Partnerships with AEO agencies (business development)

---

## Known Risks & Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| **Scoring inaccuracy** | Medium | Test on 20+ real websites, iterate on formula |
| **Cache TTL too long** | Low | 7 days is balanced; monitor freshness complaints |
| **Rate limits too strict** | Low | Can be adjusted if users complain; 50/day is generous |
| **High crawling costs** | Low | Use HTTP client (not headless browser); monitor per-check costs |
| **Database bottleneck** | Low | PostgreSQL scales fine at 1M leads; add read replicas at 10M |
| **CRM integration failures** | Medium | Start with simple Zapier webhook; direct API in Phase 2 |
| **Lead quality too low** | Medium | Email validation on form submission; track conversion rate post-launch |

---

## Getting Started: Your First Steps

1. **Review the Documents** (2-3 hours)
   - Read PRODUCT_REQUIREMENTS_DOCUMENT.md (full context)
   - Read TECHNICAL_SPECIFICATION.md (implementation details)
   - Ask clarifying questions if anything is unclear

2. **Propose Architecture** (1 day)
   - Backend stack (Node, Python, Go?)
   - Frontend framework (React, Vue, vanilla?)
   - Database (PostgreSQL, hosted on AWS RDS?)
   - Cache (Redis, hosted on ElastiCache?)
   - Hosting (Lambda, ECS, VPS?)
   - Monitoring (CloudWatch, Datadog, other?)
   - Create a brief ARCHITECTURE.md describing your choices

3. **Create Implementation Plan** (1-2 days)
   - Detailed breakdown of work by week
   - Dependencies & critical path
   - Test strategy (unit, integration, load, security)
   - Risk mitigation for critical items
   - Estimated timeline & resource needs

4. **Start Building** (Week 1)
   - Set up repo, CI/CD, dev environment
   - Implement database schema
   - Build `/api/analyze` endpoint with scoring logic
   - Start frontend scaffolding

---

## Communication & Blockers

**Questions?**
- Ask them early. Better to clarify now than discover ambiguity in week 3.
- PRD intentionally leaves architectural decisions to you (trust your judgment).

**Blockers?**
- Cost target too aggressive? Let's discuss.
- 4-week timeline unrealistic? Let's replan.
- Missing context or unclear requirements? Let's add detail.

**Success Handoff**:
- Once you have an ARCHITECTURE.md + implementation plan, you're good to build.
- Check in weekly on progress, risks, blockers.

---

## References

- **PRD**: `/Users/ornu/Desktop/AIScore/PRODUCT_REQUIREMENTS_DOCUMENT.md`
- **Tech Spec**: `/Users/ornu/Desktop/AIScore/TECHNICAL_SPECIFICATION.md`
- **This Handoff**: `/Users/ornu/Desktop/AIScore/ENGINEER_HANDOFF.md`

---

**Prepared By**: Founder / Product Team
**Date**: 2026-03-26
**Status**: Ready for Implementation Planning & Engineering

Good luck! We're aiming high with this product. 🚀
