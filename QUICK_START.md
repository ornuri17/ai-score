# AIScore - Quick Start Guide (Phase 1)

**Your mission**: Build an AI website scoring tool that sells leads to AEO agencies.

---

## 🎯 What You're Building (TL;DR)

1. **Free tool**: Users paste a URL, get a 0-100 AI-friendliness score
2. **Score breakdown**: 4 dimensions (crawlability, content, technical, quality)
3. **Lead capture**: Form asks for **name, email, phone** (strictly validated)
4. **Monetization**: Sell leads to AEO agencies for $100-200 each
5. **Timeline**: 4 weeks to MVP, 100-150 leads, <$0.01/check cost

---

## ✅ Tech Stack (Confirmed)

```
Backend:  Node.js + Express + TypeScript
Frontend: React 18 + Vite + Tailwind CSS
Database: PostgreSQL (RDS t3.micro)
Cache:    Redis (ElastiCache cache.t3.micro, 24h + 7d fallback)
Hosting:  AWS Lambda + API Gateway + CloudFront
Validation: libphonenumber-js (phone validation)
```

---

## 📋 Critical Phase 1 Blockers (You Must Hit These)

1. ✅ **Scoring Accuracy**: 18/20 test websites within ±10 points (90% pass rate)
2. ✅ **LLM Crawlability**: robots.txt, sitemap.xml, og:* tags verified
3. ✅ **Performance**: p99 <3s under 100 concurrent users
4. ✅ **Cost**: <$0.01 per check (actual AWS billing)

---

## 🔑 Key Decisions (Non-Negotiable)

| Item | Decision |
|------|----------|
| **Lead Form** | Name + Email + Phone (phone: libphonenumber validation) |
| **Zapier** | NO in Phase 1 (manual sales only) |
| **Cache TTL** | 24 hours primary, 7 days fallback |
| **Rate-Limits** | IP: 50/day, Form: 5/day |
| **Languages** | EN + FR in Phase 1 (6 languages in Phase 2+) |
| **JS Rendering** | NO (Phase 1 = HTML parsing only; Phase 3 = JS) |

---

## 📅 Week-by-Week Breakdown

### Week 1: Backend + Scoring (12 hours)
- [ ] Database + Prisma ORM
- [ ] `/api/analyze` endpoint
- [ ] Scoring algorithm (30+35+25+10)
- [ ] Rate-limiting + caching
- [ ] **BLOCKER**: Scoring validation test (90% accuracy on 20 websites)

### Week 2: Frontend + Form (10 hours)
- [ ] React homepage (URL input)
- [ ] Results page (score display, breakdown, issues)
- [ ] Lead form (name, email, phone with libphonenumber validation)
- [ ] i18n setup (EN + FR)
- [ ] Social sharing (LinkedIn + X)

### Week 3: Deploy + Test (12 hours)
- [ ] Deploy to AWS Lambda + RDS + ElastiCache
- [ ] CloudWatch monitoring setup
- [ ] Performance testing (p99 <3s)
- [ ] **BLOCKER**: LLM crawler verification
- [ ] Security audit (SQL injection, XSS)

### Week 4: Polish + Launch (8 hours)
- [ ] Bug fixes
- [ ] Cost analysis (verify <$0.01/check)
- [ ] Email delivery verification
- [ ] **LAUNCH**

---

## 🗓️ Scoring Algorithm (Simple Version)

```
Total = 100 points

Crawlability (30 pts):
  ✅ robots.txt allows crawlers → +5
  ✅ No noindex tag → +5
  ✅ No auth required → +5
  ✅ Sitemap.xml exists → +5
  ✅ Fast (<10s) → +5
  ✅ No infinite redirects → +5

Content Structure (35 pts):
  ✅ Semantic HTML → +4
  ✅ Meta description (160-200 chars) → +4
  ✅ Title tag (30-60 chars) → +4
  ✅ Open Graph tags → +4
  ✅ JSON-LD schema → +5
  ✅ Publication/update date → +4
  ✅ Mobile-friendly → +4
  ✅ Language tag → +2

Technical SEO (25 pts):
  ✅ Canonical tag → +5
  ✅ HTTPS enforced → +5
  ✅ Clean URLs (no query params) → +5
  ✅ Page load <3s → +5
  ✅ Content without JS → +5

Content Quality (10 pts):
  ✅ >300 character main content → +5
  ✅ >2 internal links → +5

Penalties:
  -30: Blocked by robots/noindex
  -25: Requires auth or unreachable
  -15: Too many redirects or timeout

Final Score = min(100, max(0, base_score + penalties))
```

---

## 📊 Lead Form (What You Build)

```
Form Fields (all required):
  □ Name (text input)
  □ Email (validate format + domain)
  □ Phone (libphonenumber strict validation)
  □ Submit button

On Submit:
  1. Check rate-limit (max 5/day per IP)
  2. Validate all fields server-side
  3. Insert into DB
  4. Send confirmation email
  5. Return success

No Zapier. No CRM integration. Just store in DB.
Sales team exports CSV or reviews leads table.
```

---

## 🔍 What "SPA Score 30-50" Means

Single-Page Apps (React, Vue, Angular) without JSON-LD schema:
- Score 30-50/100 because you only parse HTML (no JS execution)
- User sees: "Tip: Add JSON-LD schema to improve your score"
- Phase 3 will add Puppeteer for JS rendering

**This is OK**. Your AEO customers understand Phase 1 limitations.

---

## 💰 Budget Reality Check

**Not** $0.004/check. **Actually** $0.01-0.013/check.

Breakdown at 1000 checks/day:
- Lambda: $50/mo
- RDS: $30/mo
- Redis: $30/mo
- CloudFront: $15/mo
- SendGrid (email): $20/mo
- Data transfer: $10/mo
- **Total: $155-300/mo**

**Track from Day 1** with CloudWatch dashboard.

---

## 📁 Key Files to Know

| File | Purpose |
|------|---------|
| `docs/engineering/STAFF_ENGINEER_SUMMARY.md` | 10-min overview (read first) |
| `docs/engineering/ARCHITECTURE.md` | Tech stack + API design (20 min) |
| `docs/engineering/IMPLEMENTATION_PLAN.md` | Week-by-week breakdown (30 min) |
| `docs/engineering/TECHNICAL_SPECIFICATION.md` | Pseudocode + schema |
| `docs/engineering/DECISIONS_CONFIRMED.md` | All decisions resolved |
| `docs/product/PRODUCT_REQUIREMENTS_DOCUMENT.md` | Full product spec (40 min) |

---

## ⚡ First Steps (Right Now)

1. Create GitHub repo with Node.js + Express boilerplate
2. Create `.env.example` with all config variables
3. Set up AWS account:
   - [ ] RDS PostgreSQL t3.micro
   - [ ] ElastiCache Redis cache.t3.micro
   - [ ] Lambda role configured
4. Install dependencies:
   ```bash
   npm install express typescript cors dotenv
   npm install pg prisma @prisma/client
   npm install redis ioredis
   npm install cheerio axios lodash
   npm install libphonenumber-js  # <-- Phone validation
   ```
5. Create Prisma schema with 3 tables: `checks`, `leads`, `rate_limits`

---

## 🎯 Success Criteria (Week 4)

You're done when:
- ✅ 18/20 scoring test websites pass (±10 points)
- ✅ LLM crawlers can access & cite results
- ✅ p99 latency <3s under 100 concurrent users
- ✅ <$0.01 per check cost
- ✅ 100-150 leads captured
- ✅ No SQL injection/XSS vulnerabilities
- ✅ Deployed to production

---

## 📞 Questions?

1. Read `docs/engineering/DECISIONS_CONFIRMED.md` (all ambiguities resolved)
2. Check `docs/engineering/IMPLEMENTATION_PLAN.md` for week-by-week details
3. Review `docs/engineering/TECHNICAL_SPECIFICATION.md` for pseudocode

**You have everything you need. Let's build.** 🚀

---

**Status**: Ready for Week 1
**Last Updated**: 2026-03-26
