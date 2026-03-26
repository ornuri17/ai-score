# AIScore - Staff Engineer Handoff Summary

**Date**: 2026-03-26
**Prepared For**: Staff Engineer (You)
**Timeline**: 4 weeks to MVP launch
**Status**: Architecture + Implementation Plan Complete

---

## What You're Building

**AIScore** is a free website AI-friendliness scoring tool that makes money by selling leads to AEO agencies ($100-200/lead). You're not building a traditional SaaS—you're building a lead generation machine.

**Input**: Website URL
**Output**: 0-100 AI-friendliness score (identifies barriers preventing LLMs from discovering the site)
**Lead Capture**: Name + Email + Phone → exported for sales team to follow up
**Revenue**: No Zapier integration, no CRM integration, manual sales process only

---

## Your Stack (You Decide, Suggested)

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Backend** | Node.js + Express + TypeScript | Fast iteration, you prefer Node |
| **Frontend** | React 18 + Vite + Tailwind CSS | Your preference, ships <100KB |
| **Database** | PostgreSQL (RDS t3.micro) | ACID for lead accuracy, scales well |
| **Cache** | Redis (ElastiCache cache.t3.micro) | 24h primary + 7d fallback for resilience |
| **Hosting** | AWS Lambda + API Gateway | Auto-scaling, $0.01/check cost target |
| **Monitoring** | CloudWatch + Sentry free tier | No cost (for Phase 1) |
| **i18n** | i18next + JSON files | Minimal bundle size, easy to manage |

**Key decisions already made** (confirmed):
- 24-hour primary cache TTL (avoids attacks, keeps results fresh)
- 2-layer rate-limiting: IP (50/day) + Form (5/day) — simplified from 3 layers
- Simplified lead form: **Name + Email + Phone** (strict validation with libphonenumber)
- No Zapier/CRM integration (Phase 1 = manual sales process)
- Free monitoring tools only (upgrade to Datadog/New Relic if traffic scales)

---

## The 4-Week Plan (Detailed in IMPLEMENTATION_PLAN.md)

### Week 1: Backend + Scoring (12 hours)
- Database schema + Prisma ORM
- `/api/analyze` endpoint with full scoring algorithm
- 2-layer rate-limiting (IP + form submission)
- Redis cache (24h primary + 7d fallback)
- **CRITICAL BLOCKER**: Scoring validation test harness (20 websites, 90% accuracy required)

### Week 2: Frontend (10 hours)
- React homepage (URL input field)
- Results page (score display, dimension breakdown, issues)
- Lead form (name, email, phone with libphonenumber validation)
- Timestamp display + "Refresh Now" button
- Social sharing (LinkedIn + X with pre-filled text)
- i18n setup (EN + FR minimum)
- Mobile responsive

### Week 3: Deployment + Testing (12 hours)
- Deploy to AWS (Lambda, RDS, ElastiCache, CloudFront)
- Setup free monitoring (CloudWatch + Sentry)
- Performance testing (load test 100 concurrent users, target p99 <3s)
- **CRITICAL BLOCKER**: LLM crawler verification (robots.txt, sitemap.xml, og:* tags)
- Security audit (SQL injection, XSS, rate-limiting enforcement)

### Week 4: Launch + Marketing Prep (8 hours)
- Bug fixes + polish
- Add more languages (optional: defer to Phase 2)
- Verify email delivery
- Cost analysis (verify <$0.01 per check)
- Marketing documentation (validation results, case studies)
- Partnership discovery for Phase 2
- **LAUNCH TO PRODUCTION**

---

## Critical Success Criteria (Non-Negotiable)

You will be evaluated on:

1. **Cost Efficiency**: <$0.01 per check (actual AWS billing)
2. **Performance**: p99 <3 seconds under 100 concurrent users (blocker if exceeded)
3. **Accuracy**: 90% on scoring validation test (18/20 websites within ±10 points)
4. **LLM Crawlability**: Verified by end of Week 3 (robots.txt, sitemap, og:*, manual tests)
5. **Security**: Rate-limiting enforced, no SQL injection/XSS vulnerabilities
6. **Lead Capture**: 100-150 leads by end of Phase 1

---

## What's Already Decided (Non-Negotiable)

- ✅ **24-hour primary cache TTL** (with 7-day fallback for resilience)
- ✅ **Scoring algorithm** (exact formula: 30+35+25+10 = 100, specific penalties)
- ✅ **2-layer rate-limiting** (IP 50/day, Form 5/day)
- ✅ **Lead fields** (name, email, phone—all required, phone validated with libphonenumber)
- ✅ **6-language support** (EN, FR, GR, SP, HE, RU with GeoIP auto-detect)
- ✅ **No monetization from users** (free checks, money from leads only)
- ✅ **No display ads**
- ✅ **No Zapier/CRM integration** (Phase 1 = manual process)
- ✅ **Phase 1 = HTTP + HTML parsing only** (no JavaScript execution; defer to Phase 3)

---

## What You Own

You make all architectural decisions:
- Database choice (I suggested PostgreSQL; MySQL/MongoDB OK if you prefer)
- Frontend framework (I suggested React; Vue/Svelte OK if you prefer)
- Hosting approach (I suggested Lambda; ECS/Kubernetes OK if you prefer)
- Monitoring solution (I suggested CloudWatch + Sentry free; other free tools OK)
- i18n approach (I suggested i18next; gettext/custom JSON OK if you prefer)
- Code organization, testing strategy, DevOps approach, deployment automation

**Constraint**: Must hit the 4 critical success criteria above.

---

## Documents to Reference

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **ARCHITECTURE.md** | Tech stack choices, data flow, database schema, API design, cost breakdown | 20 min |
| **IMPLEMENTATION_PLAN.md** | Week-by-week breakdown with specific deliverables, blockers, checklists | 30 min |
| **PRODUCT_REQUIREMENTS_DOCUMENT.md** | Full product spec (scoring algorithm, business model, roadmap) | 40 min |
| **TECHNICAL_SPECIFICATION.md** | Pseudocode, SQL schema, cache logic, rate-limiting pseudocode | 30 min |
| **ENGINEER_HANDOFF.md** | Overview for staff engineer, key decisions, success criteria | 20 min |

---

## The Scoring Algorithm (TL;DR)

Four dimensions (0-100 total):
1. **Crawlability (30 pts)**: Can AI bots access? (robots.txt, noindex, sitemap, auth, speed, redirects)
2. **Content Structure (35 pts)**: Proper markup? (semantic HTML, metadata, Open Graph, JSON-LD, mobile-friendly)
3. **Technical SEO (25 pts)**: Clean infra? (canonical tags, HTTPS, clean URLs, <3s load, no-JS content)
4. **Content Quality (10 pts)**: Substance? (>300 char content, internal links)

**Penalties**: -30 (blocked by robots/noindex), -25 (auth/unreachable), -15 (redirects/timeout)

That's it. Implement exactly this, validate on 20 test websites, done.

---

## The Lead Capture Flow

```
User enters URL
    ↓
AIScore analyzes (2-5 seconds, cached or fresh)
    ↓
Results page shows score + dimension breakdown + issues
    ↓
Form appears: "Get Your AEO Action Plan"
    ├─ Required: Name, Email, Phone (strictly validated)
    ├─ Submit button
    ↓
User clicks submit
    ├─ Check rate-limit (max 5/day per IP)
    ├─ Validate email format + domain
    ├─ Validate phone format (libphonenumber, strict)
    ├─ Insert into DB (leads table)
    ├─ Send confirmation email ("Thank you! We'll follow up soon.")
    └─ Return success message
    ↓
Sales team manually reviews leads table or exports CSV
    ├─ All leads have validated phone numbers
    └─ Reach out to qualified leads (Phase 2: add automation/Zapier if needed)
```

That's the entire flow. No Zapier, no CRM integration, no fancy workflow. Keep it simple.

---

## Phase 1 Definition of Done

You're done when:

1. ✅ Scoring validation test passes (90% accuracy on 20 websites)
2. ✅ LLM crawler verification complete (robots.txt, sitemap, og:*, manual tests)
3. ✅ Performance testing passes (p99 <3s under 100 concurrent users)
4. ✅ Security audit passes (no SQL injection, XSS, or CSRF)
5. ✅ Cost analysis shows <$0.01 per check
6. ✅ 100-150 leads captured (can be over 4 weeks)
7. ✅ Email confirmation delivery verified
8. ✅ Deployed to production (https://aiscore.co working)

---

## Your First Steps (Today)

1. **Read ARCHITECTURE.md** (20 min) — Understand tech stack + deployment plan
2. **Read IMPLEMENTATION_PLAN.md** (30 min) — See the full 4-week breakdown
3. **Ask clarifying questions** — Better to clarify now than discover ambiguity in Week 3
4. **Propose adjustments** — If you disagree with any tech stack choices, say now
5. **Start Week 1** — Set up GitHub repo, scaffold Node.js + React projects, create database schema

---

## Available for Questions

Everything in this handoff has been thought through:
- Scoring algorithm ✅
- Database schema ✅
- Rate-limiting logic ✅
- Cache strategy ✅
- API design ✅
- Security approach ✅
- Cost targets ✅
- 4-week timeline ✅

If anything is unclear, ambiguous, or you disagree, let's discuss now.

---

## Stretch Goals (Phase 2 Planning)

Once Phase 1 is live:
- Add 4 more languages (Hebrew, Russian, German, Spanish)
- Scale to 500+ checks/day
- Establish partnerships with search engines (Claude, GPT)
- Enterprise tool white-label integrations (Ahrefs, SEMrush)
- Website builder integrations (Wix, Webflow)
- Direct CRM API integration (replace manual process)
- Premium tier ($29-49/month for detailed reports, API access)
- Revenue from leads: $100-200/lead × 500+ leads/week = $50K-100K/month

---

## Good Luck

You have everything you need. This is a well-scoped MVP with clear success criteria.

Let's build something great. 🚀

---

**Document Version**: 1.0
**Status**: Ready for Implementation
**Last Updated**: 2026-03-26
