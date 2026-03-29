import Header from '../components/Header';

const steps = [
  {
    number: '01',
    numberColor: 'text-[#81ecff]',
    title: 'We Crawl Your Site',
    description:
      'Our crawler visits your live site just like an AI assistant would — following robots.txt, checking sitemaps, and testing JavaScript rendering.',
    pts: '30 pts',
  },
  {
    number: '02',
    numberColor: 'text-[#a68cff]',
    title: 'Content Structure Analysis',
    description:
      'We evaluate heading hierarchies, semantic HTML, schema.org markup, and whether your content is machine-readable.',
    pts: '35 pts',
  },
  {
    number: '03',
    numberColor: 'text-[#ff6c95]',
    title: 'Technical SEO Audit',
    description:
      'Meta tags, canonical URLs, page speed signals, and structured data all feed into your technical score.',
    pts: '25 pts',
  },
  {
    number: '04',
    numberColor: 'text-[#81ecff]',
    title: 'Content Quality Signal',
    description:
      'AI systems favour authoritative, well-structured content. We measure readability, depth, and topical coverage.',
    pts: '10 pts',
  },
];

const tiers = [
  {
    range: '80–100',
    label: 'AI-Optimized',
    description: 'Your site is highly visible to AI assistants.',
    accentColor: 'text-[#81ecff]',
    borderColor: 'border-[#81ecff]/20',
  },
  {
    range: '50–79',
    label: 'Needs Work',
    description: 'Key barriers are limiting your AI visibility.',
    accentColor: 'text-[#a68cff]',
    borderColor: 'border-[#a68cff]/20',
  },
  {
    range: '0–49',
    label: 'Critical Issues',
    description: 'Significant barriers prevent AI discovery.',
    accentColor: 'text-[#ff6c95]',
    borderColor: 'border-[#ff6c95]/20',
  },
];

const faqs = [
  {
    q: 'What is AI-readiness?',
    a: 'AI-readiness (AEO) measures how well AI systems like ChatGPT and Claude can find, read, and understand your content. Sites that score well are more likely to appear in AI-generated answers.',
  },
  {
    q: 'How is the score calculated?',
    a: 'We analyze 4 dimensions: crawlability (30pts), content structure (35pts), technical SEO (25pts), and content quality (10pts). Each is scored by crawling your live site.',
  },
  {
    q: 'Why is my score low?',
    a: 'Common issues include missing structured data, JavaScript-only rendering, no sitemap, poor heading hierarchy, and thin content. Your results page shows exactly what to fix.',
  },
  {
    q: 'Is my data stored?',
    a: 'We store your domain and score for caching (results are cached for 7 days). If you submit the lead form, we store your name, email, and phone. We never sell your data.',
  },
  {
    q: 'How often is my score updated?',
    a: 'Scores are cached for 7 days. To force a fresh analysis, simply submit your URL again after the cache expires.',
  },
  {
    q: 'Is this tool free?',
    a: 'Yes, fully free. The score and detailed breakdown are always free. We offer a premium consultation service for teams that need a full AEO action plan.',
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-[#0b0e14]">
      <Header />

      {/* Hero */}
      <section className="bg-[#0b0e14] py-24 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-[#a68cff] font-label text-xs tracking-widest mb-4 uppercase">
            THE PROCESS
          </p>
          <h1 className="font-display text-5xl font-bold text-[#ecedf6] mb-4">
            How AIScore Works
          </h1>
          <p className="text-[#a9abb3] text-lg">
            Four dimensions. One definitive score. Complete clarity on your AI readiness.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-[#10131a] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step) => (
              <div key={step.number} className="bg-[#1c2028] rounded-2xl p-8">
                <span className={`font-display text-4xl font-bold ${step.numberColor}`}>
                  {step.number}
                </span>
                <h3 className="font-display font-bold text-xl text-[#ecedf6] mt-4 mb-3">
                  {step.title}
                </h3>
                <p className="text-[#a9abb3] text-sm mb-4">{step.description}</p>
                <span className="bg-[#591adc]/30 text-[#a68cff] rounded-full px-3 py-1 text-xs font-label">
                  {step.pts}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Score Visualization */}
      <section className="bg-[#0b0e14] py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[#a68cff] font-label text-xs tracking-widest uppercase mb-4">
              THE SCORE
            </p>
            <h2 className="font-display text-4xl font-bold text-[#ecedf6]">
              Your Score, Explained
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.range}
                className={`bg-[#1c2028] rounded-2xl p-6 border ${tier.borderColor}`}
              >
                <p className={`font-display text-3xl font-bold ${tier.accentColor} mb-2`}>
                  {tier.range}
                </p>
                <h3 className={`font-display font-semibold text-lg ${tier.accentColor} mb-3`}>
                  {tier.label}
                </h3>
                <p className="text-[#a9abb3] text-sm">{tier.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#10131a] py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="font-label text-xs tracking-widest text-[#a68cff] uppercase mb-4">
              FREQUENTLY ASKED QUESTIONS
            </p>
            <h2 className="font-display text-4xl text-[#ecedf6] font-bold">Common Questions</h2>
          </div>
          <div className="flex flex-col gap-4">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="font-display font-semibold text-[#ecedf6] mb-2">{faq.q}</h3>
                <p className="text-[#a9abb3] text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0b0e14] py-24 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-4xl font-bold text-[#ecedf6] mb-8">
            Ready to See Your Score?
          </h2>
          <a
            href="/"
            className="gradient-primary text-[#005762] font-bold rounded-lg py-3 px-8 inline-block no-underline"
          >
            Analyze My Site
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#10131a] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#a9abb3] text-sm">
            &copy; {new Date().getFullYear()} AIScore. All rights reserved.
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
