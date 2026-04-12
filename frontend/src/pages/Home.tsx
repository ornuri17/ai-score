import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { analyzeWebsite, compareWebsites } from '../services/api';
import { trackCheckSubmitted, trackCompareSubmitted } from '../services/analytics';
import NavBar from '../components/NavBar';

const FAQ = [
  { q: 'What is GEO (Generative Engine Optimization)?', a: 'GEO is the successor to SEO. It focuses on optimizing content to be cited as a source in generative AI responses (like Perplexity, Google Gemini, or ChatGPT Browse). It prioritizes credibility, factual density, and semantic relevance over keyword frequency.' },
  { q: 'How is the score calculated?', a: 'We analyze 4 dimensions: crawlability (30pts), content structure (35pts), technical SEO (25pts), and content quality (10pts). Each is scored by crawling your live site.' },
  { q: 'Why is my score low?', a: 'Common issues include missing structured data, JavaScript-only rendering, no sitemap, poor heading hierarchy, and thin content. Your results page shows exactly what to fix.' },
  { q: 'Is my data stored?', a: 'We store your domain and score for caching (results are cached for 7 days). If you submit the lead form, we store your name, email, and phone. We never sell your data.' },
];

export default function Home() {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [showCompare, setShowCompare] = useState(false);
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

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedUrl = normalizeAndValidate(url);
    if (!normalizedUrl) {
      setError(t('home.errors.invalid') || 'Invalid URL. Please try again.');
      return;
    }

    if (showCompare) {
      const normalizedCompetitor = normalizeAndValidate(competitorUrl);
      if (!normalizedCompetitor) {
        setError(t('home.errors.invalid') || 'Invalid competitor URL. Please try again.');
        return;
      }
    }

    setLoading(true);

    try {
      if (showCompare) {
        const normalizedCompetitor = normalizeAndValidate(competitorUrl)!;
        trackCompareSubmitted(normalizedUrl, normalizedCompetitor);
        const result = await compareWebsites(normalizedUrl, normalizedCompetitor);
        const myCheckId = result.myUrl.checkId;
        const compCheckId = result.competitorUrl.checkId;
        sessionStorage.setItem(`aiscore_compare_${myCheckId}_${compCheckId}`, JSON.stringify(result));
        navigate(`/compare?myCheckId=${myCheckId}&competitorCheckId=${compCheckId}`);
      } else {
        trackCheckSubmitted(normalizedUrl);
        const result = await analyzeWebsite(normalizedUrl);
        const domain = new URL(normalizedUrl).hostname;
        navigate(`/analysis/${domain}?checkId=${result.check_id}`);
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setError(t('home.errors.rateLimit') || 'Too many requests. Please wait.');
      } else if (status === 503) {
        setError(t('home.errors.unreachable') || 'Site unreachable. Check the URL.');
      } else {
        setError(t('home.errors.invalid') || 'Analysis failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <main className="relative">

        {/* ── Hero ── */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 hero-gradient overflow-hidden">
          <div className="max-w-7xl mx-auto text-center relative z-10">

            <div className="inline-flex items-center px-4 py-1.5 mb-8 rounded-full bg-[#591adc]/20 border border-[#a68cff]/20">
              <span className="text-[#a68cff] font-label text-xs tracking-widest uppercase">
                {t('hero.badge')}
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-[#ecedf6] tracking-tighter mb-6">
              {t('hero.title')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#81ecff] to-[#a68cff]">
                {t('hero.titleHighlight')}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-[#a9abb3] font-body max-w-2xl mx-auto mb-12 leading-relaxed">
              {t('hero.subtitle')}
            </p>

            {/* Mode tabs */}
            <div className="max-w-3xl mx-auto flex bg-[#1c2028] rounded-t-xl overflow-hidden border-b border-[#45484f]/20">
              <button
                type="button"
                onClick={() => { setShowCompare(false); setError(''); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 font-label font-bold text-xs tracking-wide transition-all"
                style={{
                  color: !showCompare ? '#81ecff' : 'rgba(232,234,246,0.35)',
                  background: !showCompare ? 'rgba(129,236,255,0.05)' : 'transparent',
                  borderBottom: !showCompare ? '2px solid #81ecff' : '2px solid transparent',
                }}
              >
                <span className="material-symbols-outlined text-sm">language</span>
                {t('hero.singleMode')}
              </button>
              <button
                type="button"
                onClick={() => { setShowCompare(true); setError(''); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 font-label font-bold text-xs tracking-wide transition-all border-l border-[#45484f]/20"
                style={{
                  color: showCompare ? '#a68cff' : 'rgba(232,234,246,0.35)',
                  background: showCompare ? 'rgba(166,140,255,0.05)' : 'transparent',
                  borderBottom: showCompare ? '2px solid #a68cff' : '2px solid transparent',
                }}
              >
                <span className="material-symbols-outlined text-sm">compare_arrows</span>
                {t('hero.compareToggleOff')}
              </button>
            </div>

            {/* URL Input form */}
            <form onSubmit={handleAnalyze} className="max-w-3xl mx-auto p-3 bg-[#1c2028] rounded-b-xl flex flex-col gap-3 shadow-2xl">
              {/* Primary URL */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-grow flex items-center px-4 gap-3 bg-[#22262f] rounded-lg border-b-2 border-transparent focus-within:border-[#81ecff] transition-all duration-300">
                  <span className="material-symbols-outlined text-[#73757d] text-sm">language</span>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t('hero.placeholder')}
                    disabled={loading}
                    required
                    style={{ fontSize: '16px' }}
                    className="w-full py-3.5 bg-transparent border-none text-[#ecedf6] focus:ring-0 focus:outline-none placeholder:text-[#73757d]/50"
                  />
                </div>
                {!showCompare && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-[#81ecff] to-[#00d4ec] text-[#003840] px-10 py-3.5 rounded-lg font-headline font-bold text-base active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base animate-spin">autorenew</span>
                        {t('hero.analyzing')}
                      </span>
                    ) : (
                      t('hero.analyzeBtn')
                    )}
                  </button>
                )}
              </div>

              {/* Competitor URL (compare mode) */}
              {showCompare && (
                <>
                  <div className="flex items-center px-4 gap-3 bg-[#22262f] rounded-lg border-b-2 border-transparent focus-within:border-[#a68cff] transition-all duration-300">
                    <span className="material-symbols-outlined text-[#73757d] text-sm">compare_arrows</span>
                    <input
                      type="text"
                      value={competitorUrl}
                      onChange={(e) => setCompetitorUrl(e.target.value)}
                      placeholder={t('hero.competitorPlaceholder')}
                      disabled={loading}
                      required
                      style={{ fontSize: '16px' }}
                      className="w-full py-3.5 bg-transparent border-none text-[#ecedf6] focus:ring-0 focus:outline-none placeholder:text-[#73757d]/50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-lg font-headline font-bold text-base active:scale-95 transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #a68cff, #81ecff)', color: '#003840' }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-base animate-spin">autorenew</span>
                        {t('hero.analyzingBoth')}
                      </span>
                    ) : (
                      t('hero.compareBtn')
                    )}
                  </button>
                </>
              )}
            </form>

            {error && (
              <div role="alert" className="mt-4 max-w-3xl mx-auto p-4 bg-[#ff6e84]/10 text-[#ff6e84] rounded-lg border border-[#ff6e84]/20 text-sm">
                {error}
              </div>
            )}

          </div>

          {/* Background blobs */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none">
            <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#81ecff]/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-[#a68cff]/10 blur-[120px] rounded-full" />
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="py-24 px-6 bg-[#10131a]">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16">
              <h2 className="text-3xl md:text-4xl font-headline font-bold mb-4 text-[#ecedf6]">{t('howItWorks.title')}</h2>
              <p className="text-[#a9abb3] font-body">{t('howItWorks.subtitle')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: 'dataset', color: '#81ecff', bg: 'bg-[#81ecff]/10', titleKey: 'howItWorks.step1Title', descKey: 'howItWorks.step1Desc', stageKey: 'howItWorks.step1Stage', offset: false },
                { icon: 'psychology', color: '#a68cff', bg: 'bg-[#a68cff]/10', titleKey: 'howItWorks.step2Title', descKey: 'howItWorks.step2Desc', stageKey: 'howItWorks.step2Stage', offset: true },
                { icon: 'bolt', color: '#ff6c95', bg: 'bg-[#ff6c95]/10', titleKey: 'howItWorks.step3Title', descKey: 'howItWorks.step3Desc', stageKey: 'howItWorks.step3Stage', offset: false },
              ].map(({ icon, color, bg, titleKey, descKey, stageKey, offset }) => (
                <div
                  key={titleKey}
                  className={`group bg-[#1c2028] p-8 rounded-xl border border-[#45484f]/15 hover:bg-[#22262f] transition-all duration-300 ${offset ? 'md:translate-y-6' : ''}`}
                >
                  <div className={`w-12 h-12 ${bg} rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                  </div>
                  <h3 className="text-xl font-headline font-bold mb-4 text-[#ecedf6]">{t(titleKey)}</h3>
                  <p className="text-[#a9abb3] font-body leading-relaxed">{t(descKey)}</p>
                  <div className="mt-6 font-label text-[10px] tracking-[0.2em] uppercase" style={{ color: `${color}80` }}>{t(stageKey)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why It Matters ── */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold mb-8 tracking-tight text-[#ecedf6]">
                {t('why.title')}{' '}
                <span className="text-[#81ecff] italic">{t('why.titleHighlight')}</span>{' '}
                {t('why.titleSuffix')}
              </h2>
              <div className="space-y-12">
                {[
                  { num: '01', color: '#81ecff', border: 'border-[#81ecff]/30', titleKey: 'why.reason1Title', descKey: 'why.reason1Desc' },
                  { num: '02', color: '#a68cff', border: 'border-[#a68cff]/30', titleKey: 'why.reason2Title', descKey: 'why.reason2Desc' },
                  { num: '03', color: '#ff6c95', border: 'border-[#ff6c95]/30', titleKey: 'why.reason3Title', descKey: 'why.reason3Desc' },
                ].map(({ num, color, border, titleKey, descKey }) => (
                  <div key={num} className="flex gap-6">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border ${border} flex items-center justify-center font-label text-sm`} style={{ color }}>
                      {num}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold font-headline mb-2 text-[#ecedf6]">{t(titleKey)}</h4>
                      <p className="text-[#a9abb3] font-body leading-relaxed">{t(descKey)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual card */}
            <div className="relative bg-[#161a21] rounded-2xl p-8 border border-[#45484f]/10 shadow-2xl overflow-hidden min-h-[400px]">
              <div className="relative z-10 space-y-4">
                <div className="p-4 bg-[#22262f]/80 backdrop-blur-md rounded-lg border-l-4 border-[#81ecff] shadow-lg animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#81ecff] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-label text-[10px] text-[#81ecff] uppercase tracking-widest">Live Analysis</span>
                  </div>
                  <div className="h-2 w-3/4 bg-[#81ecff]/20 rounded mb-2" />
                  <div className="h-2 w-1/2 bg-[#81ecff]/20 rounded" />
                </div>
                <div className="p-4 bg-[#22262f]/80 backdrop-blur-md rounded-lg border-l-4 border-[#a68cff] shadow-lg ml-8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#a68cff] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
                    <span className="font-label text-[10px] text-[#a68cff] uppercase tracking-widest">Semantic Map</span>
                  </div>
                  <div className="h-2 w-5/6 bg-[#a68cff]/20 rounded mb-2" />
                  <div className="h-2 w-2/3 bg-[#a68cff]/20 rounded" />
                </div>
                <div className="p-4 bg-[#22262f]/80 backdrop-blur-md rounded-lg border-l-4 border-[#ff6c95] shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#ff6c95] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    <span className="font-label text-[10px] text-[#ff6c95] uppercase tracking-widest">Optimization Complete</span>
                  </div>
                  <div className="text-2xl font-headline font-black text-[#ecedf6] tracking-tighter">Score: 94/100</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-16 px-6 bg-[#10131a]">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-headline font-bold text-[#ecedf6] mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {FAQ.map(({ q, a }) => (
                <div key={q} className="bg-[#161a21] rounded-xl p-6 hover:bg-[#1c2028] transition-colors">
                  <h3 className="font-headline font-semibold text-[#ecedf6] mb-2">{q}</h3>
                  <p className="text-[#a9abb3] text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-24 px-6 bg-[#0b0e14] border-y border-[#45484f]/10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-headline font-bold mb-8 text-[#ecedf6]">
              {t('cta.title')}{' '}
              <span className="text-[#a68cff]">{t('cta.titleHighlight')}</span>
            </h2>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="bg-gradient-to-r from-[#81ecff] to-[#00d4ec] text-[#003840] px-12 py-5 rounded-lg font-headline font-bold text-xl active:scale-95 transition-all shadow-xl"
              >
                {t('cta.startBtn')}
              </button>
              <button
                type="button"
                onClick={() => { setShowCompare(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="bg-[#22262f] text-[#ecedf6] px-12 py-5 rounded-lg font-headline font-bold text-xl active:scale-95 transition-all border border-[#45484f]/30 hover:bg-[#282c36]"
              >
                {t('cta.compareBtn')}
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-[#0b0e14] w-full py-12 border-t border-[#45484f]/15">
        <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-2 md:flex md:flex-row md:justify-between items-center gap-4 md:gap-6">
          <div className="text-lg font-bold text-[#81ecff] font-headline">GradeByAI</div>
          <div className="font-body text-sm text-[#ecedf6]/60">© 2025 GradeByAI. {t('home.footerTagline')}</div>
          <div className="flex gap-6">
            <a className="text-[#ecedf6]/50 hover:text-[#a68cff] transition-colors font-body text-sm" href="/privacy">{t('howItWorks.privacy')}</a>
            <a className="text-[#ecedf6]/50 hover:text-[#a68cff] transition-colors font-body text-sm" href="/terms">{t('howItWorks.terms')}</a>
            <a className="text-[#ecedf6]/50 hover:text-[#a68cff] transition-colors font-body text-sm" href="/how-it-works">{t('nav.howItWorks')}</a>
          </div>
        </div>
      </footer>
    </>
  );
}
