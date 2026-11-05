import { useTranslation } from 'react-i18next';
import type { Dimensions } from '../services/api';

// Maxima before the agent readiness rebalance; used only when the API does not send maxDimensions
const LEGACY_MAX: Record<keyof Dimensions, number> = {
  crawlability: 30,
  content: 35,
  technical: 25,
  quality: 10,
  agentReadiness: 0,
};

interface Bar {
  key: keyof Dimensions;
  label: string;
  max: number;
  icon: string;
  textColor: string;
  barColor: string;
}

const BARS: Bar[] = [
  {
    key: 'crawlability',
    label: 'results.crawlability',
    max: 30,
    icon: 'account_tree',
    textColor: 'text-primary',
    barColor: 'bg-primary',
  },
  {
    key: 'content',
    label: 'results.content',
    max: 35,
    icon: 'segment',
    textColor: 'text-secondary',
    barColor: 'bg-secondary',
  },
  {
    key: 'technical',
    label: 'results.technical',
    max: 25,
    icon: 'memory',
    textColor: 'text-[#00d4ec]',
    barColor: 'bg-[#00d4ec]',
  },
  {
    key: 'quality',
    label: 'results.quality',
    max: 10,
    icon: 'auto_awesome',
    textColor: 'text-tertiary',
    barColor: 'bg-tertiary',
  },
  {
    key: 'agentReadiness',
    label: 'results.agentReadiness',
    max: 25,
    icon: 'smart_toy',
    textColor: 'text-[#a68cff]',
    barColor: 'bg-[#a68cff]',
  },
];

export default function DimensionBreakdown({
  dimensions,
  maxDimensions,
}: {
  dimensions: Dimensions;
  maxDimensions?: Required<Dimensions>;
}) {
  const { t } = useTranslation();
  const bars = BARS.map((bar) => ({ ...bar, max: maxDimensions ? maxDimensions[bar.key] : LEGACY_MAX[bar.key] })).filter(
    (bar) => bar.max > 0,
  );

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${bars.length > 4 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4 mb-16`}>
      {bars.map(({ key, label, max, icon, textColor, barColor }) => (
        <div
          key={key}
          className="bg-surface-container-low p-5 md:p-8 rounded-xl border border-outline-variant/15 flex flex-col gap-4"
        >
          <span className={`material-symbols-outlined ${textColor} text-3xl`}>{icon}</span>
          <div>
            <h3 className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">
              {t(label)}
            </h3>
            <div className="flex items-end gap-2">
              <span className="font-headline text-3xl font-bold">{dimensions[key] ?? 0}</span>
              <span className={`${textColor} text-sm font-bold pb-1`}>/ {max} pts</span>
            </div>
          </div>
          <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
            <div
              className={`${barColor} h-full`}
              style={{ width: `${((dimensions[key] ?? 0) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
