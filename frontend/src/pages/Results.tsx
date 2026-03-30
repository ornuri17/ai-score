import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ScoreCard from '../components/ScoreCard';
import DimensionBreakdown from '../components/DimensionBreakdown';
import LeadForm from '../components/LeadForm';
import SocialShare from '../components/SocialShare';
import NavBar from '../components/NavBar';
import { analyzeWebsite } from '../services/api';
import type { AnalyzeResponse } from '../services/api';

export default function Results() {
  const { t } = useTranslation();
  const { domain } = useParams<{ domain: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const checkId = searchParams.get('checkId') || '';

  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!domain) return;

    analyzeWebsite(`https://${domain}`)
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch(() => {
        setError(t('results.error'));
        setLoading(false);
      });
  }, [domain, t]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <NavBar />

        <main className="flex-grow pt-24 pb-12 px-6 bg-mesh relative overflow-hidden min-h-screen">
          {/* Abstract Background */}
          <div className="absolute top-1/4 -right-20 w-96 h-96 bg-secondary/5 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
            {/* Central Neural Engine Representation */}
            <div className="relative mb-16">
              {/* Outer Pulse Rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border border-primary/10 rounded-full animate-ping opacity-20"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-80 h-80 border border-secondary/5 rounded-full animate-pulse opacity-10"></div>
              </div>
              {/* The Core Orb */}
              <div className="relative z-10 w-48 h-48 rounded-full bg-surface-container-highest flex items-center justify-center orb-glow border border-outline-variant/20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20"></div>
                <div className="text-center z-20">
                  <span
                    className="material-symbols-outlined text-5xl text-primary animate-pulse"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    psychology
                  </span>
                  <div className="font-label text-[10px] tracking-[0.2em] uppercase text-on-surface-variant mt-2">{t('results.activeNode')}</div>
                </div>
                {/* Scan Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent blur-[2px] opacity-50 animate-bounce"></div>
              </div>
            </div>

            {/* Status Cluster */}
            <div className="w-full max-w-2xl text-center space-y-8">
              <div>
                <h1 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
                  {t('results.loadingTitle')} {domain}
                </h1>
                <p className="font-body text-on-surface-variant max-w-lg mx-auto leading-relaxed">
                  {t('results.loadingDesc')}
                </p>
              </div>

              {/* Bento Progress Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                {/* Progress Card */}
                <div className="md:col-span-2 bg-surface-container-low p-6 rounded-xl border border-outline-variant/10 shadow-xl">
                  <div className="flex justify-between items-end mb-4">
                    <div className="space-y-1">
                      <span className="font-label text-xs text-primary font-bold tracking-widest">{t('results.systemStatus').toUpperCase()}</span>
                      <div className="text-lg font-headline font-bold">{t('results.comprehensiveScan')}</div>
                    </div>
                  </div>
                  {/* Animated progress bar */}
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary rounded-full animate-pulse"
                      style={{ width: '60%' }}
                    ></div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <span
                        className="material-symbols-outlined text-primary text-lg"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                      <span className="font-body text-on-surface">{t('results.scanRobots')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span
                        className="material-symbols-outlined text-primary text-lg"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                      <span className="font-body text-on-surface">{t('results.analyzeJsonLd')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span
                        className="material-symbols-outlined text-primary/40 text-lg animate-pulse"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        radio_button_checked
                      </span>
                      <span className="font-body text-on-surface">{t('results.evaluateHtml')}</span>
                    </div>
                  </div>
                </div>
                {/* Metrics Sidebar */}
                <div className="flex flex-col gap-4">
                  <div className="bg-surface-container p-5 rounded-xl border border-outline-variant/10">
                    <div className="font-label text-[10px] text-on-surface-variant tracking-widest uppercase mb-1">{t('results.computeLoad')}</div>
                    <div className="text-xl font-headline font-bold text-secondary">{t('results.computeLoadValue')}</div>
                  </div>
                  <div className="bg-surface-container p-5 rounded-xl border border-outline-variant/10 flex-grow">
                    <div className="font-label text-[10px] text-on-surface-variant tracking-widest uppercase mb-1">{t('results.currentUrl')}</div>
                    <div className="text-sm font-label truncate text-on-surface/80">{domain}</div>
                  </div>
                </div>
              </div>

              {/* Footer Console */}
              <div className="bg-surface-container-lowest/50 p-4 rounded-lg font-label text-[11px] text-on-surface-variant flex justify-between items-center border border-outline-variant/5">
                <div className="flex gap-4">
                  <span>ANALYZING: {domain}</span>
                  <span className="text-primary/50">PARSING_BUFFER: OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  <span>{t('results.realtimeStream')}</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-surface-dim flex flex-col items-center justify-center gap-6">
        <span className="material-symbols-outlined text-6xl text-tertiary">error</span>
        <p className="font-headline text-2xl font-bold text-on-surface">{error || t('results.error')}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-gradient-to-r from-primary to-primary-dim text-on-primary-fixed px-8 py-3 rounded-lg font-headline font-bold"
        >
          {t('results.analyzeAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />

      <main className="pt-24 pb-16 px-6 md:px-8 max-w-7xl mx-auto">
        {/* Hero Section with Score */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-center">
          <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left">
            <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tighter mb-4">
              {t('results.analysisTitle1')} <span className="gradient-text">{t('results.analysisTitle2')}</span>
            </h1>
            <p className="text-on-surface-variant text-lg max-w-md mb-8">
              {t('results.analysisCompleteDesc', { domain })}
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary-container/20 rounded-full border border-secondary/20">
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
                <span className="font-label text-xs uppercase tracking-widest text-secondary font-bold">{t('results.analysisCompleteLabel')}</span>
              </div>
            </div>
            <div className="mt-4 text-sm text-on-surface-variant font-body">
              {t('results.lastAnalyzed')}: {new Date(result.checked_at).toLocaleString()}
            </div>
          </div>
          <div className="lg:col-span-7 flex justify-center">
            <ScoreCard score={result.score} />
          </div>
        </div>

        {/* DimensionBreakdown */}
        <div className="mb-16">
          <DimensionBreakdown dimensions={result.dimensions} />
        </div>

        {/* Issues section */}
        {result.issues.length > 0 && (
          <div className="mb-16 bg-surface-container-low rounded-xl border border-outline-variant/15 p-8">
            <span className="font-label text-[10px] tracking-widest uppercase text-on-surface-variant">{t('results.issuesDetected').toUpperCase()}</span>
            <h3 className="font-headline text-2xl font-bold mt-2 mb-6">{t('results.issues')}</h3>
            <ul className="space-y-3">
              {result.issues.map((issue) => (
                <li key={issue} className="flex items-start gap-3">
                  <span
                    className="material-symbols-outlined text-tertiary text-lg"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    warning
                  </span>
                  <span className="font-body text-on-surface-variant text-sm">{issue.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* LeadForm */}
        <div className="mb-16">
          <LeadForm checkId={result.check_id || checkId} />
        </div>

        {/* SocialShare */}
        <SocialShare score={result.score} domain={domain || ''} />
      </main>

      <footer className="bg-[#0b0e14] w-full py-12 border-t border-[#45484f]/15">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-lg font-bold text-[#81ecff] font-headline">AI-Score</div>
          <div className="font-body text-sm text-[#ecedf6]/60">© 2025 AIScore.</div>
          <div className="flex gap-6">
            <a className="text-[#ecedf6]/50 hover:text-[#a68cff] transition-colors font-body text-sm" href="/privacy">Privacy</a>
            <a className="text-[#ecedf6]/50 hover:text-[#a68cff] transition-colors font-body text-sm" href="/terms">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
