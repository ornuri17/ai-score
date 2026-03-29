import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import { analyzeWebsite } from '../services/api';

const FAQ = [
  { q: 'What is AI-readiness?', a: 'AI-readiness (AEO) measures how well AI systems like ChatGPT and Claude can find, read, and understand your content. Sites that score well are more likely to appear in AI-generated answers.' },
  { q: 'How is the score calculated?', a: 'We analyze 4 dimensions: crawlability (30pts), content structure (35pts), technical SEO (25pts), and content quality (10pts). Each is scored by crawling your live site.' },
  { q: 'Why is my score low?', a: 'Common issues include missing structured data, JavaScript-only rendering, no sitemap, poor heading hierarchy, and thin content. Your results page shows exactly what to fix.' },
  { q: 'Is my data stored?', a: 'We store your domain and score for caching (results are cached for 7 days). If you submit the lead form, we store your name, email, and phone. We never sell your data.' },
];

export default function Home() {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await analyzeWebsite(url);
      const domain = new URL(url).hostname;
      navigate(`/analysis/${domain}?checkId=${result.check_id}`);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setError(t('home.errors.rateLimit'));
      } else if (status === 503) {
        setError(t('home.errors.unreachable'));
      } else {
        setError(t('home.errors.invalid'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      {/* Hero */}
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-2xl w-full px-6 py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            How AI-Ready Is Your Website?
          </h1>
          <p className="text-lg text-slate-300 mb-2">
            {t('home.subtitle')}
          </p>
          <p className="text-sm text-slate-400 mb-8">
            Free tool used by AEO agencies to evaluate client websites.
          </p>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <input
              type="url"
              placeholder={t('home.placeholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              style={{ fontSize: '16px' }}
              className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 disabled:opacity-60"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors min-h-[48px]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  {t('home.analyzing')}
                </span>
              ) : (
                'Check My Website'
              )}
            </button>
          </form>

          {error && (
            <div role="alert" className="mt-4 p-4 bg-red-900/80 text-red-100 rounded-lg border border-red-700">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-slate-50 py-16">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-semibold text-slate-900 mb-1">{q}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 text-center text-sm">
        <p>
          <a href="/privacy" className="hover:text-white underline">Privacy Policy</a>
          {' · '}
          <a href="/terms" className="hover:text-white underline">Terms of Service</a>
        </p>
        <p className="mt-2">© {new Date().getFullYear()} AIScore</p>
      </footer>
    </>
  );
}
