# AIScore - Confirmed Implementation Decisions

**Date**: 2026-03-26 (Updated from Staff Engineer Review)
**Status**: All critical decisions confirmed, ready for Week 1 implementation

---

## Summary of Confirmations

All ambiguities from the initial documentation have been resolved. These decisions are **non-negotiable** and documented across engineering specs.

---

## 1. Lead Form Fields (CONFIRMED)

### ✅ What You Get
- **Name** (required, text input)
- **Email** (required, email validation)
- **Phone** (required, strictly validated with libphonenumber)

### ✅ What's NOT Included
- ❌ Company
- ❌ Budget range
- ❌ Timeline
- ❌ CTO/decision-maker status
- ❌ Any other custom fields

**Why**: Minimal friction. Simpler form = higher conversion rate. You want quantity of leads, not depth of data at this stage.

**Validation**:
- Email: Format + domain validation (basic regex is OK)
- **Phone: libphonenumber library** (strict, international support, reject invalid formats with error message)

**Updated Docs**:
- ✅ STAFF_ENGINEER_SUMMARY.md (lines 36, 54, 96, 155)
- ✅ ARCHITECTURE.md (lines 104, 108, 223)
- ✅ IMPLEMENTATION_PLAN.md (lines 171, 173, 228-235)

---

## 2. No Zapier in Phase 1 (CONFIRMED)

### ✅ What You Build
Phase 1: **Manual sales process**
- Leads stored in PostgreSQL `leads` table
- Sales team exports CSV or views table directly
- No webhooks, no automation

### ✅ When Zapier Comes
Phase 2+: After proving PMF, add webhook integration
- POST to Zapier with lead data
- Eventually: Direct HubSpot/Salesforce API

**Why**: Keep Phase 1 simple. Focus on lead quality + cost efficiency first. Automation comes later.

**Updated Docs**:
- ✅ STAFF_ENGINEER_SUMMARY.md (line 37, 100)
- ✅ ARCHITECTURE.md (no Zapier section)
- ✅ Memory: technical_notes.md (Zapier → Phase 2+)

---

## 3. Phone Validation Method (CONFIRMED)

### ✅ Implementation Detail
```bash
npm install libphonenumber-js
```

**Frontend (React)**:
- Import libphonenumber validation
- Show real-time validation feedback: "Invalid phone number for region"
- Allow international formats: `+1-555-1234`, `(555) 123-4567`, etc.
- Reject invalid formats with clear error

**Backend (Node.js)**:
- Validate again server-side (don't trust client)
- Return 400 if invalid
- Store validated number in DB (VARCHAR 20)

**Why Strict**: Your lead buyers (AEO agencies) need valid phone numbers. Garbage data = bad leads = bad reputation.

**Updated Docs**:
- ✅ ARCHITECTURE.md (line 223, added to dev setup)
- ✅ IMPLEMENTATION_PLAN.md (lines 171, 173, 229-235)

---

## 4. SPA Scoring Penalty Confirmed (IMPORTANT)

### ✅ What Happens
Single-Page Apps (React, Vue, Angular, etc.) without JSON-LD schema score **30-50/100** in Phase 1.

**Why**: Phase 1 limitation—you only do HTTP + HTML parsing. No JavaScript execution. Without schema markup, AI bots can't see SPA content.

**What You Do**:
- Document this prominently in results page
- Show message: "Tip: This site uses JavaScript heavily. Add JSON-LD schema to your HTML <head> to improve your score."
- Make it clear to users this is a Phase 1 limitation, Phase 3 will add JS rendering

**Confirmation**: SPAs with schema (e.g., Next.js with JSON-LD) score 65-85/100. SPAs without schema score 30-50/100. This is **acceptable** for your Phase 1 ICP (AEO agencies will understand the limitation).

---

## 5. Cache Strategy Confirmed

### ✅ What You Build
- **Primary**: Redis with 24-hour TTL
- **Fallback**: 7-day DB cache (if Redis down)
- Cache hit target: >40% by end of Phase 1

**Key Format**: `check:${domain_normalized}:v1`

**What This Means**:
- Same domain checked twice in 24h? Serve cached result (<100ms)
- User hits "Refresh Now"? Fresh analysis (2-5s)
- Redis down? Use DB cache (slower but functional)

---

## 6. Rate-Limiting Confirmed

### ✅ 2 Layers Only
- **Layer 1**: IP-based 50 checks/day
- **Layer 2**: Form submission 5 leads/day per IP

### ❌ What's NOT Included
- Domain rate-limiting (removed—irrelevant with 24h cache)
- Email rate-limiting (covered by form layer)

**Storage**: Redis keys reset at UTC midnight

---

## 7. Cost Target Confirmed

### ✅ What We're Aiming For
- Target: **<$0.01 per check** (aggressive but achievable)
- Realistic: **$0.01-0.013 per check** with overhead
- At 1000 checks/day: **$300-400/month** (not $125)

### ✅ What You Track
From Day 1 of Week 1, build a CloudWatch dashboard:
- Cost per check (actual AWS billing)
- Cache hit rate
- Error rate
- p99 latency

**Why**: Cost is a success criteria. Can't wait until Week 4 to discover you're at $0.05/check.

---

## 8. i18n Scope Confirmed

### ✅ Phase 1
- English (EN)
- French (FR)
- GeoIP auto-detect + manual language selector
- Bundle size <100KB

### ✅ Phase 2
- Add 4 more: German (GR), Spanish (SP), Hebrew (HE), Russian (RU)

---

## 9. No Other Confirmation Needed

### ✅ Already Confirmed in Initial Docs
- Scoring algorithm (30+35+25+10 = 100)
- Database schema (PostgreSQL, RDS t3.micro)
- Stack (Node.js, Express, React, Vite, Tailwind)
- API design (`/api/analyze`, `/api/leads`)
- Deployment (AWS Lambda, CloudFront, RDS, Redis)
- Success criteria (4 blockers: accuracy, cost, LLM crawlability, security)

---

## 10. What Changed from Original Docs

| Original Doc | Conflict | Resolution |
|---|---|---|
| STAFF_ENGINEER_SUMMARY line 96 | "name, email only" | **Changed to: name, email, phone** |
| Memory: technical_notes line 33 | "company, budget_range, timeline" | **Removed—confirmed simple form** |
| Memory: technical_notes line 80 | "Zapier webhook needed" | **Removed—Phase 2+ only** |
| Various docs | No phone validation method specified | **Added: libphonenumber library** |

---

## Implementation Checklist

### Before Week 1 Starts
- [ ] Update git repo description: "Phase 1: MVP with name/email/phone form, libphonenumber validation"
- [ ] Add `libphonenumber-js` to `package.json` (backend + frontend)
- [ ] Create CloudWatch dashboard template for cost tracking
- [ ] Confirm RDS t3.micro + ElastiCache cache.t3.micro + Lambda settings in AWS account

### Week 1 Gate
- Scoring validation test: 18/20 websites within ±10 points ✅

### Week 3 Gate
- LLM crawler verification: robots.txt, sitemap.xml, og:* tags ✅

### Week 4 Gate (Before Launch)
- Cost analysis: <$0.01 per check ✅
- Security audit: no SQL injection/XSS ✅

---

## Final Notes

✅ **All critical ambiguities resolved**
✅ **Docs updated across all engineering specs**
✅ **Memory updated to reflect confirmed decisions**
✅ **Ready for Week 1 implementation**

Any future questions about implementation details? Refer to:
1. This file (DECISIONS_CONFIRMED.md) — high-level decisions
2. ARCHITECTURE.md — tech stack + API design
3. IMPLEMENTATION_PLAN.md — week-by-week breakdown
4. TECHNICAL_SPECIFICATION.md — pseudocode + schema

---

**Status**: ✅ Ready to Start Week 1
**Last Updated**: 2026-03-26
**Version**: 1.0
