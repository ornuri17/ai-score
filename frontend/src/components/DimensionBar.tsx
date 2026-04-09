interface DimensionBarProps {
  label: string;
  score: number;
  maxScore: number;
  color?: string;
}

function getBarColor(score: number, maxScore: number): string {
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct < 0.4) return '#ff6e84';
  if (pct < 0.7) return '#a68cff';
  return '#81ecff';
}

export default function DimensionBar({ label, score, maxScore, color }: DimensionBarProps) {
  const pct = maxScore > 0 ? Math.min(100, (score / maxScore) * 100) : 0;
  const barColor = color ?? getBarColor(score, maxScore);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-label text-[#a9abb3]">{label}</span>
        <span className="text-sm font-label font-semibold text-[#ecedf6]">
          {Math.round(score)}{' '}
          <span className="text-[#73757d] font-normal">/ {maxScore}</span>
        </span>
      </div>
      <div className="h-2 bg-[#22262f] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
