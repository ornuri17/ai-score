import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { analyzeWebsite } from '../services/api';
import NavBar from '../components/NavBar';

export default function Home() {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError(t('home.errors.invalid'));
      return;
    }
    setLoading(true);
    setError('');
    const normalizedUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
    try {
      const result = await analyzeWebsite(normalizedUrl);
      const domain = new URL(normalizedUrl).hostname;
      navigate(`/analysis/${domain}?checkId=${result.check_id}`);
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number } })?.response;
      if (!response) setError(t('home.serverError'));
      else if (response.status === 429) setError(t('home.errors.rateLimit'));
      else if (response.status === 503) setError(t('home.errors.unreachable'));
      else setError(t('home.errors.invalid'));
    } finally {
      setLoading(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <NavBar />

      <main className="relative">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 hero-gradient overflow-hidden">
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center px-4 py-1.5 mb-8 rounded-full bg-secondary-container/20 border border-secondary/20">
              <span className="text-secondary font-label text-xs tracking-widest uppercase">{t('home.badge')}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-headline font-extrabold text-on-background tracking-tighter mb-6">
              {t('home.heroTitle1')} <span className="gradient-text">{t('home.heroTitle2')}</span>
            </h1>
            <p className="text-base md:text-xl text-on-surface-variant font-body max-w-2xl mx-auto mb-10 leading-relaxed">
              {t('home.description')}
            </p>

            {/* URL Input Form */}
            <form
              ref={formRef}
              onSubmit={handleAnalyze}
              className="max-w-3xl mx-auto p-2 bg-surface-container-high rounded-xl flex flex-col md:flex-row gap-3 shadow-2xl"
            >
              <div className="flex-grow flex items-center px-4 gap-3 bg-surface-container-highest rounded-lg border-b-2 border-transparent focus-within:border-primary transition-all duration-300">
                <span className="material-symbols-outlined text-outline">language</span>
                <input
                  className="w-full py-4 bg-transparent border-none text-on-surface focus:ring-0 placeholder:text-outline/50"
                  placeholder={t('home.placeholder')}
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-primary to-primary-dim text-on-primary-fixed px-10 py-4 rounded-lg font-headline font-bold text-lg active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center min-w-[160px]"
              >
                {loading ? (
                  <div className="refraction-loader">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  t('home.analyzeButton')
                )}
              </button>
            </form>

            {/* Error state */}
            {error && (
              <div role="alert" className="mt-4 text-center text-sm" style={{ color: '#ff6c95' }}>
                {error}
              </div>
            )}

          </div>

          {/* Abstract Background Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none">
            <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-secondary/10 blur-[120px] rounded-full"></div>
          </div>
        </section>

        {/* How It Works (Bento Grid) */}
        <section className="py-24 px-6 bg-surface-container-low">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16">
              <h2 className="text-3xl md:text-4xl font-headline font-bold mb-4">{t('home.howItWorksTitle')}</h2>
              <p className="text-on-surface-variant font-body">{t('home.howItWorksSubtitle')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="group bg-surface-container-high p-8 rounded-xl border border-outline-variant/15 hover:bg-surface-container-highest transition-all duration-300">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dataset</span>
                </div>
                <h3 className="text-xl font-headline font-bold mb-4">{t('home.step1Title')}</h3>
                <p className="text-on-surface-variant font-body leading-relaxed">{t('home.step1Desc')}</p>
                <div className="mt-6 font-label text-[10px] tracking-[0.2em] text-primary/50 uppercase">{t('home.step1Stage')}</div>
              </div>
              {/* Step 2 */}
              <div className="group bg-surface-container-high p-8 rounded-xl border border-outline-variant/15 hover:bg-surface-container-highest transition-all duration-300 md:translate-y-6">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-6 text-secondary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                </div>
                <h3 className="text-xl font-headline font-bold mb-4">{t('home.step2Title')}</h3>
                <p className="text-on-surface-variant font-body leading-relaxed">{t('home.step2Desc')}</p>
                <div className="mt-6 font-label text-[10px] tracking-[0.2em] text-secondary/50 uppercase">{t('home.step2Stage')}</div>
              </div>
              {/* Step 3 */}
              <div className="group bg-surface-container-high p-8 rounded-xl border border-outline-variant/15 hover:bg-surface-container-highest transition-all duration-300">
                <div className="w-12 h-12 bg-tertiary/10 rounded-lg flex items-center justify-center mb-6 text-tertiary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                </div>
                <h3 className="text-xl font-headline font-bold mb-4">{t('home.step3Title')}</h3>
                <p className="text-on-surface-variant font-body leading-relaxed">{t('home.step3Desc')}</p>
                <div className="mt-6 font-label text-[10px] tracking-[0.2em] text-tertiary/50 uppercase">{t('home.step3Stage')}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Why It Matters */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold mb-8 tracking-tight">{t('home.whyTitle1')} <span className="text-primary italic">{t('home.whyHighlight')}</span> {t('home.whyTitle2')}</h2>
              <div className="space-y-12">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full border border-primary/30 flex items-center justify-center text-primary font-label">01</div>
                  <div>
                    <h4 className="text-xl font-bold font-headline mb-2">{t('home.benefit1Title')}</h4>
                    <p className="text-on-surface-variant font-body leading-relaxed">{t('home.benefit1Desc')}</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full border border-secondary/30 flex items-center justify-center text-secondary font-label">02</div>
                  <div>
                    <h4 className="text-xl font-bold font-headline mb-2">{t('home.benefit2Title')}</h4>
                    <p className="text-on-surface-variant font-body leading-relaxed">{t('home.benefit2Desc')}</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full border border-tertiary/30 flex items-center justify-center text-tertiary font-label">03</div>
                  <div>
                    <h4 className="text-xl font-bold font-headline mb-2">{t('home.benefit3Title')}</h4>
                    <p className="text-on-surface-variant font-body leading-relaxed">{t('home.benefit3Desc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Element - Mock analysis cards */}
            <div className="relative bg-surface-container rounded-2xl p-8 border border-outline-variant/10 shadow-2xl overflow-hidden min-h-[400px]">
              <div className="relative z-10 space-y-4">
                <div className="p-4 bg-surface-container-highest/80 backdrop-blur-md rounded-lg border-l-4 border-primary shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-label text-[10px] text-primary uppercase tracking-widest">{t('home.mockLabel1')}</span>
                  </div>
                  <div className="h-2 w-3/4 bg-primary/20 rounded mb-2"></div>
                  <div className="h-2 w-1/2 bg-primary/20 rounded"></div>
                </div>
                <div className="p-4 bg-surface-container-highest/80 backdrop-blur-md rounded-lg border-l-4 border-secondary shadow-lg ml-8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
                    <span className="font-label text-[10px] text-secondary uppercase tracking-widest">{t('home.mockLabel2')}</span>
                  </div>
                  <div className="h-2 w-5/6 bg-secondary/20 rounded mb-2"></div>
                  <div className="h-2 w-2/3 bg-secondary/20 rounded"></div>
                </div>
                <div className="p-4 bg-surface-container-highest/80 backdrop-blur-md rounded-lg border-l-4 border-tertiary shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    <span className="font-label text-[10px] text-tertiary uppercase tracking-widest">{t('home.mockLabel3')}</span>
                  </div>
                  <div className="text-2xl font-headline font-black text-on-surface tracking-tighter">{t('home.mockScore')}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 px-6 bg-surface-dim border-y border-outline-variant/10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-headline font-bold mb-8">{t('home.ctaTitle1')} <span className="text-secondary">{t('home.ctaHighlight')}</span></h2>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button
                onClick={scrollToForm}
                className="bg-gradient-to-r from-primary to-primary-dim text-on-primary-fixed px-8 md:px-12 py-4 md:py-5 rounded-lg font-headline font-bold text-base md:text-xl active:scale-95 transition-all shadow-xl shadow-primary/10 w-full md:w-auto"
              >
                {t('home.ctaStart')}
              </button>
              <a
                href="/how-it-works"
                className="bg-surface-container-highest text-on-surface px-8 md:px-12 py-4 md:py-5 rounded-lg font-headline font-bold text-base md:text-xl active:scale-95 transition-all border border-outline-variant/30 hover:bg-surface-bright inline-flex items-center justify-center w-full md:w-auto"
              >
                {t('home.ctaLearnMore')}
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0b0e14] w-full py-12 border-t border-[#45484f]/15">
        <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-2 md:flex md:flex-row md:justify-between items-center gap-4 md:gap-6">
          <div className="text-lg font-bold text-[#81ecff] font-headline">AI-Score</div>
          <div className="font-body text-sm text-[#ecedf6]/60">© 2025 AIScore. {t('home.footerTagline')}</div>
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
