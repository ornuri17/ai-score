import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import ScoreCard from '../components/ScoreCard';
import DimensionBreakdown from '../components/DimensionBreakdown';
import LeadForm from '../components/LeadForm';
import SocialShare from '../components/SocialShare';
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
      <>
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-slate-50">
          <div className="text-slate-600 text-lg">{t('results.loading')}</div>
        </div>
      </>
    );
  }

  if (error || !result) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-slate-50">
          <div className="text-red-600 text-lg">{error || t('results.error')}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <ScoreCard score={result.score} />
          <DimensionBreakdown dimensions={result.dimensions} />

          {/* Lead form — before issues/timestamp */}
          <LeadForm checkId={result.check_id || checkId} />

          {/* Issues */}
          {result.issues.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">{t('results.issues')}</h3>
              <ul className="space-y-2">
                {result.issues.map((issue) => (
                  <li key={issue} className="text-slate-700">
                    • {issue.replace(/_/g, ' ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-sm text-slate-500 mb-4">
            {t('results.lastAnalyzed')}: {new Date(result.checked_at).toLocaleString()}
          </div>

          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors mb-6"
          >
            {t('results.analyzeAgain')}
          </button>

          <SocialShare score={result.score} domain={domain || ''} />
        </div>
      </div>
    </>
  );
}
