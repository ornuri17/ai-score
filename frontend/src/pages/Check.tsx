import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeWebsite } from '../services/api';
import { trackCheckSubmitted } from '../services/analytics';
import NavBar from '../components/NavBar';

const FAQ = [
  {
    q: 'Does this work for any website?',
    a: 'Yes. GradeByAI crawls any publicly accessible URL — any CMS, framework, or hosting provider. If the site requires login or is behind a firewall, it will return a low crawlability score explaining why.',
  },
  {
    q: 'How is this different from a regular SEO audit?',
    a: "Traditional SEO audits optimise for Google's ranking algorithm — keyword placement, backlinks, page authority. GradeByAI focuses on what AI crawlers specifically need: robots.txt permissions for GPTBot and ClaudeBot, machine-readable HTML without JavaScript rendering, and JSON-LD structured data.",
  },
  {
    q: 'What score should I be aiming for?',
    a: '80 or above is considered AI-optimised. Sites in this range are technically capable of being found and cited by ChatGPT, Claude, and Perplexity. If you score below 50, there are likely critical blockers preventing AI systems from reading your content at all.',
  },
];

const webAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'GradeByAI AI-Friendliness Checker',
  description:
    'Free tool that checks whether your website is visible to AI systems like ChatGPT, Claude, and Perplexity. Enter a URL and get an instant 0-100 AI-readiness score.',
  url: 'https://www.gradebyai.com/check',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: [
    'AI crawler access check (GPTBot, ClaudeBot, PerplexityBot)',
    'Content structure analysis',
    'Structured data audit',
    'Technical SEO check',
    'Free, instant, no account required',
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'GradeByAI', item: 'https://www.gradebyai.com' },
    { '@type': 'ListItem', position: 2, name: 'Check AI-Friendliness', item: 'https://www.gradebyai.com/check' },
  ],
};

const DIMENSIONS = [
  {
    label: 'Crawlability',
    pts: '30 pts',
    color: 'text-[#81ecff]',
    border: 'border-[#81ecff]/20',
    icon: 'travel_explore',
    desc: 'Are GPTBot, ClaudeBot, and PerplexityBot allowed in your robots.txt? Is the site publicly accessible without login? Is there a sitemap?',
  },
  {
    label: 'Content Structure',
    pts: '35 pts',
    color: 'text-[#a68cff]',
    border: 'border-[#a68cff]/20',
    icon: 'schema',
    desc: 'Does the page have semantic HTML, a proper meta description, Open Graph tags, JSON-LD structured data, and a language attribute?',
  },
  {
    label: 'Technical SEO',
    pts: '25 pts',
    color: 'text-[#ff6c95]',
    border: 'border-[#ff6c95]/20',
    icon: 'settings',
    desc: 'Is there a canonical tag? Does the site use HTTPS? Does the page load in under 3 seconds? Is body content present without JavaScript?',
  },
  {
    label: 'Content Quality',
    pts: '10 pts',
    color: 'text-[#81ecff]',
    border: 'border-[#81ecff]/20',
    icon: 'article',
    desc: 'Is there enough text content for an AI to summarise? Are there internal links that help crawlers discover more of the site?',
  },
];

const COMMON_ISSUES = [
  {
    icon: 'block',
    title: 'AI crawlers blocked in robots.txt',
    detail: '-20 pts penalty. Add explicit Allow rules for GPTBot, ClaudeBot, PerplexityBot.',
  },
  {
    icon: 'code_off',
    title: 'Content only visible with JavaScript',
    detail: 'AI crawlers read raw HTML. If your body is empty without JS, your content is invisible.',
  },
  {
    icon: 'lock',
    title: 'Login or authentication required',
    detail: '-30 pts penalty. AI systems cannot crawl pages behind a login wall.',
  },
  {
    icon: 'data_object',
    title: 'No JSON-LD structured data',
    detail: '-5 pts. Without schema markup, AI systems have to guess what your page is about.',
  },
  {
    icon: 'map',
    title: 'Missing sitemap',
    detail: '-5 pts. A sitemap at /sitemap.xml helps AI crawlers discover all your content.',
  },
];

const filledIcon = { fontVariationSettings: "'FILL' 1" };

export default function Check() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const normalizeAndValidate = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(withScheme);
      if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || !parsed.hostname.includes('.')) return null;
      return withScheme;
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalizedUrl = normalizeAndValidate(url);
    if (!normalizedUrl) {
      setError('Invalid URL. Please try again.');
      return;
    }
    setLoading(true);
    try {
      trackCheckSubmitted(normalizedUrl);
      const result = await analyzeWebsite(normalizedUrl);
      const domain = new URL(normalizedUrl).hostname;
      navigate(`/analysis/${domain}?checkId=${result.checkId}`);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 429 ? 'Rate limit reached. Try again tomorrow.' : 'Analysis failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e14]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <NavBar />

      {/* Hero + checker */}
      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-[#a68cff] font-label text-xs tracking-widest uppercase mb-4">
            Free · Instant · No account required
          </p>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-[#ecedf6] mb-5 leading-tight">
            Check If Your Website
            <br />
            Is AI-Friendly
          </h1>
          <p className="text-[#a9abb3] text-lg mb-10 max-w-2xl mx-auto">
            Find out in seconds whether ChatGPT, Claude, and Perplexity can find, read, and cite your content. Get a
            0-100 score with specific issues to fix.
          </p>
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 bg-[#1c2028] p-3 rounded-xl border border-[#45484f]/20">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="flex-1 bg-transparent text-[#ecedf6] placeholder-[#45484f] px-4 py-3 text-sm focus:outline-none font-body"
                disabled={loading}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading}
                className="gradient-primary text-[#005762] font-bold rounded-lg px-6 py-3 text-sm whitespace-nowrap disabled:opacity-60 transition-opacity"
              >
                {loading ? 'Checking...' : 'Check My Site'}
              </button>
            </div>
            {error && <p className="text-[#ef4444] text-sm mt-3 text-left">{error}</p>}
          </form>
          <p className="text-[#45484f] text-xs mt-4 font-label">Results in under 10 seconds · No personal data required</p>
        </div>
      </section>

      {/* The four dimensions */}
      <section className="bg-[#10131a] py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#a68cff] font-label text-xs tracking-widest uppercase mb-3">The Score</p>
            <h2 className="font-display text-3xl font-bold text-[#ecedf6]">4 signals AI crawlers check</h2>
            <p className="text-[#a9abb3] mt-3">
              Your overall score is a sum of four dimensions, each weighted by how much it impacts AI visibility.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DIMENSIONS.map((d) => (
              <div key={d.label} className={`bg-[#1c2028] rounded-2xl p-6 border ${d.border}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-2xl ${d.color}`} style={filledIcon}>
                      {d.icon}
                    </span>
                    <h3 className={`font-display font-bold text-base ${d.color}`}>{d.label}</h3>
                  </div>
                  <span className="font-label text-xs text-[#45484f] bg-[#0b0e14] px-2 py-1 rounded">{d.pts}</span>
                </div>
                <p className="text-[#a9abb3] text-sm leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Common issues */}
      <section className="bg-[#0b0e14] py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#a68cff] font-label text-xs tracking-widest uppercase mb-3">Common Issues</p>
            <h2 className="font-display text-3xl font-bold text-[#ecedf6]">Why websites are invisible to AI</h2>
            <p className="text-[#a9abb3] mt-3">
              These are the most common reasons a technically good website still doesn't appear in AI answers.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {COMMON_ISSUES.map((issue) => (
              <div key={issue.title} className="bg-[#1c2028] rounded-xl p-5 flex gap-4">
                <span className="material-symbols-outlined text-[#ef4444] text-xl mt-0.5 shrink-0" style={filledIcon}>
                  {issue.icon}
                </span>
                <div>
                  <h3 className="font-display font-semibold text-[#ecedf6] text-sm mb-1">{issue.title}</h3>
                  <p className="text-[#a9abb3] text-sm">{issue.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <p className="text-[#a9abb3] text-sm mb-4">
              GradeByAI detects all of these automatically and tells you exactly what to fix.
            </p>
            <button
              onClick={() => {
                setUrl('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="gradient-primary text-[#005762] font-bold rounded-lg py-3 px-8 text-sm"
            >
              Check My Site Now
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#10131a] py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-[#ecedf6]">Common questions</h2>
          </div>
          <div className="flex flex-col gap-5">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="bg-[#1c2028] rounded-xl p-6">
                <h3 className="font-display font-semibold text-[#ecedf6] mb-2">{q}</h3>
                <p className="text-[#a9abb3] text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <a href="/faq" className="text-[#a68cff] hover:text-[#81ecff] text-sm font-label transition-colors no-underline">
              View all 36 questions about AI readiness →
            </a>
          </div>
        </div>
      </section>

      {/* Guide link */}
      <section className="bg-[#0b0e14] py-16 px-6 text-center border-t border-[#1c2028]">
        <div className="max-w-2xl mx-auto">
          <p className="text-[#a9abb3] text-sm mb-2">Want to understand the full picture first?</p>
          <a
            href="/guides/how-to-check-ai-readiness"
            className="text-[#81ecff] hover:underline font-label text-sm font-semibold no-underline"
          >
            Read: How to Check If Your Website Is AI-Friendly →
          </a>
        </div>
      </section>

      <footer className="bg-[#10131a] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#a9abb3] text-sm">© {new Date().getFullYear()} GradeByAI. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="/how-it-works" className="text-[#a9abb3] hover:text-[#81ecff] text-sm no-underline transition-colors">
              How It Works
            </a>
            <a href="/faq" className="text-[#a9abb3] hover:text-[#81ecff] text-sm no-underline transition-colors">
              FAQ
            </a>
            <a href="/privacy" className="text-[#a9abb3] hover:text-[#81ecff] text-sm no-underline transition-colors">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
