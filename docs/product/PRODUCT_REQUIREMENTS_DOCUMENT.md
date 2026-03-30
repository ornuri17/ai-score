# AIScore - Product Requirements Document

## Executive Summary

**AIScore** is a lightweight, AI-powered website analysis tool that scores how "AI-friendly" any website is on a 0-100 scale. It identifies barriers preventing websites from being discovered, indexed, and understood by Large Language Models (LLMs) and AI systems.

**Vision**: Become the gold-standard AEO (AI Engine Optimization) diagnostic tool for website owners seeking to increase their visibility and relevance in the era of AI-powered search, discovery, and content consumption.

**Business Model**:
- **Phase 1**: Free checks → lead capture → sell leads to AEO agencies ($100-200/lead)
- **Phase 2+**: Add affiliate commissions (tool recommendations) + premium tier (detailed reports, API, tracking)
- **Phase 4+**: Enterprise partnerships (white-label, licensing)
- **Explicitly excludes**: Display ads (low margin, poor UX, damages authority)

**Target User**: Website owners, marketing teams, and agencies looking to improve their websites' discoverability by AI systems and LLMs.

---

## Problem Statement

Website owners increasingly recognize that traditional SEO is insufficient—LLMs now consume and rank content independently of Google. However, most have no insight into whether their site is "AI-friendly":
- Are their pages crawlable by AI systems?
- Is content properly structured for AI understanding?
- Do they have the metadata, schema markup, and content patterns that help LLMs discover and trust their content?

**Current friction**: Answers require expensive audits or deep technical expertise. AIScore removes this barrier with instant, free diagnosis.

---

## Product Overview

### Core Value Proposition

1. **Instant AEO Score** (0-100): One-click diagnosis of website AI-friendliness
2. **Actionable Insights**: High-level issue categories—not detailed how-tos—that identify problems and nudge users toward solutions
3. **Lead Capture**: Seamless email/contact form integrated post-score to convert curious users into sales conversations
4. **Multilingual UX**: Auto-detected language (EN, FR, GR, SP, HE, RU) ensures global accessibility
5. **Professional Branding**: Industry-leading design that positions AIScore as the *authority* in AEO

---

## Detailed Requirements

### 1. Core Functionality

#### 1.1 URL Input & Analysis
- **Input**: Single text field accepting any website URL
- **Validation**:
  - Check URL format (HTTP/HTTPS)
  - Normalize URLs (trailing slashes, www variants)
  - Reject obviously malicious patterns (early spam prevention)
  - Rate-limit per IP, domain, and authenticated user
- **Analysis Engine**:
  - Fetch website using headless browser or HTTP client (with timeout: 10-15 seconds)
  - Parse HTML, metadata, and structured data
  - Assess crawlability, content structure, and technical factors (see Section 1.2)

#### 1.2 Scoring Algorithm

**Formula** (0-100 scale):
```
base_score = (crawlability_pts + content_pts + technical_pts + quality_pts)

// Apply critical penalties (order matters)
if (noindex_detected OR robots_blocks_crawlers):
  final_score = max(0, base_score - 30)
else if (site_unreachable OR auth_required):
  final_score = max(0, base_score - 25)
else if (excessive_redirects OR timeout):
  final_score = max(0, base_score - 15)
else:
  final_score = base_score

// Floor: ensure score never exceeds 100
return min(100, final_score)
```

**Important Phase 1 Limitation**:
- Phase 1 uses HTTP + HTML parsing only (no JavaScript execution)
- Sites heavily dependent on client-side rendering (React SPAs, Vue apps, etc.) will appear less AI-friendly because dynamic content isn't visible to the parser
- **Expected impact**: SPAs without JSON-LD schema markup may score 30-50% lower than they should
- **User guidance**: In results, we recommend: "Add JSON-LD schema.org markup to your HTML `<head>` (static, executable without JS) to improve your score without changing your app"
- **Phase 3 upgrade**: JavaScript rendering will be added for more accurate analysis of dynamic sites
- **Validation strategy**: By end of Week 1, engineer will test on 20 real websites (mix of static sites, SPAs, media sites, e-commerce) with expected score ranges documented. Actual scores must fall within ±10 points of expected ranges. Any anomalies trigger algorithm review.

**Dimension Scoring Breakdown**:

#### 1.2 AEO Scoring Dimensions
The 0-100 score is derived from:

**A. LLM Crawlability & Accessibility (30 points)**
- [5 pts] Robots.txt allows AI crawlers (Googlebot, GPTBot, Claude-web, Bingbot, etc.)
- [5 pts] No noindex meta tag blocking indexation
- [5 pts] No nofollow on key links (internal navigation, category links)
- [5 pts] Site is not behind authentication or paywall (public content accessible)
- [5 pts] Server responds with HTTP 200 within 10 seconds (no timeouts, <5 redirects)
- [5 pts] XML sitemap.xml present and valid (enables crawl discovery)

**Phase 1 implementation note**: The crawler makes 3 parallel requests per check:
- Main page HTML (for all scoring dimensions)
- `/robots.txt` — parsed for AI bot blocking (GPTBot, ClaudeBot, PerplexityBot) and Sitemap directives
- `/sitemap.xml` — checked for existence and URL count

**AI Crawler Blocking Penalty**: If `robots.txt` explicitly blocks GPTBot, ClaudeBot, PerplexityBot, or all user-agents, a -20 penalty is applied and `ai_crawlers_blocked` is added to the issues list. This is a critical signal — a site that blocks AI crawlers cannot appear in LLM-generated answers regardless of other scores.

**Website Summary**: Each result includes a `summary` field — a plain-language description of what the site is about, extracted from meta description, og:description, or body text. No AI call required.

**B. Content Structure & Semantics (35 points)**
- [4 pts] Proper HTML structure (semantic tags: `<header>`, `<main>`, `<article>`, `<section>`)
- [4 pts] Presence of `<meta name="description">` (non-empty, 50-160 chars)
- [4 pts] Presence of `<title>` tag (non-empty, 30-60 chars, relevant)
- [4 pts] Open Graph tags (og:title, og:description, og:image, og:url, og:type)
- [5 pts] Structured data (JSON-LD schema.org markup: Article, Organization, Product, or equivalent)
- [4 pts] Content freshness signals (publication date, last-modified, or recent updates)
- [4 pts] Mobile-friendly design (viewport meta tag present, responsive layout, <16px text)
- [2 pts] Language tag (`<html lang="en">` or equivalent, prevents crawl confusion)

**C. Technical SEO Foundations (25 points)**
- [5 pts] Canonical tags present (if applicable, to signal authoritative version to AI)
- [5 pts] SSL/HTTPS enforced (all traffic redirects to HTTPS, HSTS header present)
- [5 pts] Clean URL structure (no excessive query parameters >3, no session IDs in URL)
- [5 pts] Fast page load time (First Contentful Paint <3 seconds, simulated)
- [5 pts] Minimal JavaScript rendering blocking (static HTML parseable without JS execution)

**D. Content Quality Signals (10 points)**
- [5 pts] Content depth (main content body >300 words, indicates substantive material)
- [5 pts] Internal linking presence (>2 internal links, indicates topical hierarchy)

**Scoring Logic**:
- Each dimension sub-check scored individually (0 or full points, binary)
- Dimensions sum to 100 points naturally (30 + 35 + 25 + 10 = 100)
- Critical penalties (noindex, auth-required, unreachable) reduce score aggressively
- Final score is always 0-100 (capped, floored)

---

### 2. User Experience & Results Page

#### 2.1 Results Display
After analysis completes:
- **Prominent Score Display**: Large, color-coded badge (0-35: Red, 36-65: Yellow, 66-100: Green)
- **Score Breakdown**: Stacked bar chart showing contribution of each dimension (Crawlability %, Content %, Technical %, etc.)
- **Timestamp & Freshness Indicator**:
  - Show "Last analyzed: [date]" with cache indicator
  - If cached result: "This result is from [X days ago]. Last update was [date]. Fresh analysis takes ~10 seconds. [Refresh Now?]"
  - Helps users understand freshness + builds trust (we're transparent about data age)
- **Issue Categories** (High-Level, Not Prescriptive):
  - "Metadata optimization needed" (rather than "Add <meta name='description'>")
  - "Improve content structure" (rather than "Use semantic HTML tags")
  - "Configure structured data" (rather than "Implement JSON-LD schema.org")
  - "Strengthen security posture" (rather than "Enable HTTPS")
  - etc.
- **Phase 1 Limitation Notice** (if applicable):
  - If site uses heavy JS rendering (detected by analyzing content visibility):
    - "Note: This site relies on JavaScript. Adding JSON-LD schema markup to your HTML <head> (static, doesn't require JS) could improve your score. [Learn how]"
  - Educates users + encourages them to implement static schema (Phase 1 limitation becomes a feature, not a bug)
- **Result Sharing**:
  - Include Open Graph meta tags (`og:title`, `og:description`, `og:image` with score card)
  - Unique URL for each analysis: `/analysis/{domain-slug}?checkId={uuid}` (shareable, indexable)
  - Social sharing buttons (LinkedIn, Twitter) with pre-filled message: "My site scores 72/100 on AEO. How does yours compare? [Check your AI-friendliness]"
- **Call-to-Action**: Prominent button: "Get Detailed Recommendations" or "Talk to an Expert" (leads directly to lead form)

#### 2.2 Lead Capture Form

**Monetization Note**: This form is the *core revenue driver*. Every field and interaction should maximize conversion.

- **Fields** (minimal friction):
  - Name (required, used for personalization in outreach)
  - Email (required, primary contact method)
  - Company/Website (pre-filled with analyzed domain, required; confirms lead is owner/decision-maker)
  - Decision-Maker Title (optional, e.g., "Marketing Manager", "CTO", "Founder"; helps agencies qualify & personalize outreach)
  - Phone (optional, improves sales velocity)
  - Budget/Timeline (optional, helps AEO agencies pre-qualify)

**Field Design Detail**:
- **Company field**: Auto-populate with domain from analyzed URL (e.g., if analyzing `example.com`, pre-fill with "example.com"). Allow user to override if checking a competitor's site. This reduces friction by ~15-25% (pre-fill reduces typing)
- **Decision-Maker Title**: Dropdown or text field (helps agencies identify who to reach out to; "CEO" vs "Marketing Manager" = different pitch)
- **Form validation**: Email format validation server-side; warn if email doesn't match company domain (catches copy-paste errors)
- **Duplicate email detection**: If same email submitted twice in 24h, suppress 2nd insert to leads table (CRM dedup); return message: "We received your info. Check your email for next steps"
- **Design**: Non-intrusive modal or below-fold, appears after user sees score (not before)
- **CTA Button**: "Get My AEO Action Plan" (implies value, not generic "Submit")
- **Privacy**: Clear statement: "We'll follow up within 24 hours with tailored recommendations and connect you with top AEO agencies."
- **Anti-spam**:
  - Honeypot field (hidden, catches bots)
  - Rate-limit per IP: max 3 form submissions per day (prevents automation)
  - Duplicate detection: if same email submitted twice in 24h, suppress to CRM dedup
- **Post-Submission**:
  - Show: "Thanks! We've received your information. Expect an email within 24 hours."
  - Email confirmation sent immediately (confirms interest, establishes expectation)
  - Lead immediately available in CRM for sales outreach

#### 2.3 Results Database Schema

Store every check for analytics, lead tracking, and rate-limiting:

**checks table**:
```
id (UUID)
domain (VARCHAR, indexed) -- normalized domain (no www, lowercase)
url_hash (VARCHAR, indexed) -- SHA256(full_url) for dedup & privacy
score (INT, 0-100)
crawlability_score (INT, 0-30)
content_score (INT, 0-35)
technical_score (INT, 0-25)
quality_score (INT, 0-10)
issues (JSON) -- ["metadata_optimization", "structured_data_missing", ...]
checked_at (TIMESTAMP)
cached_at (TIMESTAMP) -- when result became cacheable
expires_at (TIMESTAMP) -- cache expiration (checked_at + 7 days)
ip_hash (VARCHAR, indexed) -- SHA256(IP) for rate-limit enforcement, privacy-safe
user_agent (TEXT)
language_detected (VARCHAR)
referrer_source (VARCHAR)
```

**leads table**:
```
id (UUID)
check_id (UUID, FK to checks)
name (VARCHAR)
email (VARCHAR, indexed) -- used for dedup & CRM sync
company (VARCHAR)
phone (VARCHAR, optional)
budget_range (VARCHAR, optional)
timeline (VARCHAR, optional)
created_at (TIMESTAMP)
cto_status (VARCHAR) -- "new", "contacted", "qualified", "converted", for CRM tracking
```

**Purpose**:
- Track ROI: cost per check → cost per qualified lead → conversion rate
- Analytics: score distribution, most common issues, language breakdown
- Rate-limiting: enforce IP, domain quotas
- Lead follow-up: CRM integration, email list, outreach automation

---

### 3. Multilingual Support

#### 3.1 Language Detection
- **Primary**: GeoIP-based detection (free service: MaxMind GeoIP2 Lite, or similar)
- **Secondary**: Browser accept-language header
- **User Override**: Language selector in UI (top-right, always accessible)

#### 3.2 Supported Languages
1. **English (EN)** – Default ✅ Phase 1
2. **French (FR)** ✅ Phase 1
3. **German (DE)** ✅ Phase 1
4. **Spanish (ES)** ✅ Phase 1
5. **Hebrew (HE)** — RTL layout auto-applied ✅ Phase 1
6. **Russian (RU)** ✅ Phase 1

#### 3.3 Content to Translate
- Page headlines & CTAs
- Input placeholder text
- Results labels & category names
- Lead form labels & button text
- Error messages
- Tooltips/help text

**Implementation**: Use i18n library (e.g., i18next, react-i18n, or custom JSON-based approach) with separate translation files per language.

---

### 4. Security & Rate Limiting

#### 4.1 Rate Limiting Strategy
To prevent abuse and control infrastructure costs, enforce multiple layers:

**Layer 1: IP-Based Rate Limiting** (Primary anti-abuse mechanism)
- Limit: 50 checks per day per unique IP address
- Enforcement: Redis with key `ratelimit:ip:{ip_hash}`, auto-expires at UTC midnight
- Response: HTTP 429 with `Retry-After: 86400` (seconds until midnight)
- User message: "You've reached 50 checks today. Try again tomorrow, or [contact us for higher limits]."
- Rationale: Prevents single-user DOS; generous enough for legitimate daily use

**Layer 2: Domain-Based Rate Limiting** (Prevents bulk competitor scanning)
- Limit: 100 checks per day per unique domain (domain extracted, lowercased, www-normalized)
- Enforcement: Redis with key `ratelimit:domain:{domain}`, auto-expires at UTC midnight
- Example: Checking `example.com`, `www.example.com`, `https://example.com/page` all count toward same bucket
- Response: HTTP 429 with clear messaging
- Rationale: Prevents one user/bot from spamming same domain or scanning 100 competitors in one day
- Bypass: Only for authenticated users (Phase 3 premium tier)

**Layer 3: Form Submission Rate Limiting** (Prevents lead spam)
- Limit: 3 form submissions per day per unique IP address
- Enforcement: Redis with key `ratelimit:form:ip:{ip_hash}`, auto-expires at UTC midnight
- Response: HTTP 429, "You've submitted 3 times today. Please check your email for a response."
- Rationale: Prevents bot/spam submissions; allows legitimate users to retry if form failed

**Detection & Response**:
- Use middleware to check all 3 limits on `/api/analyze` and `/api/leads` endpoints
- Return HTTP 429 with clear `Retry-After` header
- Log all rate-limit violations (IP, domain, timestamp) for abuse pattern detection
- Alert if single IP triggers >500 violations in 1 hour (likely attack)

#### 4.2 Input Validation & Security
- **URL Sanitization**:
  - Whitelist HTTP/HTTPS schemes
  - Reject private IPs (10.*, 127.*, 172.16-31.*, 192.168.*)
  - Reject localhost and known malicious domains
  - Enforce URL length limit (2000 chars)
- **Request Validation**:
  - CSRF tokens for form submissions
  - Validate all user input server-side
  - Implement Web Application Firewall (WAF) rules
- **Output Encoding**:
  - Escape all user-controlled data in responses (prevent XSS)
  - Sanitize URLs in results (encode special characters)

#### 4.3 Analysis Engine Security
- **Sandboxing**: Run analysis in isolated processes/containers
- **Timeout**: Strict 15-second timeout per URL analysis
- **Resource Limits**: Cap memory/CPU per analysis job
- **No Following Redirects Indefinitely**: Max 5 redirects per URL
- **Avoid Executing User Content**: Analyze HTML/metadata only; do not execute JavaScript (initial MVP)

#### 4.4 Data Protection
- **HTTPS-Only**: All traffic encrypted in transit
- **Database Encryption**: Encrypt email addresses and sensitive metadata at rest
- **Audit Logging**: Log all API calls (IP, URL, timestamp, outcome)
- **Retention Policy**: Retain raw analysis data for 90 days; aggregated metrics indefinitely
- **GDPR/Privacy**:
  - Clear privacy policy
  - Ability to request data deletion
  - No third-party sharing of contact info without explicit consent

---

### 5. Cost Efficiency

#### 5.1 Infrastructure Strategy
- **Lightweight Crawling**: Use fast, non-resource-intensive HTTP client (not full Selenium/Puppeteer for MVP)
  - Rationale: Analyze static content first; JS rendering reserved for premium tier
  - Expected cost: ~$0.001-0.005 per check
- **Caching**:
  - Cache repeated checks for same domain (24-hour TTL)
  - Share infrastructure costs across users
- **Database**: PostgreSQL or similar relational DB (cost-effective, scales with read-heavy workload)
- **Hosting**: Cloud provider with auto-scaling (AWS, GCP, Azure)
  - Use spot instances or reserved capacity for background jobs
  - CDN for static assets (images, CSS, JS)

#### 5.2 Caching Strategy

**Goal**: Minimize crawling costs by reusing results; users expect near-real-time feedback.

**Cache TTL Policy**:
- **Default TTL: 7 days** (604,800 seconds)
  - Rationale: Most websites don't change dramatically weekly; balances freshness vs. cost
  - Cost impact: If 30% of daily checks are cache hits, saves ~$0.003 per hit
- **Soft Cache (Stale-While-Revalidate)**:
  - After 7 days, return cached result immediately but trigger background re-check
  - User sees "Last analyzed: 4 days ago" badge with option to "Check Again Now"
- **Manual Refresh Option**: Users can force re-check anytime (consumes fresh quota)
- **Cache Invalidation Signals** (re-check sooner):
  - User explicitly requests re-check
  - Domain is flagged as high-traffic (>50 checks in 7 days)
  - Alerts (if future premium tier includes webhook notifications)

**Cache Storage**:
- Use Redis for hot cache (fast lookup, auto-expiry)
- PostgreSQL for persistent check records (audit trail, analytics)
- Cache key: `hash(domain)` (not full URL, to catch www/non-www variants)

**Estimated Cost Savings**:
- Assume 50% cache hit rate after stabilization
- Assume 1000 checks/day → 500 cache hits, 500 fresh checks
- Fresh check cost: $0.005/check = $2.50/day
- Cache hit cost: ~$0.0001/check = $0.05/day
- Daily infrastructure cost: $2.55 (vs. $5 without cache)
- Monthly savings: ~$73 (30 days)

#### 5.3 Cost Optimization Metrics
- Monitor per-check cost (target: <$0.01 for fresh checks, <$0.0001 for cache hits)
- Track cache hit rate (target: >40% within 7 days, >50% after 30 days)
- Set up alerts for cost spikes (if per-check cost exceeds $0.015)
- A/B test rate limits to balance user experience vs. infrastructure spend

---

### 6. Professional Branding & Design

#### 6.1 Visual Identity
- **Color Palette**:
  - Primary: Deep blue or tech-forward color (authority, trust)
  - Accent: Vibrant (contrasting with primary, used for CTAs, scores)
  - Success/Warning/Error: Green/Orange/Red (score ranges)
- **Typography**: Modern, clean sans-serif (Helvetica, Inter, or similar)
- **Spacing & Layout**: Generous whitespace, mobile-first responsive design

#### 6.2 Key Pages

**Homepage**
- Hero section: "Discover How AI-Friendly Your Website Is"
- Value prop bullets (crawlability, content structure, technical foundations)
- Large, prominent input field (center stage)
- "Check Now" button (primary CTA)
- Social proof (optional, if available: testimonials, partner logos)

**Results Page**
- Score prominently displayed (large badge)
- Dimension breakdown (visual bar chart)
- Issue categories (non-technical language)
- Lead form (adjacent or below results)
- Option to check another URL

**About/Info Pages**
- What is AEO?
- How AIScore works
- FAQ
- Contact (for non-lead inquiries)

#### 6.3 User Experience Principles
- **Instant Gratification**: Results in <5 seconds (or loading indicator)
- **Clarity**: Every element has a clear purpose; no jargon (or jargon explained)
- **Trust Signals**: Security badges, privacy statement, transparent methodology
- **Mobile-First**: Fully functional on phones (majority of traffic expected from mobile)
- **Accessibility**: WCAG 2.1 AA compliance (semantic HTML, keyboard nav, screen reader support)

---

### 7. Technical Architecture (High-Level)

#### 7.1 Tech Stack Recommendation
- **Frontend**: React or Vue.js (modern SPA for instant feedback)
- **Backend**: Node.js + Express, Python + FastAPI, or Go (fast, scalable)
- **Database**: PostgreSQL (relational, strong consistency)
- **Caching**: Redis (for rate-limiting, URL cache)
- **Analysis Engine**:
  - Cheerio (Node) or BeautifulSoup (Python) for HTML parsing
  - Custom scoring logic (weighted dimensions)
- **Deployment**: Docker + Kubernetes (or managed services)
- **Monitoring**: Datadog, New Relic, or CloudWatch (track errors, latency, costs)

#### 7.2 API Design

**POST /api/analyze** (Core endpoint)
- **Input**:
  ```json
  {
    "url": "https://example.com",
    "force_refresh": false  // optional: ignore cache, re-analyze
  }
  ```
- **Output (Cached Hit)**:
  ```json
  {
    "score": 72,
    "dimensions": {
      "crawlability": 28,
      "content": 24,
      "technical": 15,
      "quality": 5
    },
    "issues": ["metadata_optimization", "structured_data_missing", "mobile_performance"],
    "cached": true,
    "checked_at": "2026-03-22T14:30:00Z",
    "expires_at": "2026-03-29T14:30:00Z",
    "check_id": "uuid-1234"
  }
  ```
- **Output (Fresh Check)**:
  ```json
  {
    "score": 72,
    "dimensions": { ... },
    "issues": [ ... ],
    "cached": false,
    "checked_at": "2026-03-26T10:00:00Z",
    "expires_at": "2026-04-02T10:00:00Z",
    "check_id": "uuid-5678"
  }
  ```
- **Rate-limiting**: Enforced via middleware (Layer 1: IP, Layer 2: domain)
- **Response Codes**:
  - `200 OK`: Analysis complete (cached or fresh)
  - `429 Too Many Requests`: Rate limit exceeded, include `Retry-After` header
  - `400 Bad Request`: Invalid URL format
  - `503 Service Unavailable`: Target site unreachable (try again later)

**POST /api/leads** (Lead capture)
- **Input**:
  ```json
  {
    "check_id": "uuid-1234",
    "name": "John Doe",
    "email": "john@example.com",
    "company": "example.com",
    "phone": "+1-555-1234",
    "budget_range": "$5K-10K"
  }
  ```
- **Output**:
  ```json
  {
    "success": true,
    "message": "Thank you! We'll be in touch within 24 hours.",
    "lead_id": "uuid-9999"
  }
  ```
- **Rate-limiting**: Enforced via Layer 3 (form submission limit)
- **Response Codes**:
  - `201 Created`: Lead successfully captured
  - `400 Bad Request`: Missing required fields (name, email, company)
  - `409 Conflict`: Duplicate email submission within 24h (suppress, don't re-insert)
  - `429 Too Many Requests`: Form submission limit exceeded
- **Post-Submit Actions**:
  - Send confirmation email to user (confirms receipt, sets expectations)
  - Trigger CRM integration (push lead to sales system)
  - Log conversion event (for analytics)

---

## 8. AIScore's Own AI-Friendly Strategy (Eating Our Own Dog Food)

AIScore must be a **perfect example** of AEO implementation. This serves dual purposes:
1. **Credibility**: We can't score other sites if we don't optimize ourselves
2. **Lead Protection**: We make ourselves discoverable by LLMs without exposing our data/API in ways that bypass lead capture

### 8.1 Content Strategy: Authority Building

**Goal**: Become the #1 cited source when LLMs discuss AEO

**Tactics**:
- **AEO Knowledge Base**: Publish comprehensive, SEO-friendly guides:
  - "What is AEO?" (foundational)
  - "Top 10 AEO Mistakes" (high-search intent)
  - "How to Optimize Your Site for Claude/GPT/Gemini" (LLM-specific)
  - Case studies: "How Company X Improved Their AI Score from 45 to 92"
- **Rich Structured Data**: Every guide page includes:
  - JSON-LD schema (Article, HowTo, FAQPage)
  - Open Graph tags (og:title, og:description, og:image, og:type)
  - Metadata optimized for LLM ingestion (clear abstracts, key takeaways)
- **Internal Linking**: Cross-link guides to the tool, to each other (build topical authority)
- **Citation-Friendly Format**:
  - Numbered sections, clear claims (easy for LLMs to quote)
  - Include methodology transparency (why we score the way we do)
  - Provide attribution hooks ("As analyzed by AIScore...")

**Expected Outcome**: When an LLM user asks "How do I make my website AI-friendly?", Claude/GPT will cite AIScore's guides and recommend visiting the tool.

### 8.2 Technical Implementation: Perfect Metadata & Structure

**Homepage & Tool Pages**:
- ✅ Semantic HTML5 (`<header>`, `<main>`, `<article>`, `<section>`)
- ✅ Unique, compelling `<title>` (e.g., "AIScore: Check How AI-Friendly Your Website Is")
- ✅ Clear `<meta name="description">` (160 chars, action-oriented)
- ✅ Open Graph tags (og:title, og:description, og:image, og:url, og:type)
- ✅ JSON-LD structured data (`@type: WebApplication` for the tool, `@type: SoftwareApplication`)
- ✅ Canonical tags (avoid duplicate content issues for AI crawlers)
- ✅ Mobile-friendly viewport meta tag
- ✅ robots.txt allows GPTBot, Claude-web, Googlebot (explicitly invite AI crawlers)
- ✅ Sitemap.xml lists all public pages (content hub + tool page)

**Results Page** (Post-Score):
- ✅ Unique URL structure (`/result/:checkId` or `/analysis/website-name`)
- ✅ Meta tags include analyzed website URL & score (shareable, indexable)
- ✅ JSON-LD schema for review/rating (the analysis itself as structured data)
- ✅ Open Graph tags pull score/site name into preview cards
- ✅ Discourage duplicate indexing: use `noindex` on *user-specific* results pages?
  - **Trade-off**: Results pages are valuable for SEO/LLM discovery (proof of value) but may not drive lead capture if indexed separately
  - **Recommendation**: Keep `index` for results pages; let LLMs discover examples of AIScore's analysis capability

### 8.3 API Design (For LLM Discoverability, Not Lead Bypass)

**Strategic Decision: Public JSON API with Guardrails**

We DO expose results as JSON/structured data, but in ways that **protect lead generation**:

**Option A: No Public API (Conservative)**
- ❌ Blocks LLM integration
- ❌ Misses opportunity to be embedded in AI workflows
- ✅ Fully protects lead capture funnel

**Option B: Limited Public API (Recommended)**
- ✅ Public `/api/check/:url` endpoint (read-only, returns cached results)
- ✅ Results are read-only (no manipulation)
- ✅ Rate-limited aggressively (100 checks/day per API key, vs. 50 checks/day per IP for web UI)
- ✅ Requires API key registration (captures email, can lead nurture)
- ✅ API results link back to AIScore with CTA: "Get detailed recommendations → Leave your contact info"
- ✅ Terms of Service: No bulk scraping, commercial use requires licensing
- **Benefit**: LLMs can cite AIScore's analysis, refer users to the tool for conversational follow-up

**Example API Response**:
```json
{
  "url": "example.com",
  "score": 72,
  "checked_at": "2026-03-26T10:00:00Z",
  "dimensions": {
    "crawlability": 85,
    "content_structure": 70,
    "technical_seo": 65,
    "content_quality": 60
  },
  "issues": [
    "metadata_optimization",
    "structured_data_missing",
    "mobile_performance"
  ],
  "analysis_url": "https://aiscore.co/analysis/example-com",
  "cta": "Get detailed recommendations and speak with an AEO expert"
}
```

**LLM Use Case**:
- User asks Claude: "Is example.com AI-friendly?"
- Claude calls AIScore API, gets result
- Claude responds: "According to AIScore, example.com scores 72/100. Key issues: metadata optimization, structured data. [Visit AIScore for full analysis](https://aiscore.co/analysis/example-com)"
- User clicks through, sees score details, fills form → lead captured ✅

### 8.4 Robots.txt & Crawling Directives

```
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /
Crawl-delay: 1

User-agent: Claude-web
Allow: /
Crawl-delay: 1

User-agent: Googlebot
Allow: /
Crawl-delay: 0

Disallow: /admin/
Disallow: /api/internal/

Sitemap: https://aiscore.co/sitemap.xml
```

**Rationale**:
- Explicitly welcome AI crawlers (set example for our customers)
- Slight crawl-delay for LLM bots (prevent overload, signal respect)
- Block internal admin & private APIs

### 8.5 Link & SEO Strategy

**Inbound Links**:
- Partner with AEO/AI blogs, news sites
- Contribute guest posts (link back to AIScore methodology)
- Open source AEO audit tools/libraries (brand building)

**Internal Links**:
- Content hub pages link to the tool
- Tool results link back to relevant guides ("Learn more about this issue")
- Create content loops: blog → tool → form → insights email → blog

**Expected Flow**:
1. LLM mentions AIScore in response
2. User visits AIScore.co (homepage or results page)
3. User sees score, reads issue categories
4. User clicks "Get Detailed Recommendations"
5. User fills form with email
6. User receives personalized consulting offer
7. Lead conversion opportunity ✅

### 8.6 Implementation Checklist

- [ ] Homepage metadata (title, description, OG tags, JSON-LD)
- [ ] Content hub pages (AEO guides, case studies, FAQ)
- [ ] Robots.txt configured to welcome AI crawlers
- [ ] Sitemap.xml includes all public pages
- [ ] Results pages are indexable, shareable (unique URLs, OG tags)
- [ ] API endpoint returns structured JSON (with rate limiting, API key)
- [ ] API responses include links back to tool
- [ ] Mobile-friendly design (responsive, fast)
- [ ] HTTPS enforced
- [ ] Minimal JavaScript blocking (content accessible without JS)
- [ ] Page load time <3 seconds
- [ ] Accessibility: WCAG 2.1 AA compliance

---

## Success Metrics & KPIs

### Primary Metrics
1. **Conversion Rate**: % of free checks that result in lead form submission (target: 15-25%)
2. **Cost per Lead**: Total infrastructure cost / number of leads (target: <$1)
3. **Lead Quality**: % of leads that convert to consulting engagement (target: 10-15%)
4. **Daily Active Checks**: Number of unique analyses per day (track growth)

### Secondary Metrics
1. **Average Session Duration**: Time spent per user (target: >3 minutes)
2. **Mobile vs Desktop**: Traffic split (expect 60%+ mobile)
3. **Language Distribution**: Which languages drive most traffic (optimize marketing)
4. **Abuse Rate**: Failed rate-limit checks (early warning of attacks)
5. **Infrastructure Cost**: Cost per check, cache hit rate

---

## Roadmap & Phases

### Phase 1: MVP (Week 1-4)
- Basic URL input & analysis (HTML parsing, metadata extraction)
- Simple 0-100 scoring (5 key dimensions)
- High-level issue categories
- Lead capture form
- All 6 languages shipped: EN, FR, DE, ES, HE (with RTL), RU
- Historical score tracking — SVG sparkline, 12-month data retention, GET /api/history/:domain
- Rate limiting (IP-based, 50/day)
- Deployed to staging environment

**Success**: 100 checks, 15+ leads

### Phase 2: Polish & Scale (Week 5-8)
- ~~Add remaining 4 languages (GR, SP, HE, RU)~~ — shipped in Phase 1
- Refine scoring algorithm based on feedback
- ~~Improve crawlability checks (robots.txt, sitemap validation)~~ — shipped in Phase 1
- Performance optimization (caching, CDN)
- Launch to production
- Marketing push (content, early partnerships)

**Success**: 1,000+ checks/day, 200+ leads

### Phase 3: Premium Tier (Month 3+)
- Authenticated users, API access
- Detailed reports (PDF export)
- Bulk analysis (upload URL list)
- ~~Historical tracking~~ — shipped in Phase 1
- JavaScript rendering (analyze dynamic sites)
- Custom recommendations (premium content)

**Success**: 10%+ premium conversion, $X monthly recurring revenue

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **High infrastructure costs** | Burn cash quickly | Aggressive rate-limiting, caching, lightweight crawling |
| **Abuse/DDoS attacks** | Service unavailability | WAF, CAPTCHA on repeated requests, IP reputation checks |
| **False positives in scoring** | Low user trust | Transparent methodology, feedback loop, continuous refinement |
| **Low lead conversion** | Business viability | A/B test form fields, timing, messaging; track drop-off |
| **Language quality issues** | Reduced international reach | Professional translation review, native speaker QA |
| **Slow analysis (>10s)** | Poor UX | Invest in crawling performance, consider JS rendering later (Phase 3) |
| **Public API reduces lead capture** | Lower form conversion | API endpoint is gated behind rate limits, includes links back to tool; results drive referral, not replacement |
| **Content hub competes with tool** | Divided attention | Content hub drives organic traffic & LLM citations; directs to tool for interactive analysis + lead capture |

---

## 10. Monetization Roadmap

AIScore employs a **multi-tier revenue strategy** focused on high-margin, user-aligned monetization. We **explicitly avoid display ads** (low margin, poor UX, damages authority).

### 10.1 Phase 1: Lead Sales (Primary Revenue)

**Core Model**: Lead aggregation for AEO agencies.

**Lead Definition**: A website owner or marketing decision-maker who:
- Checked their website on AIScore
- Received a score <80 (indicates room for improvement, intent to act)
- Submitted contact information
- Works for a company with website/digital presence

**Expected Lead Volume**:
- Phase 1 (4 weeks): 100-150 leads (5 checks/day, 15-20% conversion)
- Phase 2 (8 weeks): 500+ leads/week at 1000+ checks/day

**Lead Quality Metrics** (track post-conversion):
- Contact accuracy (deliverable email, real name)
- Budget (have budget for AEO services?)
- Timeline (ready to start within 30 days?)
- Vertical (B2B SaaS, e-commerce, media, etc.)
- Score range (lower scores = higher intent to fix, easier to convert)

**Lead Sale Economics**:
- AIScore captures leads for **free** (no charge to website owners)
- Sell qualified leads to AEO agencies ($100-200/lead depending on quality/vertical)
- Cost per lead: $1-2 (infrastructure + operations)
- Margin: **50x ROI** ($100 revenue / $2 cost)
- At scale (10,000 checks/day): 6,000 leads/month × $100 = **$600,000/month**

**Sales Process**:
1. Lead submits contact form on AIScore
2. AIScore team qualifies lead (valid email, real company, budget, timeline)
3. Lead sold/shared with partner AEO agencies in their vertical
4. Agency receives: name, email, company, score, issues, budget range
5. Agency reaches out directly, handles sales process, pays AIScore per lead

**Why Lead Sales Over Ads**:
- ✅ High margin (50x vs. 0.5x for display ads)
- ✅ User-aligned (helps them fix their site)
- ✅ Preserves authority (we're a partner, not an ad network)
- ✅ Scalable (more users = more leads = more revenue)
- ✅ Focus (no distraction from core value prop)

### 10.2 Phase 2: Strategic Partnerships (High-Leverage Revenue)

**Revised Model**: Rather than relying on affiliate commissions alone ($5K/month ceiling), Phase 2 focuses on **white-label, enterprise, and platform partnerships** that scale 10-50x larger.

#### 10.2a Partnership Tiers (Priority Order)

**Tier 1: Search Engine / AI Model Partnerships** (Highest Impact)
- **Who**: Anthropic (Claude), OpenAI (GPT), Google (Gemini), Bing
- **Model**: Embed AIScore checks into LLM responses
  - User asks Claude: "Is example.com AI-friendly?"
  - Claude: "I've checked example.com using AIScore. Score: 72/100. Issues: metadata optimization, structured data missing. [Get detailed recommendations](https://aiscore.co/analysis/example.com)"
- **Revenue**: Revenue-share on leads generated through Claude/GPT referrals (could be 20-30% of lead sales)
- **Timeline**: Phase 2, requires partnership pitch + integration work
- **Potential**: If Claude/GPT refer 10% of LLM search queries → 100K+ checks/month → 20K+ leads/month → **$2M+/month potential**

**Tier 2: Enterprise SEO Tools** (White-Label Integration)
- **Who**: Ahrefs, SEMrush, Moz, Conductor, BrightEdge
- **Model**: White-label AIScore as "AI-Friendliness Auditor" within their platform
  - Agencies use our scoring for all client sites
  - Branded as "[Agency Name] AI Audit" or "[Platform Name] AEO Scoring"
  - Revenue: Monthly licensing ($1K-5K per customer) or per-check wholesale ($0.10-0.50/check)
- **Timeline**: Phase 2 Q2/Q3
- **Potential**: 5-10 enterprise partners × $2K/month = $10K-20K/month + affiliate deals

**Tier 3: Website Builder Integrations** (Platform Partners)
- **Who**: Wix, Squarespace, Webflow, WordPress.com
- **Model**: Embed AEO scoring into their site-building workflow
  - Users get AEO score as part of site health check
  - Revenue: Per-check revenue-share or per-user licensing
- **Timeline**: Phase 2 Q3/Q4
- **Potential**: 5-10 integrations × $1K-5K/month = $5K-50K/month

**Tier 4: Affiliate Tool Recommendations** (Low-Leverage Fallback)
- **Model**: Only pursue if Tiers 1-3 don't materialize
- **Revenue**: $5K-10K/month (conservative)
- **Why Low Priority**: Affiliate alone can't scale revenue significantly; focus on partnerships instead

#### 10.2b Lead Generation at Scale
- **Direct agency partnerships**: Establish contracts with 10-20 AEO/digital agencies
- **Lead volume target**: 500-1000 leads/week (vs. 100-150 leads/week in Phase 1)
- **Lead qualification**: Add "budget confirmed" field in CRM to track agency interest
- **Revenue**: 500 leads/week × $150/lead = $1.2M/month at scale

#### 10.2c Phase 2 Revenue Breakdown (Revised)
- **Direct lead sales**: $50K-100K/month (agencies pay $100-200/lead)
- **Search engine partnerships**: $0K-50K/month (ramp-up phase, partnership-dependent)
- **Enterprise white-label**: $10K-20K/month (initial partnerships)
- **Platform integrations**: $5K-10K/month (ramp-up)
- **Affiliate commissions**: $2K-5K/month (minimal, low-priority)
- **Total Phase 2 Revenue**: **$67K-185K/month** (vs. $55K-110K in original plan)

**Why This Matters**:
- Partnerships are 10-50x more valuable than affiliate commissions
- Aligns with market reality (enterprise buyers want white-label, not ads)
- Defensible: Once enterprises adopt AIScore, switching costs are high
- Scalable: One partnership = 10K+ checks/month recurring

### 10.3 Phase 3: Premium Tier (High-Value Revenue)

**Model**: Freemium with premium features for power users.

**Free Tier (Current Model)**:
- Unlimited score checks (rate-limited)
- Basic report (score + issue categories)
- Lead capture form
- No cost to user

**Premium Tier ($29-49/month)**:
- Detailed analysis reports (PDF download)
- Historical score tracking (measure improvement over time)
- Competitor benchmarking (compare your score vs. industry average)
- API access (integrate AIScore into your tools)
- Monthly digest email (track changes over time)
- Priority support (faster responses, feature requests)
- Remove ads (affiliate recommendations, if applicable)

**Revenue Potential**:
- Assume: 30,000 checks/month (1,000/day) = likely 300-500 users
- Premium conversion rate: 5-10% = 15-50 paying users
- ARPU: $29-49 × 12 months = $348-588 per user/year
- **Monthly recurring revenue (MRR): $500-2,500**
- **Annual recurring revenue (ARR): $6,000-30,000**

**Why Premium Works**:
- ✅ Same users, higher lifetime value
- ✅ Natural upsell (users already engaged, already identified their problems)
- ✅ Low CAC (no new acquisition cost, organic upgrade)
- ✅ Recurring revenue (predictable, scalable)
- ✅ Aligns with user needs (power users benefit most)

### 10.4 Phase 4: Direct Partnerships & White-Label (Enterprise Revenue)

**Model**: License AIScore to agencies and platforms.

**Use Cases**:
- AEO agencies use AIScore to audit client sites (white-label or branded)
- Digital agencies integrate AIScore checks into their service offerings
- Content platforms (Medium, Substack, etc.) embed AEO scoring for creators
- Website builders (Wix, Squarespace, Webflow) integrate scoring

**Revenue Model**:
- Monthly license: $500-5,000/month depending on usage/volume
- Per-check fee: $0.05-0.25 per check (wholesale price vs. $1-2 retail)
- Revenue share: 30-50% of leads generated through their platform

**Revenue Potential**:
- 10 agency partners × $1,000/month = $10,000/month
- 5 platform partnerships × $3,000/month = $15,000/month
- **Monthly revenue: $25,000+**

### 10.5 Revenue Summary & Scaling

**Phase 1 (Months 1-4)**: Lead sales only
- Target: $0 (prove model, build volume)
- Goal: Capture 100-150 qualified leads
- Setup: Zapier CRM integration

**Phase 2 (Months 5-8)**: Lead sales + affiliate
- Lead sales: $50K-100K/month
- Affiliate: $5K-10K/month
- Total: $55K-110K/month

**Phase 3 (Months 9-12)**: Lead sales + affiliate + premium tier
- Lead sales: $200K-300K/month
- Affiliate: $10K-20K/month
- Premium tier: $2K-5K/month
- Total: $212K-325K/month

**Phase 4 (Year 2+)**: All revenue streams + enterprise partnerships
- Lead sales: $600K+/month
- Affiliate: $20K-30K/month
- Premium tier: $15K-30K/month
- Enterprise: $25K-50K/month
- **Total: $660K-710K+/month**

**Why NOT Display Ads**:
| Metric | Display Ads | Lead Sales |
|--------|------------|-----------|
| Revenue per 1000 users | $1-5 CPM | $2,000-5,000 |
| User experience | Degrades | Improves |
| Brand perception | "Ad-supported" | "Authority" |
| Scalability | Limited (CPM ceiling) | Unlimited (more users = more leads) |
| Alignment with users | Misaligned | Perfectly aligned |

Display ads generate 0.005% of revenue while damaging brand perception and UX. **Not worth it.**

### 10.6 CRM Integration

Database schema already supports CRM tracking (`cto_status` field in leads table):
- `new`: Lead just submitted form
- `contacted`: AEO agency reached out
- `qualified`: Lead showed interest (replied, scheduled call)
- `converted`: Lead signed contract with partner agency

**Phase 1 Integration**:
- Zapier/Make: Connect form submissions to CRM (HubSpot, Salesforce, Pipedrive)
- Webhook: POST lead data to external CRM immediately on form submit
- Export: Daily CSV export of new leads for sales team

**Phase 2+ Integration**:
- Direct API integration (bypass Zapier if volume >100 leads/day)
- Custom CRM dashboard (track agency partners, lead distribution, revenue)
- Automated follow-up sequences (email, SMS reminders)

---

## Open Questions & Decisions for Staff Engineer

The following items are intentionally left open for the staff engineer to decide based on architecture & implementation details:

1. **Analysis Engine**: Should we use HTTP + HTML parsing (Phase 1) or headless browser immediately? Engineer should benchmark cost vs. accuracy.
2. **Database Choice**: PostgreSQL vs. other relational DB? Staff engineer has context on team expertise, scaling, cost.
3. **Caching Layer**: Redis vs. in-memory cache vs. database-backed? Depends on deployment model (single instance vs. distributed).
4. **Frontend Framework**: React, Vue, Svelte, or other? Engineer should choose based on team skills & performance targets.
5. **Hosting & CI/CD**: AWS, GCP, Azure, or hybrid? Staff engineer's call based on DevOps capacity.
6. **Translation Approach**: i18next, gettext, or custom JSON solution? Engineer should pick based on scale.
7. **API Versioning**: How to handle API evolution? (e.g., /v1/analyze, feature flags, etc.)
8. **Monitoring & Observability**: Which tools (Datadog, New Relic, CloudWatch)? Staff engineer's choice.

These decisions are **not blockers**—they're architectural choices that a staff engineer should own. PRD provides enough constraints (cost targets, rate-limit logic, schema) to guide good decisions.

---

## 9. AIScore's Expected AEO Self-Score (Living Benchmark)

To validate our methodology, AIScore.co itself must be a **perfect example** of AEO implementation. Rather than claiming a one-time score, we treat this as a **living benchmark** that evolves with the product.

**Phase 1 Target Score: 88-92/100** (at launch, end of Phase 1)

| Dimension | Target Score | Why | How to Achieve |
|-----------|--------------|-----|-----------------|
| **LLM Crawlability & Accessibility** | 95/100 | Robots.txt welcomes all AI crawlers, no noindex, fast response time, <5 redirects | robots.txt explicitly allows GPTBot, Claude-web, Googlebot with crawl-delay; HTTP 200 in <2s |
| **Content Structure & Semantics** | 88/100 | Semantic HTML, rich OG tags, JSON-LD schemas, mobile-friendly, proper meta descriptions | Every page has unique `<title>`, `<meta description>`, og:* tags, JSON-LD for WebApplication/Article |
| **Technical SEO Foundations** | 90/100 | HTTPS, sitemap.xml, fast load time (<3s), minimal JS blocking, clean URLs, canonical tags | HTTPS enforced, sitemap.xml with all public pages, LCP <2.5s, no JS blocking static content |
| **Content Quality Signals** | 85/100 | Comprehensive guides, internal linking, strategic keywords, but newer site (less historical data) | Blog posts >1500 words, internal links to tool pages, case studies, FAQ; content matures in Phase 2 |
| **OVERALL EXPECTED SCORE** | **88-92/100** | **AIScore must walk the walk** | Verified by audit at end of Phase 1 |

**What We're NOT Claiming**:
- ❌ NOT "AIScore scores itself at 92/100" as a one-time marketing claim (risky if audit differs)
- ✅ Instead: "AIScore maintains an 88-92/100 score. Here's our live audit breakdown. Here's where we're improving."

**Living Benchmark Process**:
- **Weekly**: Monitor our own score (automated daily re-check of AIScore.co)
- **Monthly**: Publish transparency report showing our score, breakdown, and areas we're optimizing
- **Every release**: After major changes, re-audit and publish updates
- **Competitor comparison**: If asked "How do you compare to Site X?", we have data (our own scores show we practice what we preach)

**Why This Matters**:
- **Credibility**: We're not claiming perfection; we're showing continuous improvement
- **Transparency**: Users trust us more when we show our own score + methodology
- **Content Hook**: "Here's why AIScore's score fluctuated this month" = rich blog content
- **Validation**: Our score movements prove the algorithm responds to real changes

**LLM Crawler Testing** (Critical for Phase 1):
By end of Week 3, engineer must verify:
- [ ] GPTBot can crawl AIScore.co homepage (robots.txt allows, returns 200)
- [ ] Claude-web can crawl our results pages (if searching for "AI-friendly website check")
- [ ] Googlebot crawls sitemap.xml (validates sitemap format)
- [ ] Results pages are indexable by search engines + LLMs (no noindex, canonical tags correct)
- [ ] Our results pages show in search/LLM responses with proper metadata (og:* tags render correctly)
- [ ] Test by: querying Claude "Check if AIScore.co is AI-friendly" → Claude should use our own API or cite our content

---

## Conclusion

AIScore positions itself as the **go-to diagnostic tool for AI-friendliness**. By offering free, instant scoring paired with lead capture, we create a funnel for high-intent users seeking to optimize for AI discovery.

**Revenue Model**: Free tool → qualified leads → sell to AEO agencies ($50-200 per lead).

**Success Metrics**:
- Cost per check: <$0.01 (with caching, target <$0.005)
- Lead capture rate: 15-20%
- Lead sell price: $100-200
- Monthly margin: if 1000 checks/day, 20% conversion = 6000 leads/month, sell at $100 = $600K/month (minus $30-50K infra costs)

**Critical Success Factors**:
- Fast, reliable analysis (<5 seconds)
- Accurate, transparent scoring
- Seamless lead capture form (high conversion)
- Solid caching strategy (7-day TTL saves 40-50% of infrastructure costs)
- Effective CRM integration (connects leads to agencies)
- Frictionless multilingual UX

**Timeline**:
- Phase 1 (4 weeks): MVP → 100-150 leads
- Phase 2 (8 weeks): Scale → 500+ leads/week
- Phase 3 (Month 3+): Premium features, wider partnership network

With disciplined execution on this PRD, AIScore can establish a profitable lead generation business within 2-3 months.

---

**Document Version**: 2.0
**Last Updated**: 2026-03-26
**Author**: Founder / Product Vision
**Status**: Ready for Staff Engineer → Implementation Plan
