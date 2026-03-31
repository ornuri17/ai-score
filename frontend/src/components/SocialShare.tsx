import { useTranslation } from 'react-i18next';

interface Props {
  score: number;
  domain: string;
}

export default function SocialShare({ score, domain }: Props) {
  useTranslation();
  const shareText = `${domain} scores ${score}/100 on AI-friendliness. Check yours at AIScore!`;
  const shareUrl = window.location.href;

  return (
    <div className="bg-[#1c2028] rounded-2xl p-6">
      <div className="font-label text-xs tracking-widest text-[#a68cff] uppercase mb-4">
        Share Your Score
      </div>
      <div className="flex flex-wrap gap-3">
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noreferrer"
          className="border border-[#45484f]/20 text-[#a9abb3] hover:text-[#81ecff] hover:border-[#81ecff]/30 rounded-lg px-4 py-2 text-sm transition-colors"
        >
          LinkedIn ↗
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noreferrer"
          className="border border-[#45484f]/20 text-[#a9abb3] hover:text-[#81ecff] hover:border-[#81ecff]/30 rounded-lg px-4 py-2 text-sm transition-colors"
        >
          X (Twitter) ↗
        </a>
      </div>
    </div>
  );
}
