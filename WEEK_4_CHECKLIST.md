# AIScore - Week 4 Checklist (Polish + Launch)

**Duration**: 5 work days (~8 hours/day)
**Blocker**: All Week 3 blockers must be cleared
**Success**: Public launch with 100-150 leads captured in first month

---

## Parallel Execution Overview

```
Day 1: Pre-launch audit (SEMI-BLOCKING — surfaces issues for other streams)
       ↓
Day 2-3: PARALLEL STREAMS
  Stream A: Bug fixes + UX polish
  Stream B: Email delivery + lead pipeline verification
  Stream C: Cost analysis + optimization
  Stream D: Launch prep (landing page copy, social, outreach)
Day 4: Soft launch (internal + beta users)
Day 5: Public launch + monitoring
```

**Dependency Summary**:
- Day 1 audit surfaces issues → informs Streams A, B, C in parallel
- Streams A, B, C are independent of each other
- Stream D (launch prep) is fully independent — can start Day 1
- Day 4 soft launch requires Streams A+B complete
- Day 5 public launch requires Day 4 soft launch feedback addressed

---

## Day 1: Pre-Launch Audit (Semi-Blocking)

> **Run this before fixing anything. Surfaces all remaining issues.**
> Stream D can start in parallel — it has no dependencies.

### Full E2E Smoke Test (Production)
- [ ] Test complete user journey 5 times on production:
  1. [ ] Open `https://aiscore.io` (verify loads in <1s)
  2. [ ] Enter a URL and submit
  3. [ ] Score appears in <3s
  4. [ ] Score breakdown visible
  5. [ ] Lead form appears with correct fields (name, email, phone)
  6. [ ] Submit lead form
  7. [ ] Confirmation message shown
  8. [ ] Confirmation email received (within 2 min)
- [ ] Test both EN + FR languages
- [ ] Test on mobile (iPhone Safari + Android Chrome)
- [ ] Test on desktop (Chrome + Firefox + Safari)

### Accessibility Check
- [ ] Run Lighthouse in Chrome DevTools (target: >90 score)
  - [ ] Performance: >85
  - [ ] Accessibility: >90
  - [ ] Best Practices: >90
  - [ ] SEO: >90
- [ ] Fix any critical a11y failures (missing alt text, contrast, focus)

### Lead Data Audit
- [ ] Check `leads` table in RDS:
  ```sql
  SELECT COUNT(*), created_at::date FROM leads GROUP BY 2 ORDER BY 2 DESC;
  ```
- [ ] Verify all test leads have valid phone numbers
- [ ] Verify email delivery rate (check SendGrid dashboard)
- [ ] Export sample CSV, verify format matches what sales team expects

### Known Bug List
- [ ] Create `BUGS.md` with all issues found during audit
- [ ] Prioritize: P0 (launch blocker), P1 (must fix before launch), P2 (post-launch)
- [ ] P0 bugs must be in Stream A before Day 4

**Time**: 4 hours
**Output**: Bug list prioritized, feeds into Streams A+B+C

---

## Stream A: Bug Fixes + UX Polish
**Depends on**: Day 1 audit (for bug list)
**Independent of**: Streams B, C, D
**Time**: 8 hours (1 engineer)

### P0 Bug Fixes
- [ ] Fix all P0 bugs from Day 1 audit (launch blockers)
- [ ] Each fix: write test case to prevent regression
- [ ] Deploy fixes to production after each batch

### Score Display Polish
- [ ] Score number animates up from 0 (CSS animation, not JS)
- [ ] Color coding clear:
  - 0-40: red (#EF4444)
  - 41-69: amber (#F59E0B)
  - 70-89: green (#22C55E)
  - 90-100: emerald (#10B981)
- [ ] Each dimension has progress bar (not just number)
- [ ] Issues list formatted as bullet points with icons

### Lead Form UX
- [ ] Form validation shows inline errors (not alert())
- [ ] Phone field shows format hint: "e.g. +1 555 123 4567"
- [ ] Submit button shows loading state while submitting
- [ ] Success message: "Got it! We'll be in touch." (not generic)
- [ ] Error message specific: "Invalid phone number — try +1 followed by your number"
- [ ] Test invalid phone formats:
  - [ ] "123" → rejected with specific error
  - [ ] "555-1234" → rejected (no country code)
  - [ ] "+1 555 123 4567" → accepted
  - [ ] "+44 20 7946 0958" → accepted (UK number)

### Mobile Responsiveness
- [ ] Test on iPhone 14 (375px) — no horizontal scroll
- [ ] Test on iPad (768px) — layout still readable
- [ ] Score breakdown stacks vertically on mobile
- [ ] Lead form inputs have `font-size: 16px` (prevents iOS zoom)
- [ ] Submit button is 48px tall (touch target)

### Loading States
- [ ] URL form shows skeleton/spinner while analyzing (not blank)
- [ ] Score result fades in smoothly (no flash)
- [ ] Lead form shows "Submitting..." during POST
- [ ] Error state shown clearly (not just console.error)

### Edge Cases
- [ ] Test URL with trailing slash: `https://example.com/`
- [ ] Test URL with www: `https://www.example.com`
- [ ] Test very slow site (>8s) — timeout message shown
- [ ] Test unreachable site — error message shown
- [ ] Test noindex site — score shown (≤30), explanation shown

**Output**: All P0 bugs fixed, UX polished, mobile tested

---

## Stream B: Email Delivery + Lead Pipeline Verification
**Depends on**: Day 1 audit (for any email issues found)
**Independent of**: Streams A, C, D
**Time**: 5 hours (1 engineer)

### Email Delivery Verification
- [ ] Send test lead from production form
- [ ] Check SendGrid delivery dashboard:
  - [ ] Email delivered (not bounced)
  - [ ] Email not in spam
  - [ ] Delivery time <60 seconds
- [ ] Test with Gmail, Outlook, Yahoo (major providers)
- [ ] Check SPF record: `dig TXT aiscore.io | grep spf`
- [ ] Check DKIM configured in SendGrid + DNS
- [ ] Check DMARC record: `dig TXT _dmarc.aiscore.io`

### Email Template Polish
- [ ] Confirmation email content (check `src/services/email.ts`):
  ```
  Subject: Your AIScore results for {domain}

  Hi {name},

  Your AIScore for {domain}: {score}/100

  View your full report: https://aiscore.io

  — The AIScore Team
  ```
- [ ] Email renders correctly in Gmail dark mode
- [ ] Email has plain text fallback (not HTML-only)
- [ ] Unsubscribe link included (CAN-SPAM compliance)

### Lead Pipeline Test
- [ ] Submit 5 test leads with different profiles:
  - [ ] Lead 1: Valid US phone (+1...)
  - [ ] Lead 2: Valid UK phone (+44...)
  - [ ] Lead 3: Valid CA phone (+1...)
  - [ ] Lead 4: Invalid phone → form rejects, no DB insert
  - [ ] Lead 5: Duplicate email for same check → DB rejects (unique constraint)
- [ ] Check `leads` table after each: correct data stored
- [ ] Export CSV of all 5 leads, verify format

### Lead Export Process
- [ ] Document how sales team exports leads:
  ```sql
  -- Weekly lead export
  SELECT l.name, l.email, l.phone, c.domain, c.score, l.created_at
  FROM leads l
  JOIN checks c ON c.id = l.check_id
  WHERE l.created_at >= NOW() - INTERVAL '7 days'
  ORDER BY l.created_at DESC;
  ```
- [ ] Create `docs/ops/LEAD_EXPORT.md` with:
  - [ ] How to run the export query
  - [ ] How to copy to CSV
  - [ ] What to send to agency buyers

### Rate-Limit on Form Submission
- [ ] Test: submit 6 leads from same IP in one day
  - [ ] Leads 1-5: accepted
  - [ ] Lead 6: rejected with 429
- [ ] Verify rate-limit resets at UTC midnight

**Output**: Email delivery verified, lead pipeline confirmed end-to-end

---

## Stream C: Cost Analysis + Optimization
**Depends on**: Day 1 (for production traffic data)
**Independent of**: Streams A, B, D
**Time**: 4 hours (1 engineer)

### Baseline Cost Measurement
- [ ] Pull AWS Cost Explorer data for past 7 days
- [ ] Break down by service:
  - [ ] Lambda: $X
  - [ ] RDS: $X
  - [ ] ElastiCache: $X
  - [ ] CloudFront: $X
  - [ ] API Gateway: $X
  - [ ] Data Transfer: $X
- [ ] Calculate total checks in same period (CloudWatch logs)
- [ ] Calculate: cost per check = total_cost / total_checks
- [ ] **Target**: <$0.01/check

### Optimize if Over Budget
- [ ] If Lambda cost too high:
  - [ ] Reduce memory from 512MB to 256MB (test still passes p99 <3s)
  - [ ] Check for memory leaks (`heapdump` in Lambda)
- [ ] If RDS cost too high:
  - [ ] Verify connection pooling active (max 5 connections)
  - [ ] Check for missing indexes (slow query log)
- [ ] If Redis cost too high:
  - [ ] Verify cache hit rate >40% (CloudWatch)
  - [ ] Check key TTL set correctly (24h)

### Cache Hit Rate Analysis
- [ ] Pull from CloudWatch logs:
  ```
  # Cache hit rate
  fields cached
  | stats count() as total, sum(cached=true) as hits by bin(1h)
  | project hit_rate = hits/total*100
  ```
- [ ] Target: >40% cache hit rate
- [ ] If low: investigate if same domains being re-checked within 24h

### Cost Projection
- [ ] At 1000 checks/day:
  - [ ] Lambda: ~$50/mo
  - [ ] RDS: ~$30/mo
  - [ ] Redis: ~$30/mo
  - [ ] CloudFront: ~$15/mo
  - [ ] SendGrid: ~$20/mo
  - [ ] Data transfer: ~$10/mo
  - [ ] **Total**: ~$155-300/mo
- [ ] At 10000 checks/day: estimate scaling costs
- [ ] Document in `docs/ops/COST_ANALYSIS.md`

**Output**: Cost per check calculated, optimization applied if needed

---

## Stream D: Launch Prep (Fully Independent)
**Depends on**: Nothing (can start Day 1)
**Independent of**: Streams A, B, C
**Time**: 6 hours (1 engineer)

> **This stream is fully independent. Start Day 1 in parallel with audit.**

### Landing Page Copy Review
- [ ] Hero copy: "How AI-Ready Is Your Website? Check In 30 Seconds."
- [ ] Subhead: "Free tool used by AEO agencies to evaluate client websites."
- [ ] CTA button: "Check My Website" (not "Submit")
- [ ] Social proof section (add after first 10 leads):
  - "Trusted by X AEO agencies"
  - Sample scores from well-known sites
- [ ] FAQ section:
  - "What is AI-readiness?" (explain AEO)
  - "How is the score calculated?" (brief algorithm summary)
  - "Why is my score low?" (link to improvement tips)
  - "Is my data stored?" (privacy reassurance)

### Privacy + Legal
- [ ] Create `public/privacy-policy.html` (or `/privacy` route):
  - [ ] What data is collected (domain, score, name, email, phone)
  - [ ] How it's used (internal scoring + lead gen)
  - [ ] Retention policy (leads kept for 12 months)
  - [ ] Contact email for data deletion requests
- [ ] Create `public/terms.html`:
  - [ ] Tool is provided "as-is"
  - [ ] No guarantee of score accuracy
  - [ ] Rate-limits + fair use policy
- [ ] Add footer links: Privacy Policy | Terms of Service
- [ ] Lead form: add checkbox "I agree to the Privacy Policy" (required)

### Social Content Prep
- [ ] Write 5 LinkedIn posts for launch week:
  - [ ] Day 1: "We built a free tool to check if AI can read your website"
  - [ ] Day 2: Share example score (screenshot)
  - [ ] Day 3: "Why SPAs score lower (and how to fix it)"
  - [ ] Day 4: "What is AEO and why it matters in 2026"
  - [ ] Day 5: "We got X checks in our first week"
- [ ] Write 5 X/Twitter posts (shorter versions)
- [ ] Schedule posts in Buffer or similar

### AEO Agency Outreach List
- [ ] Build list of 20 AEO agencies to contact at launch:
  - [ ] Agency name, contact name, email, LinkedIn URL
  - [ ] Personalize pitch: "Check your client sites free"
- [ ] Draft outreach email template:
  ```
  Subject: Free tool to check your clients' AI-readiness

  Hi {name},

  We built a free tool that scores websites for AI-friendliness...
  Try it: https://aiscore.io

  If you're getting clients interested in AEO, we'd love to
  provide scored leads directly to your agency.

  Happy to jump on a 15-min call.
  ```
- [ ] Do NOT send until Day 4 soft launch is stable

### Product Hunt Prep (Optional)
- [ ] Create Product Hunt account + claim product
- [ ] Write tagline: "Free AI-readiness score for any website"
- [ ] Prepare 5 screenshots (homepage, score, breakdown, mobile, EN/FR)
- [ ] Choose launch day: ideally Tuesday or Wednesday (highest traffic)
- [ ] Line up 10 upvotes from network before launch

**Output**: Launch materials ready, agency outreach list built, privacy docs live

---

## Day 4: Soft Launch (Internal + Beta)

> **Depends on**: Streams A+B complete, Stream D ready
> **Goal**: Catch remaining issues with real users before public launch

### Beta User Group (5-10 people)
- [ ] Send to personal network: agency contacts, founder friends, colleagues
- [ ] Ask them to:
  - [ ] Check 3 websites
  - [ ] Submit lead form
  - [ ] Screenshot any bugs or weird scores
- [ ] Collect feedback in shared doc or Slack channel

### Monitor in Real-Time
- [ ] Keep CloudWatch dashboard open
- [ ] Watch for:
  - [ ] Error rate spikes
  - [ ] Lambda timeouts
  - [ ] DB connection issues
  - [ ] Rate-limit false positives
  - [ ] Email delivery failures
- [ ] Have rollback plan: previous Lambda version pinned in console

### Fix Beta Feedback
- [ ] Triage all feedback from beta users (2 hours)
- [ ] Fix any P0 issues immediately
- [ ] Document P1/P2 for post-launch
- [ ] Deploy hotfix if needed

### Soft Launch Metrics
- [ ] Total checks: X
- [ ] Total leads captured: X
- [ ] Average score: X
- [ ] Error rate: X%
- [ ] p99 latency: Xms
- [ ] Email delivery rate: X%

---

## Day 5: Public Launch

> **Depends on**: Day 4 soft launch stable (no P0 bugs remaining)
> **Goal**: First 100 checks from real users

### Launch Sequence (in order)
- [ ] 9am: Post first LinkedIn article
- [ ] 9:15am: Post on X/Twitter
- [ ] 9:30am: Send agency outreach emails (from list in Stream D)
- [ ] 10am: Post in relevant Slack communities / communities:
  - [ ] Indie Hackers
  - [ ] Product Hunt (if scheduling launch today)
  - [ ] AEO-focused Slack/Discord communities
  - [ ] SEO communities (Reddit r/SEO, etc.)
- [ ] 12pm: Check metrics, reply to all comments
- [ ] 3pm: Second LinkedIn post (share first day results)
- [ ] 5pm: End-of-day metrics snapshot

### Launch Day Monitoring
- [ ] Keep CloudWatch open all day
- [ ] Check every 30 min:
  - [ ] Error rate
  - [ ] Check volume
  - [ ] Lead capture rate
  - [ ] Lambda cold starts
- [ ] Have hotfix deploy ready (Lambda version rollback if needed)

### Launch Day Success Criteria
- [ ] 50+ checks in first 24 hours ✅
- [ ] 5+ leads captured ✅
- [ ] Error rate <2% ✅
- [ ] p99 <3s maintained ✅
- [ ] No P0 bugs ✅

---

## Post-Launch (Week 5+ Prep)

### What to Track (Week 1 After Launch)
- [ ] Daily check volume
- [ ] Daily lead capture count
- [ ] Lead conversion rate (checks → leads)
- [ ] Top domains checked (any patterns?)
- [ ] Top issues flagged (what do sites fail most?)
- [ ] Cost per check (actual, not projected)

### Phase 2 Planning Triggers
Start planning Phase 2 when:
- [ ] 100 leads captured
- [ ] First agency buyer signed (paying $100-200/lead)
- [ ] Cost per check stable at <$0.01
- [ ] 3+ consistent issues in user feedback (features to add)

Phase 2 candidates:
- Zapier/webhook integration for agencies
- JS rendering (Puppeteer) for SPA sites
- More languages (DE, ES, HE, RU)
- Agency dashboard (lead management UI)
- API access for agencies (white-label)

---

## End of Week 4 Checklist

### Launch Complete
- [ ] Public URL live: `https://aiscore.io`
- [ ] First 50 checks completed ✅
- [ ] First 5 leads captured ✅
- [ ] Privacy Policy + Terms live ✅
- [ ] All 4 Phase 1 blockers verified:
  - [ ] Scoring accuracy 18/20 ✅
  - [ ] LLM crawler verification ✅
  - [ ] p99 <3s ✅
  - [ ] <$0.01/check ✅

### Documentation
- [ ] `docs/ops/LEAD_EXPORT.md` — how to export leads
- [ ] `docs/ops/COST_ANALYSIS.md` — cost per check breakdown
- [ ] `docs/ops/RUNBOOK.md` — how to handle incidents
- [ ] `BUGS.md` — known P2 issues for Phase 2

### Phase 1 Retrospective (Optional)
- [ ] What took longer than expected?
- [ ] What was easier than expected?
- [ ] What would you do differently?
- [ ] Is the scoring algorithm good enough, or does it need tuning?

---

## Files Created This Week

```
docs/ops/
├── LEAD_EXPORT.md             (how to export leads as CSV)
├── COST_ANALYSIS.md           (cost per check breakdown)
└── RUNBOOK.md                 (incident response + rollback)

public/
├── privacy-policy.html        (data privacy policy)
└── terms.html                 (terms of service)

BUGS.md                        (known issues + backlog)
```

---

## Time Budget

| Task | Estimated | Actual | Notes |
|------|-----------|--------|-------|
| Day 1 (Audit) | 4h | ? | Semi-blocking |
| Stream A (Bug fixes) | 8h | ? | |
| Stream B (Email/Leads) | 5h | ? | |
| Stream C (Cost) | 4h | ? | |
| Stream D (Launch prep) | 6h | ? | Fully independent |
| Day 4 (Soft launch) | 6h | ? | |
| Day 5 (Public launch) | 4h | ? | |
| **Total** | **37 hours** | ? | ~5 days at 8h/day |

---

**Status**: Ready for Week 4
**Next**: Phase 2 planning begins when 100 leads captured
**Launch URL**: https://aiscore.io
