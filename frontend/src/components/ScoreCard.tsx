import { useTranslation } from 'react-i18next';

interface Props {
  score: number;
}

export default function ScoreCard({ score }: Props) {
  const { t } = useTranslation();

  const colorClass =
    score >= 80 ? 'text-green-600' :
    score >= 60 ? 'text-yellow-500' :
    'text-red-500';

  return (
    <div className="text-center py-12 bg-white rounded-lg shadow mb-6">
      <div className={`text-8xl font-bold ${colorClass}`}>{score}</div>
      <div className="text-2xl text-slate-700 mt-2">/ 100</div>
      <div className="text-lg text-slate-500 mt-4">{t('results.title')}</div>
    </div>
  );
}
