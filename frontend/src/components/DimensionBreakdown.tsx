import { useTranslation } from 'react-i18next';

interface Dimensions {
  crawlability: number;
  content: number;
  technical: number;
  quality: number;
}

interface Bar {
  key: keyof Dimensions;
  labelKey: string;
  max: number;
  color: string;
}

const BARS: Bar[] = [
  { key: 'crawlability', labelKey: 'results.crawlability', max: 30, color: 'bg-blue-600' },
  { key: 'content',      labelKey: 'results.content',      max: 35, color: 'bg-green-600' },
  { key: 'technical',    labelKey: 'results.technical',    max: 25, color: 'bg-purple-600' },
  { key: 'quality',      labelKey: 'results.quality',      max: 10, color: 'bg-orange-500' },
];

export default function DimensionBreakdown({ dimensions }: { dimensions: Dimensions }) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-xl font-bold mb-6">{t('results.breakdown')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {BARS.map(({ key, labelKey, max, color }) => (
          <div key={key}>
            <div className="flex justify-between mb-2">
              <span className="text-slate-700">{t(labelKey)}</span>
              <span className="font-bold text-slate-900">{dimensions[key]}/{max}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`${color} h-2 rounded-full transition-all duration-500`}
                style={{ width: `${(dimensions[key] / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
