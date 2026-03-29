import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import { analyzeWebsite } from '../services/api';

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
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-2xl w-full px-6 py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            {t('home.title')}
          </h1>
          <p className="text-lg text-slate-300 mb-8">
            {t('home.subtitle')}
          </p>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <input
              type="url"
              placeholder={t('home.placeholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 disabled:opacity-60"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors min-h-[48px]"
            >
              {loading ? t('home.analyzing') : t('home.button')}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-900/80 text-red-100 rounded-lg border border-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
