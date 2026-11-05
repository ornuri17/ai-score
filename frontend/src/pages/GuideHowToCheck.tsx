import Header from '../components/Header';

const PAGE_URL = 'https://www.gradebyai.com/guides/how-to-check-ai-readiness';
const TITLE = 'How to Check If Your Website Is AI-Friendly';

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: TITLE,
  description:
    "Step-by-step guide to checking your website's AI-friendliness. Learn what AI crawlers look for, what commonly blocks them, and how to fix the most impactful issues.",
  author: { '@type': 'Organization', name: 'GradeByAI', url: 'https://www.gradebyai.com' },
  publisher: {
    '@type': 'Organization',
    name: 'GradeByAI',
    url: 'https://www.gradebyai.com',
    logo: { '@type': 'ImageObject', url: 'https://www.gradebyai.com/favicon.svg' },
  },
  datePublished: '2026-04-28',
  dateModified: '2026-04-28',
  mainEntityOfPage: PAGE_URL,
  image: 'https://www.gradebyai.com/og-image.png',
  about: [
    { '@type': 'Thing', name: 'Answer Engine Optimization' },
    { '@type': 'Thing', name: 'Generative Engine Optimization' },
    { '@type': 'Thing', name: 'AI crawlers' },
    { '@type': 'Thing', name: 'Website AI visibility' },
    { '@type': 'Thing', name: 'GPTBot' },
    { '@type': 'Thing', name: 'robots.txt' },
  ],
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'GradeByAI', item: 'https://www.gradebyai.com' },
    { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://www.gradebyai.com/guides' },
    { '@type': 'ListItem', position: 3, name: TITLE, item: PAGE_URL },
  ],
};

const ROBOTS_ALLOW_ALL_AI = `User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: *
Disallow: /`;

const WEBPAGE_SCHEMA_EXAMPLE = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Your Page Title",
  "description": "What this page is about",
  "url": "https://yoursite.com/this-page"
}
</script>`;

export default function GuideHowToCheck() {
  return (
    <div className="min-h-screen bg-[#0b0e14]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Header />
      <main className="max-w-2xl mx-auto px-6 pt-28 pb-24">
        <nav className="flex items-center gap-2 text-[#45484f] text-xs font-label mb-8">
          <a href="/" className="hover:text-[#a68cff] no-underline transition-colors">
            GradeByAI
          </a>
          <span>/</span>
          <a href="/guides" className="hover:text-[#a68cff] no-underline transition-colors">
            Guides
          </a>
          <span>/</span>
          <span className="text-[#a9abb3]">{TITLE}</span>
        </nav>

        <header className="mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[#ecedf6] leading-tight mb-5">{TITLE}</h1>
          <div className="flex items-center gap-4 text-[#45484f] text-sm font-label">
            <time dateTime="2026-04-28">April 28, 2026</time>
            <span>·</span>
            <span>6 min read</span>
            <span>·</span>
            <span>GradeByAI Team</span>
          </div>
        </header>

        <article className="prose-guide">
          <p>
            AI search engines like Perplexity, ChatGPT, and Claude now answer millions of questions per day by
            retrieving and citing web pages. If your website is not AI-friendly, it will not appear in those
            answers — regardless of how well it ranks on Google.
          </p>
          <p>
            This guide covers exactly what AI-friendliness means, how to check it, and which issues to fix
            first.
          </p>
          <h2>What "AI-friendly" actually means</h2>
          <p>
            An AI-friendly website is one that AI crawlers can access, read, and understand. This is different
            from being Google-friendly in three important ways:
          </p>
          <ul>
            <li>
              {"AI crawlers need explicit permission in your "}
              <code>robots.txt</code>
              {" file"}
            </li>
            <li>
              AI crawlers often do not execute JavaScript — your content must be present in the initial HTML
              response
            </li>
            <li>
              AI crawlers rely on structured data (JSON-LD schema) to understand what a page is about, rather
              than inferring it from prose
            </li>
          </ul>
          <p>
            A page that ranks first on Google can score zero for AI-readiness if it blocks AI crawlers or
            renders content exclusively via JavaScript.
          </p>
          <h2>Step 1: Check if AI crawlers can access your site</h2>
          <p>
            {"Open your "}
            <code>robots.txt</code>
            {" file (at "}
            <code>yourwebsite.com/robots.txt</code>
            {") and look for these three user agents: "}
            <strong>GPTBot</strong>
            {" (ChatGPT), "}
            <strong>ClaudeBot</strong>
            {" (Claude), and"} <strong>PerplexityBot</strong>
            {" (Perplexity)."}
          </p>
          <p>If you see any rule like this:</p>
          <pre>{"User-agent: GPTBot\nDisallow: /"}</pre>
          <p>That bot cannot crawl your site at all. Change the rule to:</p>
          <pre>{"User-agent: GPTBot\nAllow: /"}</pre>
          <p>Also check for a wildcard block:</p>
          <pre>{"User-agent: *\nDisallow: /"}</pre>
          <p>
            This blocks all bots including AI crawlers. If you need it for other reasons, add explicit Allow
            rules for each AI bot above it:
          </p>
          <pre>{ROBOTS_ALLOW_ALL_AI}</pre>
          <h2>Step 2: Check if your content is machine-readable</h2>
          <p>
            AI crawlers retrieve your raw HTML — they do not execute JavaScript. The simplest way to see what
            they see: open your browser's developer tools, disable JavaScript (<kbd>F12</kbd>
            {" → Settings → Disable JavaScript), and reload your page."}
          </p>
          <p>
            If your page body is empty without JavaScript, your content is invisible to AI. The fix is either
            server-side rendering (SSR) or ensuring key content is present in the HTML before any scripts run.
          </p>
          <p>Also confirm these are present in your HTML source:</p>
          <ul>
            <li>
              {"A "}
              <code>{'<meta name="description">'}</code>
              {" tag between 50 and 160 characters"}
            </li>
            <li>
              {"A "}
              <code>{"<title>"}</code>
              {" tag between 30 and 60 characters"}
            </li>
            <li>
              {"A heading hierarchy using "}
              <code>{"<h1>"}</code>
              {", "}
              <code>{"<h2>"}</code>
              {", "}
              <code>{"<h3>"}</code>
            </li>
            <li>
              {"An "}
              <code>{'<html lang="">'}</code>
              {" attribute set to your primary language"}
            </li>
            <li>
              {"A sitemap reachable at "}
              <code>/sitemap.xml</code>
            </li>
          </ul>
          <h2>Step 3: Check your structured data</h2>
          <p>
            JSON-LD schema markup tells AI systems exactly what your page is about. Without it, the AI has to
            infer your content from prose, which is unreliable and often wrong.
          </p>
          <p>
            {"At minimum, add a "}
            <code>WebPage</code>
            {" schema. For FAQ pages, use "}
            <code>FAQPage</code>
            {". For articles, use "}
            <code>Article</code>
            {". For businesses, use "}
            <code>LocalBusiness</code>
            {" or "}
            <code>Organization</code>.
          </p>
          <pre>{WEBPAGE_SCHEMA_EXAMPLE}</pre>
          <p>
            {"Add this inside the "}
            <code>{"<head>"}</code>
            {
              " of each page. Google's Rich Results Test can validate your schema if you want to verify it's correctly formed."
            }
          </p>
          <h2>Step 4: Run an automated check</h2>
          <p>
            Checking all of the above manually — across every page, on a live site — is slow and error-prone.{" "}
            <a href="/check">GradeByAI</a>
            {
              " automates the entire process: enter your URL and get a 0-100 score across all four dimensions in under 10 seconds."
            }
          </p>
          <p>
            The score breaks down into crawlability (30 pts), content structure (35 pts), technical SEO (25
            pts), and content quality (10 pts). Each issue is listed specifically — not a vague
            recommendation, but the exact thing that needs to change.
          </p>
          <h2>Step 5: Fix issues in priority order</h2>
          <p>
            If your crawlability score is below 20, fix that first. A blocked site cannot benefit from any
            other improvements — it does not matter how good your content is if AI crawlers cannot reach it.
          </p>
          <p>
            After crawlability: focus on content structure. Adding JSON-LD schema alone can move your score by
            5-10 points. Fixing a missing or too-short meta description adds another 4 points immediately.
          </p>
          <p>
            Technical SEO issues (missing canonical, slow load time) are worth fixing but have smaller impact
            on AI visibility compared to crawlability and structure. Content quality (text length, internal
            links) is the smallest lever.
          </p>
          <h2>How to verify the fix worked</h2>
          <p>
            After deploying your changes, re-run your GradeByAI analysis using the Force Refresh option (the
            dropdown on the Re-analyze button). This bypasses the 7-day cache and crawls your live site
            immediately.
          </p>
          <p>
            A score above 80 means your site is technically AI-ready. Whether you appear in AI answers also
            depends on the relevance and authority of your content relative to the question being asked — but
            without a score above 80, you cannot get there regardless of content quality.
          </p>
          <p>
            For deeper questions about specific issues — what a particular error means, how to fix JavaScript
            rendering, what schema types have the most impact — see the{" "}
            <a href="/faq">full AI readiness FAQ</a>.
          </p>
        </article>
        <div className="mt-14 bg-[#1c2028] rounded-2xl p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-[#ecedf6] mb-3">Check your site now</h2>
          <p className="text-[#a9abb3] text-sm mb-6">
            Free. Instant. No account required. See your score in under 10 seconds.
          </p>
          <a
            href="/check"
            className="gradient-primary text-[#005762] font-bold rounded-lg py-3 px-8 inline-block no-underline text-sm"
          >
            Check If My Website Is AI-Friendly →
          </a>
        </div>
        <div className="mt-10 pt-8 border-t border-[#1c2028]">
          <p className="text-[#45484f] font-label text-xs uppercase tracking-widest mb-4">Related</p>
          <div className="flex flex-col gap-2">
            <a
              href="/how-it-works"
              className="text-[#a9abb3] hover:text-[#81ecff] text-sm no-underline transition-colors"
            >
              How GradeByAI calculates the score →
            </a>
            <a
              href="/faq"
              className="text-[#a9abb3] hover:text-[#81ecff] text-sm no-underline transition-colors"
            >
              Full AI readiness FAQ (36 questions) →
            </a>
            <a
              href="/leaderboard"
              className="text-[#a9abb3] hover:text-[#81ecff] text-sm no-underline transition-colors"
            >
              Top AI-ready websites leaderboard →
            </a>
          </div>
        </div>
      </main>
      <footer className="bg-[#10131a] py-8 px-6 border-t border-[#1c2028]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#a9abb3] text-sm">
            © {new Date().getFullYear()} GradeByAI. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a
              href="/privacy"
              className="text-[#a9abb3] hover:text-[#81ecff] text-sm no-underline transition-colors"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="text-[#a9abb3] hover:text-[#81ecff] text-sm no-underline transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
    );
}
