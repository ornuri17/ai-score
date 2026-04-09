import { useSearchParams, Link } from 'react-router-dom';
import type { CompareResult, ScoreResult } from '../services/api';
import DimensionBar from '../components/DimensionBar';
import IssueList from '../components/IssueList';
import LeadForm from '../components/LeadForm';

const DIMENSION_MAX: Record<keyof ScoreResult['dimensions'], number> = {
  crawlability: 30,
  content: 31,
  technical: 25,
  quality: 10,
};

const DIMENSION_LABELS: Record<keyof ScoreResult['dimensions'], string> = {
  crawlability: 'Schema Markup',
  content: 'Content Structure',
  technical: 'Technical SEO',
  quality: 'Accessibility',
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface SiteColumnProps {
  result: ScoreResult;
  label: string;
  isWinner: boolean;
  isTie: boolean;
}

function SiteColumn({ result, label, isWinner, isTie }: SiteColumnProps) {
  const borderColor = isWinner ? 'border-[#81ecff]' : isTie ? 'border-[#a68cff]' : 'border-[#45484f]/20';
  const ringStyle = isWinner ? { boxShadow: '0 0 0 2px rgba(129,236,255,0.2)' } : isTie ? { boxShadow: '0 0 0 1px rgba(166,140,255,0.2)' } : {};

  return (
    <div className={`bg-[#10131a] rounded-2xl border-2 ${borderColor} p-5 flex flex-col gap-5`} style={ringStyle}>
      <div>
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className="text-xs font-label uppercase tracking-wide text-[#a9abb3]">{label}</span>
          {isWinner && !isTie && (
            <span className="text-xs font-label font-bold bg-[#81ecff]/20 text-[#81ecff] px-2.5 py-0.5 rounded-full shrink-0">
              Winner 🏆
            </span>
          )}
        </div>
        <p className="font-headline font-bold text-[#ecedf6] text-sm truncate" title={result.url}>
          {result.domain}
        </p>
        <p className="text-xs text-[#73757d] truncate">{result.url}</p>
        <p className="text-xs text-[#73757d] mt-1">Analyzed: {formatDate(result.checkedAt)}</p>
      </div>

      {/* Score circle */}
      <div className="flex justify-center">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1c2028" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={isWinner ? '#81ecff' : isTie ? '#a68cff' : '#45484f'}
              strokeWidth="8"
              strokeDasharray={`${(result.score / 100) * 263.9} 263.9`}
              strokeLinecap="round"
            />
          </svg>
          <div className="text-center z-10">
            <span className="font-headline text-3xl font-black block leading-none">{result.score}</span>
            <span className="font-label text-[#a9abb3] text-[10px]">/ 100</span>
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div>
        <h3 className="text-xs font-label uppercase tracking-wide text-[#a9abb3] mb-3">Breakdown</h3>
        <div className="space-y-3">
          {(Object.keys(result.dimensions) as Array<keyof ScoreResult['dimensions']>).map((key) => (
            <DimensionBar
              key={String(key)}
              label={DIMENSION_LABELS[key]}
              score={result.dimensions[key]}
              maxScore={DIMENSION_MAX[key]}
            />
          ))}
        </div>
      </div>

      {/* Issues */}
      <div>
        <h3 className="text-xs font-label uppercase tracking-wide text-[#a9abb3] mb-3">
          Issues ({result.issues.length})
        </h3>
        <IssueList issues={result.issues} />
      </div>
    </div>
  );
}

function ErrorState({ title, desc, linkLabel }: { title: string; desc: string; linkLabel: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-headline font-bold text-[#ecedf6] mb-3">{title}</h1>
        <p className="text-[#a9abb3] mb-6">{desc}</p>
        <Link to="/" className="inline-block bg-gradient-to-r from-[#81ecff] to-[#00d4ec] text-[#003840] font-bold px-6 py-3 rounded-xl transition-all active:scale-95">
          {linkLabel}
        </Link>
      </div>
    </div>
  );
}

export default function CompareResults() {
  const [searchParams] = useSearchParams();
  const myCheckId = searchParams.get('myCheckId');
  const competitorCheckId = searchParams.get('competitorCheckId');

  if (!myCheckId || !competitorCheckId) {
    return <ErrorState title="No comparison found" desc="No comparison IDs were provided." linkLabel="Run a Comparison →" />;
  }

  const raw = sessionStorage.getItem(`aiscore_compare_${myCheckId}_${competitorCheckId}`);
  if (!raw) {
    return <ErrorState title="Session expired" desc="Your comparison results are no longer in memory. Please run a new comparison." linkLabel="Compare Again →" />;
  }

  let compare: CompareResult;
  try {
    compare = JSON.parse(raw) as CompareResult;
  } catch {
    return <ErrorState title="Failed to load results" desc="Something went wrong." linkLabel="Go home" />;
  }

  const { myUrl: myResult, competitorUrl: compResult, winner, delta } = compare;
  const isTie = winner === 'tie';
  const myWins = winner === 'my';
  const compWins = winner === 'competitor';

  const bannerIcon = isTie ? '🤝' : myWins ? '🎉' : '😬';
  const bannerTitle = isTie
    ? "It's a tie!"
    : myWins
    ? `Your site wins! (+${Math.abs(delta)} points)`
    : `Competitor wins (-${Math.abs(delta)} points)`;
  const bannerSubtitle = isTie
    ? 'Both sites scored the same. Every point counts. Small improvements matter.'
    : myWins
    ? `${myResult.domain} scores higher in AI readiness. Keep optimizing to widen the gap.`
    : `${compResult.domain} outranks you on AI readiness. Use the action plan below to close the gap.`;

  const bannerBg = isTie ? 'bg-[#a68cff]/10 border-[#a68cff]/20' : myWins ? 'bg-[#81ecff]/10 border-[#81ecff]/20' : 'bg-[#ff6e84]/10 border-[#ff6e84]/20';
  const bannerTitleColor = isTie ? 'text-[#a68cff]' : myWins ? 'text-[#81ecff]' : 'text-[#ff6e84]';

  const myUniqueIssues = myResult.issues.filter((i: string) => !compResult.issues.includes(i));
  const compUniqueIssues = compResult.issues.filter((i: string) => !myResult.issues.includes(i));

  return (
    <main className="min-h-screen py-28 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-headline font-extrabold text-[#ecedf6] mb-2">
            AI Readiness Comparison
          </h1>
          <p className="text-[#a9abb3]">
            {myResult.domain} <span className="text-[#45484f] mx-2">vs</span> {compResult.domain}
          </p>
        </div>

        {/* Winner banner */}
        <div className={`border rounded-2xl p-5 sm:p-6 flex items-start sm:items-center gap-4 ${bannerBg}`}>
          <span className="text-4xl flex-shrink-0">{bannerIcon}</span>
          <div>
            <h2 className={`text-lg sm:text-xl font-headline font-bold mb-1 ${bannerTitleColor}`}>{bannerTitle}</h2>
            <p className="text-sm text-[#a9abb3]">{bannerSubtitle}</p>
          </div>
        </div>

        {/* Side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SiteColumn result={myResult} label="Your Site" isWinner={myWins} isTie={isTie} />
          <SiteColumn result={compResult} label="Competitor" isWinner={compWins} isTie={isTie} />
        </div>

        {/* Unique issues */}
        {(myUniqueIssues.length > 0 || compUniqueIssues.length > 0) && (
          <div className="bg-[#10131a] rounded-2xl border border-[#45484f]/15 p-6">
            <h2 className="text-base font-headline font-bold text-[#ecedf6] mb-5">Issues Unique to Each Site</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-label text-[#a9abb3] mb-3 flex items-center gap-2">
                  <span className={myWins ? 'text-[#81ecff]' : 'text-[#ff6e84]'}>{myResult.domain}</span>
                  <span className="text-[#73757d] text-xs">({myUniqueIssues.length} unique)</span>
                </h3>
                {myUniqueIssues.length > 0 ? <IssueList issues={myUniqueIssues} /> : <p className="text-sm text-[#a9abb3] italic">No unique issues. Nice!</p>}
              </div>
              <div>
                <h3 className="text-sm font-label text-[#a9abb3] mb-3 flex items-center gap-2">
                  <span className={compWins ? 'text-[#81ecff]' : 'text-[#ff6e84]'}>{compResult.domain}</span>
                  <span className="text-[#73757d] text-xs">({compUniqueIssues.length} unique)</span>
                </h3>
                {compUniqueIssues.length > 0 ? <IssueList issues={compUniqueIssues} /> : <p className="text-sm text-[#a9abb3] italic">No unique issues.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Summaries */}
        <div className="bg-[#10131a] rounded-2xl border border-[#45484f]/15 p-6">
          <h2 className="text-base font-headline font-bold text-[#ecedf6] mb-4">Analysis Summaries</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#161a21] rounded-xl border border-[#45484f]/10">
              <p className="text-xs font-label text-[#a9abb3] uppercase tracking-wide mb-1.5">{myResult.domain}</p>
              <p className="text-sm text-[#ecedf6]/80 leading-relaxed">{myResult.summary}</p>
            </div>
            <div className="p-4 bg-[#161a21] rounded-xl border border-[#45484f]/10">
              <p className="text-xs font-label text-[#a9abb3] uppercase tracking-wide mb-1.5">{compResult.domain}</p>
              <p className="text-sm text-[#ecedf6]/80 leading-relaxed">{compResult.summary}</p>
            </div>
          </div>
        </div>

        {/* Lead form */}
        <LeadForm checkId={myResult.checkId} myUrl={myResult.url} competitorUrl={compResult.url} />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pb-6">
          <Link
            to="/"
            className="flex-1 text-center py-3 px-5 border border-[#45484f]/30 text-[#ecedf6] font-label font-medium rounded-xl hover:bg-[#1c2028] transition-colors text-sm"
          >
            ← Run Another Comparison
          </Link>
          <Link
            to={`/results?checkId=${myResult.checkId}`}
            className="flex-1 text-center py-3 px-5 bg-gradient-to-r from-[#81ecff] to-[#00d4ec] text-[#003840] font-headline font-bold rounded-xl transition-all active:scale-95 text-sm"
          >
            View My Full Report →
          </Link>
        </div>
      </div>
    </main>
  );
}
