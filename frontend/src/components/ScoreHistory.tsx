import { useTranslation } from 'react-i18next';
import type { HistoryPoint } from '../services/api';

interface Props {
  history: HistoryPoint[];
  domain: string;
}

export default function ScoreHistory({ history, domain }: Props) {
  const { t } = useTranslation();

  if (history.length < 2) return null;

  // Chart dimensions
  const W = 600;
  const H = 120;
  const PAD = { top: 12, right: 16, bottom: 28, left: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Map score (0-100) to Y coordinate
  const toY = (score: number) =>
    PAD.top + chartH - (score / 100) * chartH;

  // Map index to X coordinate
  const toX = (i: number) =>
    PAD.left + (i / (history.length - 1)) * chartW;

  // Build polyline points
  const points = history.map((p, i) => `${toX(i)},${toY(p.score)}`).join(' ');

  // Build filled area path (close below the line)
  const areaPath = [
    `M ${toX(0)},${toY(history[0].score)}`,
    ...history.slice(1).map((p, i) => `L ${toX(i + 1)},${toY(p.score)}`),
    `L ${toX(history.length - 1)},${PAD.top + chartH}`,
    `L ${toX(0)},${PAD.top + chartH}`,
    'Z',
  ].join(' ');

  const latest = history[history.length - 1].score;
  const earliest = history[0].score;
  const delta = latest - earliest;
  const deltaColor = delta > 0 ? '#81ecff' : delta < 0 ? '#ff6c95' : '#a9abb3';
  const deltaLabel = delta > 0 ? `+${delta}` : `${delta}`;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-surface-container-low rounded-xl border border-outline-variant/15 p-8 mb-16">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <span className="font-label text-[10px] tracking-widest uppercase text-on-surface-variant">
            {t('results.scoreHistory')}
          </span>
          <h3 className="font-headline text-xl font-bold text-on-surface mt-1">
            {domain}
          </h3>
        </div>
        <div className="text-right">
          <div className="font-headline text-3xl font-black text-on-surface">{latest}</div>
          <div className="font-label text-xs mt-0.5" style={{ color: deltaColor }}>
            {delta !== 0 && `${deltaLabel} from first scan`}
            {delta === 0 && 'No change'}
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: '120px' }}
        aria-label={`Score history for ${domain}`}
      >
        {/* Grid lines at 25, 50, 75 */}
        {[25, 50, 75].map((val) => (
          <g key={val}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={toY(val)}
              y2={toY(val)}
              stroke="#45484f"
              strokeWidth="0.5"
              strokeDasharray="3 3"
              opacity="0.4"
            />
            <text
              x={PAD.left - 6}
              y={toY(val) + 4}
              fill="#a9abb3"
              fontSize="9"
              textAnchor="end"
              fontFamily="Space Grotesk, sans-serif"
            >
              {val}
            </text>
          </g>
        ))}

        {/* Filled area */}
        <defs>
          <linearGradient id="historyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#81ecff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#81ecff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#historyGrad)" />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#81ecff"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {history.map((p, i) => (
          <g key={p.check_id}>
            <circle
              cx={toX(i)}
              cy={toY(p.score)}
              r="3.5"
              fill="#0b0e14"
              stroke="#81ecff"
              strokeWidth="2"
            />
            {/* Date label on first and last */}
            {(i === 0 || i === history.length - 1) && (
              <text
                x={toX(i)}
                y={H - 4}
                fill="#a9abb3"
                fontSize="9"
                textAnchor={i === 0 ? 'start' : 'end'}
                fontFamily="Space Grotesk, sans-serif"
              >
                {formatDate(p.checked_at)}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Summary row */}
      <div className="flex gap-6 mt-4 pt-4 border-t border-outline-variant/10">
        <div>
          <span className="font-label text-[10px] tracking-widest uppercase text-on-surface-variant">Scans</span>
          <div className="font-headline font-bold text-on-surface">{history.length}</div>
        </div>
        <div>
          <span className="font-label text-[10px] tracking-widest uppercase text-on-surface-variant">Best</span>
          <div className="font-headline font-bold text-[#81ecff]">{Math.max(...history.map(p => p.score))}</div>
        </div>
        <div>
          <span className="font-label text-[10px] tracking-widest uppercase text-on-surface-variant">First scan</span>
          <div className="font-headline font-bold text-on-surface">{formatDate(history[0].checked_at)}</div>
        </div>
      </div>
    </div>
  );
}
