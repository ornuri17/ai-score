import { useState } from 'react';

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for browsers without the async clipboard API
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  document.body.removeChild(area);
}

interface CopyButtonProps {
  text: string;
  label: string;
  copiedLabel: string;
  className?: string;
}

export default function CopyButton({ text, label, copiedLabel, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        copyText(text)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => setCopied(false));
      }}
      className={
        className ??
        'inline-flex items-center gap-1.5 rounded-lg border border-[#81ecff]/30 bg-[#81ecff]/10 px-3 py-1.5 font-label text-xs font-semibold text-[#81ecff] hover:bg-[#81ecff]/20 transition-colors'
      }
    >
      <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
      {copied ? copiedLabel : label}
    </button>
  );
}
