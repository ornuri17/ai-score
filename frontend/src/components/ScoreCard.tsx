import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  score: number;
}

function getColor(score: number): string {
  if (score >= 90) return 'text-emerald-500';
  if (score >= 70) return 'text-green-500';
  if (score >= 41) return 'text-amber-500';
  return 'text-red-500';
}

function getLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 41) return 'Needs Work';
  return 'Poor';
}

export default function ScoreCard({ score }: Props) {
  const { t } = useTranslation();
  const displayRef = useRef<HTMLDivElement>(null);

  // Animate score counting up from 0
  useEffect(() => {
    const el = displayRef.current;
    if (!el) return;
    const duration = 800;
    const start = performance.now();

    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el!.textContent = String(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [score]);

  const colorClass = getColor(score);

  return (
    <div className="text-center py-12 bg-white rounded-lg shadow mb-6">
      <div className={`text-8xl font-bold tabular-nums ${colorClass}`} ref={displayRef}>
        0
      </div>
      <div className="text-2xl text-slate-700 mt-2">/ 100</div>
      <div className={`text-lg font-semibold mt-2 ${colorClass}`}>{getLabel(score)}</div>
      <div className="text-base text-slate-500 mt-1">{t('results.title')}</div>
    </div>
  );
}
