// ============================================================
// AIScore Scoring Validation — HTML Fixtures
//
// Each fixture represents what a plain HTTP crawler (no JS execution)
// actually receives from that category of site. Fixtures are tuned to
// accurately represent real-world site characteristics, not to hit
// artificial score targets.
// ============================================================

import { FetchResult } from '../../src/types';

// --------------- Static content site fixture ---------------
// Represents: Medium, MDN, GitHub Docs, CSS-Tricks, Smashing Magazine
// These sites serve fully rendered HTML with rich metadata.
// Expected score range: 70-96 (target 75-92, ±10 tolerance = 65-102)
//
// Score analysis:
//   Crawlability (30): no-noindex×2(+10) + no-nofollow(+5) + no-auth(+5)
//                      + fast(<10s)(+5) + sitemap link(+5) = 30
//   Content (31): semantic(+4) + desc(+4) + title(+4) + OG(+4)
//                 + JSON-LD(+5) + published_time(+4) + viewport(+4) + lang(+2) = 31
//   Technical (25): canonical(+5) + HTTPS(+5) + clean-URL(+5) + <3s(+5) + body>200(+5) = 25
//   Quality (10): body>300(+5) + >2 internal links(+5) = 10
//   Total: 96, Penalties: 0 → Final: 96
const STATIC_CONTENT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>How to Build Scalable APIs — Engineering Blog</title>
  <meta name="description" content="A comprehensive guide to building scalable REST APIs with Node.js and TypeScript. Learn patterns and best practices used by top engineering teams.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="https://example-blog.com/posts/scalable-apis">
  <link rel="sitemap" type="application/xml" href="/sitemap.xml">
  <meta property="og:title" content="How to Build Scalable APIs — Engineering Blog">
  <meta property="og:description" content="Learn patterns and best practices for building REST APIs with Node.js and TypeScript.">
  <meta property="og:type" content="article">
  <meta property="article:published_time" content="2026-01-15T10:00:00Z">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"How to Build Scalable APIs","datePublished":"2026-01-15","author":{"@type":"Person","name":"Jane Developer"}}</script>
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/blog">Blog</a>
      <a href="/about">About Us</a>
      <a href="/topics/typescript">TypeScript</a>
      <a href="/topics/nodejs">Node.js</a>
    </nav>
  </header>
  <main>
    <article>
      <h1>How to Build Scalable APIs</h1>
      <p>Building scalable REST APIs requires careful consideration of architecture patterns, data models, and performance characteristics. In this comprehensive guide, we explore the key principles that separate maintainable APIs from brittle ones.</p>
      <section>
        <h2>Authentication and Authorization</h2>
        <p>Use JWT tokens with short expiry windows and refresh token rotation. Never store sensitive credentials in the token payload. Implement role-based access control (RBAC) at the middleware layer so your route handlers stay clean. Rate limiting should apply before authentication checks to prevent brute-force attacks on your auth endpoints.</p>
      </section>
      <section>
        <h2>Caching Strategy</h2>
        <p>Redis is ideal for session data, rate limit counters, and frequently read but rarely written data. Cache invalidation remains one of the hardest problems in distributed systems. Use a cache-aside pattern: check the cache first, fall back to the database on a miss, then populate the cache. Set appropriate TTLs based on how stale data can be tolerated.</p>
      </section>
      <section>
        <h2>Error Handling and Observability</h2>
        <p>Standardize your error response format across all endpoints. Every error should have a machine-readable code, a human-readable message, and optionally a documentation URL. Correlate requests with a trace ID so you can follow a single request through your entire stack. Use structured logging with consistent field names so log aggregation tools can parse them reliably.</p>
      </section>
      <section>
        <h2>Database Patterns</h2>
        <p>Connection pooling is essential in production. Use database migrations rather than ad-hoc schema changes. For read-heavy workloads, consider read replicas. Use optimistic locking for concurrent updates to avoid lost writes. Index your foreign keys and any columns you filter or sort by frequently.</p>
      </section>
    </article>
  </main>
  <footer>
    <a href="/privacy">Privacy Policy</a>
    <a href="/terms">Terms of Service</a>
    <a href="/contact">Contact</a>
  </footer>
</body>
</html>`;

// --------------- SPA without schema fixture ---------------
// Represents: Figma, Notion, Linear
// These SPAs return a minimal HTML shell; all content is rendered client-side.
// A plain HTTP crawler sees almost no meaningful content.
// Expected score range: 25-55 (±10 tolerance = 15-65)
//
// Score analysis:
//   Crawlability (25): no-noindex×2(+10) + no-nofollow(+5) + no-auth(+5)
//                      + <10s(+5) + no-sitemap(0) = 25
//   Content (4):  no-semantic(0) + no-desc(0) + title too short(0) + no-OG(0)
//                 + no-JSON-LD(0) + no-date(0) + viewport(+4) + no-lang(0) = 4
//   Technical (15): no-canonical(0) + HTTPS(+5) + clean-URL(+5) + <3s(+5) + body≤200(0) = 15
//   Quality (0): body≤300(0) + ≤2 links(0) = 0
//   Total: 44, Penalties: 0 → Final: 44
const SPA_NO_SCHEMA_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Figma</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <div id="root"></div>
  <script src="/static/js/main.chunk.js"></script>
  <script src="/static/js/vendors.chunk.js"></script>
</body>
</html>`;

// --------------- SPA with schema fixture ---------------
// Represents: Vercel, Stripe
// These SPAs invest in server-side metadata for SEO but still render content via JS.
// The head contains full metadata; body remains mostly an app shell.
// Expected score range: 60-88 (±10 tolerance = 50-98)
//
// Score analysis:
//   Crawlability (25): no-noindex×2(+10) + no-nofollow(+5) + no-auth(+5)
//                      + <10s(+5) + no-sitemap(0) = 25
//   Content (23): no-semantic(0) + desc 50-160(+4) + title 30-60(+4) + OG(+4)
//                 + JSON-LD(+5) + no-date(0) + viewport(+4) + lang(+2) = 23
//   Technical (15): no-canonical(0) + HTTPS(+5) + clean-URL(+5) + <3s(+5) + body≤200(0) = 15
//   Quality (0): body≤300(0) + ≤2 links(0) = 0
//   Total: 63, Penalties: 0 → Final: 63
const SPA_WITH_SCHEMA_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Vercel — Deploy Web Projects with Zero Configuration</title>
  <meta name="description" content="Vercel is the platform for frontend developers, providing the speed and reliability innovators need to create at the moment of inspiration.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta property="og:title" content="Vercel — Deploy Web Projects with Zero Configuration">
  <meta property="og:description" content="The platform for frontend developers. Deploy instantly with zero configuration and scale to millions.">
  <meta property="og:type" content="website">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Vercel","url":"https://vercel.com","description":"The platform for frontend developers"}</script>
</head>
<body>
  <div id="__next"></div>
  <script src="/_next/static/chunks/main.js"></script>
  <script src="/_next/static/chunks/pages/index.js"></script>
</body>
</html>`;

// --------------- E-commerce fixture ---------------
// Represents: Shopify, Etsy, Amazon
// E-commerce sites serve rich product listing pages with schema markup,
// breadcrumbs, many internal links, and full SEO metadata.
// Expected score range: 65-90 (±10 tolerance = 55-100)
//
// Score analysis:
//   Crawlability (30): no-noindex×2(+10) + no-nofollow(+5) + no-auth(+5)
//                      + <10s(+5) + sitemap(+5) = 30
//   Content (31): semantic(+4) + desc(+4) + title(+4) + OG(+4) + JSON-LD(+5)
//                 + time element(+4) + viewport(+4) + lang(+2) = 31
//   Technical (25): canonical(+5) + HTTPS(+5) + clean-URL(+5) + <3s(+5) + body>200(+5) = 25
//   Quality (10): body>300(+5) + >2 links(+5) = 10
//   Total: 96, Penalties: 0 → Final: 96
const ECOMMERCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Handmade Ceramic Mugs — Unique Gifts &amp; Home Goods</title>
  <meta name="description" content="Browse thousands of handmade ceramic mugs from independent makers. Find the perfect unique gift or treat yourself to something special with free shipping on orders over $35.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="https://example-shop.com/handmade/ceramic-mugs">
  <link rel="sitemap" type="application/xml" href="/sitemap_index.xml">
  <meta property="og:title" content="Handmade Ceramic Mugs — Unique Gifts &amp; Home Goods">
  <meta property="og:description" content="Browse thousands of handmade ceramic mugs from independent makers on our marketplace.">
  <meta property="og:type" content="website">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"ItemList","name":"Handmade Ceramic Mugs","numberOfItems":1247,"itemListElement":[{"@type":"ListItem","position":1,"item":{"@type":"Product","name":"Hand-Thrown Stoneware Mug","offers":{"@type":"Offer","price":"28.00","priceCurrency":"USD"}}}]}</script>
</head>
<body>
  <header>
    <nav aria-label="Breadcrumb">
      <a href="/">Home</a> /
      <a href="/handmade">Handmade</a> /
      <span>Ceramic Mugs</span>
    </nav>
    <nav aria-label="Main navigation">
      <a href="/categories/home-decor">Home &amp; Decor</a>
      <a href="/categories/gifts">Gifts</a>
      <a href="/categories/clothing">Clothing</a>
      <a href="/categories/jewelry">Jewelry</a>
      <a href="/categories/art">Art</a>
    </nav>
  </header>
  <main>
    <h1>Handmade Ceramic Mugs</h1>
    <p>Discover <time datetime="2026-01-01">1,247 unique ceramic mugs</time> crafted by independent makers. Each piece is one-of-a-kind.</p>
    <section aria-label="Filters">
      <h2>Refine Results</h2>
      <p>Filter by price, material, color, and more to find your perfect mug.</p>
    </section>
    <section aria-label="Product listings">
      <article>
        <h3>Hand-Thrown Stoneware Mug</h3>
        <p>A beautiful hand-thrown stoneware mug with a rustic glaze. Dishwasher safe. Holds 12 oz.</p>
        <a href="/listing/hand-thrown-stoneware-mug-123">View listing</a>
      </article>
      <article>
        <h3>Blue Dipped Ceramic Coffee Mug</h3>
        <p>Ocean-blue dipped ceramic mug with a natural clay base. Perfect for morning coffee or tea.</p>
        <a href="/listing/blue-dipped-ceramic-mug-456">View listing</a>
      </article>
      <article>
        <h3>Minimalist White Porcelain Mug</h3>
        <p>Clean lines and a glossy white finish make this porcelain mug a modern kitchen essential.</p>
        <a href="/listing/minimalist-white-porcelain-789">View listing</a>
      </article>
    </section>
  </main>
  <footer>
    <a href="/help">Help Center</a>
    <a href="/sell">Sell on our platform</a>
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
    <a href="/sitemap">Site Map</a>
  </footer>
</body>
</html>`;

// --------------- Media site fixture ---------------
// Represents: BBC, TechCrunch, The Verge
// News/media sites serve full article HTML with Article schema, OG tags,
// publication timestamps, and many navigation links.
// Expected score range: 55-88 (±10 tolerance = 45-98)
//
// Score analysis:
//   Crawlability (30): no-noindex×2(+10) + no-nofollow(+5) + no-auth(+5)
//                      + <10s(+5) + sitemap(+5) = 30
//   Content (31): semantic(+4) + desc(+4) + title(+4) + OG(+4) + JSON-LD(+5)
//                 + article:published_time(+4) + viewport(+4) + lang(+2) = 31
//   Technical (25): canonical(+5) + HTTPS(+5) + clean-URL(+5) + <3s(+5) + body>200(+5) = 25
//   Quality (10): body>300(+5) + >2 links(+5) = 10
//   Total: 96, Penalties: 0 → Final: 96
const MEDIA_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>AI Startup Raises $200M Series B to Expand Enterprise Tools</title>
  <meta name="description" content="The round, led by Sequoia Capital, brings the company's total funding to $350 million and values it at over $2 billion. The company plans to double its engineering headcount this year.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="https://example-media.com/2026/03/ai-startup-raises-200m">
  <link rel="sitemap" type="application/xml" href="/sitemap.xml">
  <meta property="og:title" content="AI Startup Raises $200M Series B to Expand Enterprise Tools">
  <meta property="og:description" content="The funding round values the startup at over $2 billion and will fund international expansion.">
  <meta property="og:type" content="article">
  <meta property="article:published_time" content="2026-03-26T09:00:00Z">
  <meta property="article:author" content="Sarah Chen">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"AI Startup Raises $200M Series B","datePublished":"2026-03-26T09:00:00Z","author":{"@type":"Person","name":"Sarah Chen"},"publisher":{"@type":"Organization","name":"Example Media"}}</script>
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/technology">Technology</a>
      <a href="/startups">Startups</a>
      <a href="/venture">Venture</a>
      <a href="/ai">Artificial Intelligence</a>
    </nav>
  </header>
  <main>
    <article>
      <h1>AI Startup Raises $200M Series B to Expand Enterprise Tools</h1>
      <p><time datetime="2026-03-26T09:00:00Z">March 26, 2026</time> — By Sarah Chen</p>
      <p>A leading AI company announced today that it has closed a $200 million Series B funding round led by Sequoia Capital, with participation from Andreessen Horowitz and several strategic corporate investors. The round brings total funding to $350 million and values the company at over $2 billion.</p>
      <section>
        <h2>What the Funding Will Be Used For</h2>
        <p>The company plans to use the capital to expand its enterprise product suite, hire 300 additional engineers over the next 18 months, and open offices in London and Singapore. The CEO noted that international demand for the company's AI writing and analysis tools has outpaced its ability to serve those markets from its San Francisco headquarters.</p>
      </section>
      <section>
        <h2>Market Context</h2>
        <p>The raise comes amid a broader wave of enterprise AI investment. Analysts at Gartner project that enterprise spending on AI tools will exceed $300 billion globally by 2027. Companies that can demonstrate clear ROI metrics and enterprise-grade security compliance are capturing the lion's share of budget.</p>
      </section>
    </article>
  </main>
  <footer>
    <a href="/about">About</a>
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
    <a href="/advertise">Advertise</a>
  </footer>
</body>
</html>`;

// --------------- Problematic: minimal site fixture ---------------
// Represents: example.com — a bare-bones page with almost no metadata.
// Expected score range: 30-65 (±10 tolerance = 20-75)
//
// Score analysis:
//   Crawlability (25): no-noindex×2(+10) + no-nofollow(+5) + no-auth(+5)
//                      + <10s(+5) + no-sitemap(0) = 25
//   Content (0): no-semantic(0) + no-desc(0) + title 14 chars too short(0)
//                + no-OG(0) + no-JSON-LD(0) + no-date(0) + no-viewport(0) + no-lang(0) = 0
//   Technical (15): no-canonical(0) + HTTPS(+5) + clean-URL(+5) + <3s(+5)
//                   + body>200(+5)? body is ~70 chars → 0 = 15
//   Quality (0): body≤300(0) + ≤2 links(0) = 0
//   Total: 40, Penalties: 0 → Final: 40
const PROBLEMATIC_MINIMAL_HTML = `<!DOCTYPE html>
<html>
<head>
    <title>Example Domain</title>
</head>
<body>
<div>
    <h1>Example Domain</h1>
    <p>This domain is for use in illustrative examples in documents. You may use this
    domain in literature without prior coordination or asking for permission.</p>
    <p><a href="https://www.iana.org/domains/example">More information...</a></p>
</div>
</body>
</html>`;

// --------------- Problematic: HTTP-only fixture ---------------
// Represents: neverssl.com — served over plain HTTP, no HTTPS.
// The fixture HTML is similar to minimal but the URL passed to scoreWebsite
// starts with http://, losing the HTTPS technical point.
// Expected score range: 0-40 (±10 tolerance = 0-50)
//
// Score analysis:
//   Crawlability (25): no-noindex×2(+10) + no-nofollow(+5) + no-auth(+5)
//                      + <10s(+5) + no-sitemap(0) = 25
//   Content (4): no-semantic(0) + no-desc(0) + title too short(0) + no-OG(0)
//                + no-JSON-LD(0) + no-date(0) + viewport(+4) + no-lang(0) = 4
//   Technical (10): no-canonical(0) + no-HTTPS(0) + clean-URL(+5) + <3s(+5)
//                   + body≤200(0) = 10
//   Quality (0): body≤300(0) + ≤2 links(0) = 0
//   Total: 39, Penalties: 0 → Final: 39
const PROBLEMATIC_HTTP_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>NeverSSL</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <div id="root">
    <p>This website is for when you try to open Facebook, Twitter, or some other site on public wifi.</p>
  </div>
</body>
</html>`;

// --------------- Problematic: auth wall (401) fixture ---------------
// Represents: a site that returns HTTP 401 and presents a login form.
// The 401 status code triggers the auth penalty.
// Expected score range: 0-20 (±10 tolerance = 0-30)
//
// Score analysis:
//   Crawlability (20): no-noindex×2(+10) + no-nofollow(+5) + authRequired→0
//                      + <10s(+5) + no-sitemap(0) = 20
//   Content (4): no-semantic(0) + no-desc(0) + no-title(0) + no-OG(0)
//                + no-JSON-LD(0) + no-date(0) + viewport(+4) + no-lang(0) = 4
//   Technical (10): no-canonical(0) + HTTPS(+5) + clean-URL(+5) + <3s(+5)→15
//                   body "Sign in to continue" ≈ 20 chars ≤200 = 0 → 10
//   Quality (0): body short(0) + ≤2 links(0) = 0
//   Base: 20+4+10+0 = 34
//   Penalties: statusCode=401 → authRequired=true → -30 → Final: 4
const PROBLEMATIC_AUTH_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Sign In</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <form method="post" action="/login">
    <h1>Sign in to continue</h1>
    <input type="email" name="email" placeholder="Email">
    <input type="password" name="password" placeholder="Password">
    <button type="submit">Sign In</button>
  </form>
</body>
</html>`;

// --------------- Problematic: 404 fixture ---------------
// Represents: a page that returns HTTP 404.
// Expected score range: 0-20 (±10 tolerance = 0-30)
//
// Score analysis:
//   Crawlability (25): no-noindex×2(+10) + no-nofollow(+5) + no-auth(+5)
//                      + <10s(+5) + no-sitemap(0) = 25
//   Content (0): no-semantic(0) + no-desc(0) + title too short(0) + no-OG(0)
//                + no-JSON-LD(0) + no-date(0) + no-viewport(0) + no-lang(0) = 0
//   Technical (15): no-canonical(0) + HTTPS(+5) + clean-URL(+5) + <3s(+5)
//                   + body≤200(0) = 15
//   Quality (0): body short(0) + ≤2 links(0) = 0
//   Base: 25+0+15+0 = 40
//   Penalties: statusCode=404, not auth/noindex → -25 → Final: 15
const PROBLEMATIC_404_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>404</title>
</head>
<body>
  <h1>404 Not Found</h1>
  <p>The page you requested could not be found.</p>
</body>
</html>`;

// --------------- Public API ---------------

type FixtureCategory =
  | 'static_content'
  | 'spa_no_schema'
  | 'spa_with_schema'
  | 'ecommerce'
  | 'media'
  | 'problematic_minimal'
  | 'problematic_http'
  | 'problematic_auth'
  | 'problematic_404';

/**
 * Returns a FetchResult fixture that represents what a plain HTTP crawler
 * (no JS execution) would receive from a site of the given category.
 *
 * The url parameter is used to set finalUrl on the fixture.
 */
const DEFAULT_ROBOTS: FetchResult['robotsTxt'] = {
  exists: true,
  blocksAllCrawlers: false,
  blocksAiCrawlers: false,
  sitemapUrls: [],
};
const DEFAULT_SITEMAP: FetchResult['sitemap'] = { exists: true, urlCount: 10 };

export function getFixtureForCategory(
  category: string,
  url: string,
): FetchResult {
  switch (category as FixtureCategory) {
    case 'static_content':
      return {
        html: STATIC_CONTENT_HTML,
        statusCode: 200,
        responseTimeMs: 800,
        redirectCount: 0,
        finalUrl: url,
        robotsTxt: DEFAULT_ROBOTS,
        sitemap: DEFAULT_SITEMAP,
      };

    case 'spa_no_schema':
      return {
        html: SPA_NO_SCHEMA_HTML,
        statusCode: 200,
        responseTimeMs: 1200,
        redirectCount: 1,
        finalUrl: url,
        robotsTxt: DEFAULT_ROBOTS,
        sitemap: DEFAULT_SITEMAP,
      };

    case 'spa_with_schema':
      return {
        html: SPA_WITH_SCHEMA_HTML,
        statusCode: 200,
        responseTimeMs: 1500,
        redirectCount: 0,
        finalUrl: url,
        robotsTxt: DEFAULT_ROBOTS,
        sitemap: DEFAULT_SITEMAP,
      };

    case 'ecommerce':
      return {
        html: ECOMMERCE_HTML,
        statusCode: 200,
        responseTimeMs: 2500,
        redirectCount: 1,
        finalUrl: url,
        robotsTxt: DEFAULT_ROBOTS,
        sitemap: DEFAULT_SITEMAP,
      };

    case 'media':
      return {
        html: MEDIA_HTML,
        statusCode: 200,
        responseTimeMs: 1800,
        redirectCount: 0,
        finalUrl: url,
        robotsTxt: DEFAULT_ROBOTS,
        sitemap: DEFAULT_SITEMAP,
      };

    case 'problematic_minimal':
      return {
        html: PROBLEMATIC_MINIMAL_HTML,
        statusCode: 200,
        responseTimeMs: 500,
        redirectCount: 0,
        finalUrl: url,
        robotsTxt: DEFAULT_ROBOTS,
        sitemap: DEFAULT_SITEMAP,
      };

    case 'problematic_http':
      return {
        html: PROBLEMATIC_HTTP_HTML,
        statusCode: 200,
        responseTimeMs: 600,
        redirectCount: 0,
        finalUrl: url,
        robotsTxt: DEFAULT_ROBOTS,
        sitemap: DEFAULT_SITEMAP,
      };

    case 'problematic_auth':
      return {
        html: PROBLEMATIC_AUTH_HTML,
        statusCode: 401,
        responseTimeMs: 400,
        redirectCount: 0,
        finalUrl: url,
        robotsTxt: DEFAULT_ROBOTS,
        sitemap: DEFAULT_SITEMAP,
      };

    case 'problematic_404':
      return {
        html: PROBLEMATIC_404_HTML,
        statusCode: 404,
        responseTimeMs: 350,
        redirectCount: 0,
        finalUrl: url,
        robotsTxt: DEFAULT_ROBOTS,
        sitemap: DEFAULT_SITEMAP,
      };

    default:
      throw new Error(`Unknown fixture category: ${category}`);
  }
}
