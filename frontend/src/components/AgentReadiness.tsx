import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentCheck, Evidence } from '../services/api';
import CopyButton from './CopyButton';

function EvidenceBlock({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();
  const requestLine = [
    `GET ${evidence.request.url}`,
    ...Object.entries(evidence.request.headers ?? {}).map(([k, v]) => `${k}: ${v}`),
  ].join('\n');
  const responseLine = evidence.response
    ? [
        `HTTP ${evidence.response.status}`,
        ...Object.entries(evidence.response.headers).map(([k, v]) => `${k}: ${v}`),
        evidence.response.bodyPreview ? `\n${evidence.response.bodyPreview}` : '',
      ].join('\n')
    : '';
  return (
    <div dir="ltr" className="space-y-2 text-left">
      <div>
        <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{t('agent.request')}</div>
        <pre className="mt-1 overflow-auto whitespace-pre-wrap rounded bg-[#0b0e14] p-2 font-mono text-xs text-[#a9abb3]">{requestLine}</pre>
      </div>
      {evidence.response && (
        <div>
          <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{t('agent.response')}</div>
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-[#0b0e14] p-2 font-mono text-xs text-[#a9abb3]">{responseLine}</pre>
        </div>
      )}
      {evidence.error && (
        <p className="font-mono text-xs text-[#ff6e84]">
          {t('agent.error')}: {evidence.error}
        </p>
      )}
      {evidence.note && (
        <p className="font-mono text-xs text-on-surface-variant">
          {t('agent.note')}: {evidence.note}
        </p>
      )}
    </div>
  );
}

function CheckRow({ check }: { check: AgentCheck }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const state = check.passed ? 'passed' : check.points > 0 ? 'partial' : 'failed';
  const styles = {
    passed: { icon: 'check_circle', color: 'text-[#81ecff]', badge: 'bg-[#81ecff]/15 text-[#81ecff]' },
    partial: { icon: 'error', color: 'text-[#a68cff]', badge: 'bg-[#a68cff]/15 text-[#a68cff]' },
    failed: { icon: 'cancel', color: 'text-[#ff6e84]', badge: 'bg-[#ff6e84]/15 text-[#ff6e84]' },
  }[state];

  return (
    <li className="rounded-lg border border-outline-variant/15 bg-surface-container p-4">
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined ${styles.color} text-xl`} style={{ fontVariationSettings: "'FILL' 1" }}>
          {styles.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-headline text-sm font-semibold text-on-surface">
              {t(`agent.checks.${check.id}.title`, { defaultValue: check.title })}
            </span>
            <span className={`rounded-full px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}>
              {t(`agent.${state}`)}
            </span>
            <span className="font-label text-xs text-on-surface-variant">
              {t('agent.points', { points: check.points, max: check.maxPoints })}
            </span>
          </div>
          <p className="mt-1 font-body text-xs text-on-surface-variant">{t(`agent.checks.${check.id}.desc`, { defaultValue: '' })}</p>
          <p dir="ltr" className="mt-1 text-left font-mono text-xs text-on-surface/80">
            {check.detail}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {check.fixPrompt && (
              <CopyButton text={check.fixPrompt} label={t('agent.copyPrompt')} copiedLabel={t('agent.copied')} />
            )}
            {check.evidence.length > 0 && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="font-label text-xs text-on-surface-variant underline underline-offset-2 hover:text-on-surface"
              >
                {open ? t('agent.hideEvidence') : t('agent.showEvidence')}
              </button>
            )}
            <a
              href={check.specUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-label text-xs text-on-surface-variant underline underline-offset-2 hover:text-on-surface"
            >
              {t('agent.spec')}
            </a>
          </div>
          {open && (
            <div className="mt-3 space-y-4">
              {check.evidence.map((ev, i) => (
                <EvidenceBlock key={`${ev.request.url}-${i}`} evidence={ev} />
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export default function AgentReadiness({ checks, score, max }: { checks: AgentCheck[]; score: number; max: number }) {
  const { t } = useTranslation();
  if (checks.length === 0) return null;
  // Failed first, then partial, then passed
  const order = (c: AgentCheck): number => (c.passed ? 2 : c.points > 0 ? 1 : 0);
  const sorted = [...checks].sort((a, b) => order(a) - order(b) || b.maxPoints - a.maxPoints);

  return (
    <div className="mb-16 bg-surface-container-low rounded-xl border border-outline-variant/15 p-5 md:p-8">
      <span className="font-label text-[10px] tracking-widest uppercase text-on-surface-variant">{t('agent.sectionLabel')}</span>
      <div className="mt-2 mb-2 flex flex-wrap items-end justify-between gap-4">
        <h3 className="font-headline text-2xl font-bold">{t('agent.heading')}</h3>
        <span className="font-headline text-2xl font-bold text-[#a68cff]">
          {score}
          <span className="text-sm text-on-surface-variant"> / {max}</span>
        </span>
      </div>
      <p className="mb-6 font-body text-sm text-on-surface-variant">{t('agent.intro')}</p>
      <ul className="space-y-3">
        {sorted.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </ul>
    </div>
  );
}
