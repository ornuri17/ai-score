import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Fix } from '../services/api';
import CopyButton from './CopyButton';

const TOP = 3;

function FixRow({ fix, title }: { fix: Fix; title: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-lg border border-outline-variant/15 bg-surface-container p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-[#81ecff]/15 px-2.5 py-0.5 font-label text-xs font-bold text-[#81ecff]">
          {t('fixPlan.gain', { points: fix.gain })}
        </span>
        <span className="flex-1 font-body text-sm text-on-surface">{title}</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="font-label text-xs text-on-surface-variant underline underline-offset-2 hover:text-on-surface"
        >
          {open ? t('fixPlan.hidePrompt') : t('fixPlan.showPrompt')}
        </button>
        <CopyButton text={fix.prompt} label={t('agent.copyPrompt')} copiedLabel={t('agent.copied')} />
      </div>
      {open && (
        <pre dir="ltr" className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-[#0b0e14] p-3 text-left font-mono text-xs leading-relaxed text-[#a9abb3]">
          {fix.prompt}
        </pre>
      )}
    </li>
  );
}

export default function FixPlan({ fixes }: { fixes: Fix[] }) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  if (fixes.length === 0) return null;

  const top = fixes.slice(0, TOP);
  const gain = top.reduce((sum, f) => sum + f.gain, 0);
  const shown = showAll ? fixes : top;
  const titleOf = (fix: Fix): string =>
    fix.kind === 'agent'
      ? t(`agent.checks.${fix.id}.title`, { defaultValue: fix.title })
      : t(`fixPlan.titles.${fix.id}`, { defaultValue: fix.title });
  const allPrompts = fixes.map((f, i) => `## ${i + 1}. ${f.title} (+${f.gain} points)\n\n${f.prompt}`).join('\n\n---\n\n');

  return (
    <div className="mb-16 bg-surface-container-low rounded-xl border border-outline-variant/15 p-5 md:p-8">
      <span className="font-label text-[10px] tracking-widest uppercase text-on-surface-variant">{t('fixPlan.label')}</span>
      <div className="mt-2 mb-2 flex flex-wrap items-center justify-between gap-4">
        <h3 className="font-headline text-2xl font-bold">{t('fixPlan.heading', { points: gain })}</h3>
        <CopyButton text={allPrompts} label={t('fixPlan.copyAll')} copiedLabel={t('fixPlan.copiedAll')} />
      </div>
      <p className="mb-1 font-body text-sm text-on-surface-variant">{t('fixPlan.intro')}</p>
      <p className="mb-6 font-body text-xs text-on-surface-variant/70">{t('fixPlan.promptNote')}</p>
      <ol className="space-y-3">
        {shown.map((fix) => (
          <FixRow key={fix.id} fix={fix} title={titleOf(fix)} />
        ))}
      </ol>
      {fixes.length > TOP && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-4 font-label text-sm text-[#81ecff] underline underline-offset-2"
        >
          {t('fixPlan.more', { count: fixes.length })}
        </button>
      )}
    </div>
  );
}
