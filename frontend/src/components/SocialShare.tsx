import { useTranslation } from 'react-i18next';

interface Props {
  score: number;
  domain: string;
}

export default function SocialShare({ score, domain }: Props) {
  const { t } = useTranslation();
  const shareText = `${domain} scores ${score}/100 on AI-friendliness. Check yours at AIScore!`;
  const shareUrl = window.location.href;

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h3 className="text-lg font-bold mb-4">{t('results.share')}</h3>
      <div className="flex flex-wrap gap-3">
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition-colors font-medium"
        >
          LinkedIn
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors font-medium"
        >
          X (Twitter)
        </a>
      </div>
    </div>
  );
}
