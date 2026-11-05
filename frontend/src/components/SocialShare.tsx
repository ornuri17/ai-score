import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getBadgeUrl, getShareUrl } from '../services/api';

interface Props {
  score: number;
  domain: string;
}

export default function SocialShare({ score, domain }: Props) {
  useTranslation();
  const [copied, setCopied] = useState(false);
  const shareUrl = getShareUrl(domain, score);
  const badgeUrl = getBadgeUrl(domain);
  const verdict = score >= 80 ? 'AI-Optimized' : score >= 50 ? 'needs optimization' : 'has critical AI visibility issues';
  const shareText = encodeURIComponent(
    `${domain} scored ${score}/100 for AI-readiness — ${verdict}.\n\nChatGPT, Claude, and Perplexity ${score >= 80 ? 'can' : 'may not'} find and cite it.\n\nCheck yours →`,
  );
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedShareUrl}`;
  const embedCode = `<a href="https://www.gradebyai.com" target="_blank" rel="noopener">
  <img src="${badgeUrl}" alt="AI-Readiness: ${score}/100 - GradeByAI" height="26"/>
</a>`;

  const copyEmbedCode = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied; nothing to do
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1c2028] rounded-2xl p-6">
        <div className="font-label text-xs tracking-widest text-[#a68cff] uppercase mb-4">Share Your Score</div>
        <p className="text-[#a9abb3] text-sm mb-4">
          {domain} scored <span className="text-[#ecedf6] font-semibold">{score}/100</span> — {verdict}.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={linkedInUrl}
            target="_blank"
            rel="noreferrer"
            className="border border-[#45484f]/20 text-[#a9abb3] hover:text-[#81ecff] hover:border-[#81ecff]/30 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            LinkedIn ↗
          </a>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noreferrer"
            className="border border-[#45484f]/20 text-[#a9abb3] hover:text-[#81ecff] hover:border-[#81ecff]/30 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            X (Twitter) ↗
          </a>
        </div>
      </div>

      <div className="bg-[#1c2028] rounded-2xl p-6">
        <div className="font-label text-xs tracking-widest text-[#a68cff] uppercase mb-3">Embed Badge</div>
        <p className="text-[#a9abb3] text-xs mb-3">Show your AI-readiness score on your site. Paste this HTML anywhere:</p>
        <div className="relative">
          <pre className="bg-[#0b0e14] rounded-lg p-4 text-[#81ecff] text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono">
            {embedCode}
          </pre>
          <button
            onClick={copyEmbedCode}
            className="absolute top-2 right-2 text-[#45484f] hover:text-[#a68cff] transition-colors text-xs font-label"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[#a9abb3] text-xs">Preview:</span>
          <img src={badgeUrl} alt={`AI-Readiness: ${score}/100 - GradeByAI`} height="26" className="h-[26px]" />
        </div>
      </div>
    </div>
  );
}
