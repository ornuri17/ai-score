import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLeaderboard, getStats, type LeaderboardEntry } from '../services/api';
import Header from '../components/Header';

function scoreColor(score: number): string {
  return score >= 80 ? 'text-[#00c06a]' : score >= 50 ? 'text-[#f59e0b]' : 'text-[#ef4444]';
}

function scoreLabel(score: number): string {
  return score >= 80 ? 'AI-Optimized' : score >= 50 ? 'Needs Work' : 'Critical';
}

function scoreBadgeClass(score: number): string {
  return score >= 80
    ? 'bg-[#00c06a]/10 border-[#00c06a]/20'
    : score >= 50
      ? 'bg-[#f59e0b]/10 border-[#f59e0b]/20'
      : 'bg-[#ef4444]/10 border-[#ef4444]/20';
}

const MEDALS = ['🥇', '🥈', '🥉'];

function rankLabel(rank: number) {
  return rank <= 3 ? MEDALS[rank - 1] : rank;
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'GradeByAI', item: 'https://www.gradebyai.com' },
    { '@type': 'ListItem', position: 2, name: 'Leaderboard', item: 'https://www.gradebyai.com/leaderboard' },
  ],
};

export default function Leaderboard() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [totalChecks, setTotalChecks] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getLeaderboard(), getStats()])
      .then(([board, stats]) => {
        setEntries(board.leaderboard);
        setTotalChecks(stats.totalChecks);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load leaderboard. Please try again.');
        setLoading(false);
      });
  }, []);

  const itemListSchema =
    entries.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Top AI-Ready Websites - GradeByAI Leaderboard',
          description: 'The highest-scoring websites for AI-readiness, ranked by GradeByAI.',
          numberOfItems: entries.length,
          itemListElement: entries.map((entry) => ({
            '@type': 'ListItem',
            position: entry.rank,
            name: entry.domain,
            description: `${entry.domain} scored ${entry.score}/100 for AI-readiness on GradeByAI`,
          })),
        }
      : null;

  return (
    <div className="min-h-screen bg-[#0b0e14]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {itemListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}
      <Header />

      {/* Hero */}
      <section className="bg-[#0b0e14] py-24 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-[#a68cff] font-label text-xs tracking-widest mb-4 uppercase">AI Readiness Rankings</p>
          <h1 className="font-display text-5xl font-bold text-[#ecedf6] mb-4">Top AI-Ready Websites</h1>
          <p className="text-[#a9abb3] text-lg">
            The highest-scoring domains for AI-readiness, ranked by how well ChatGPT, Claude, and Perplexity can find
            and cite them.
          </p>
          {totalChecks !== null && (
            <p className="text-[#45484f] text-sm mt-4 font-label">Based on {totalChecks.toLocaleString()} analyses</p>
          )}
        </div>
      </section>

      {/* Rankings */}
      <section className="bg-[#10131a] py-16">
        <div className="max-w-4xl mx-auto px-6">
          {loading && <div className="text-center text-[#a9abb3] py-20 font-label text-sm">Loading leaderboard...</div>}
          {error && <div className="text-center text-[#ef4444] py-20 font-label text-sm">{error}</div>}
          {!loading && !error && entries.length === 0 && (
            <div className="text-center text-[#a9abb3] py-20">
              <p className="font-display text-xl text-[#ecedf6] mb-3">No results yet</p>
              <p className="text-sm mb-6">Be the first — analyze your site to appear on the leaderboard.</p>
              <a
                href="/"
                className="gradient-primary text-[#005762] font-bold rounded-lg py-2 px-6 inline-block no-underline text-sm"
              >
                Analyze My Site
              </a>
            </div>
          )}
          {!loading && entries.length > 0 && (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-[#1c2028]">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#1c2028] border-b border-[#2d3038]">
                      <th className="text-left px-6 py-4 font-label text-xs tracking-widest text-[#a68cff] uppercase w-12">
                        #
                      </th>
                      <th className="text-left px-6 py-4 font-label text-xs tracking-widest text-[#a68cff] uppercase">
                        Domain
                      </th>
                      <th className="text-right px-6 py-4 font-label text-xs tracking-widest text-[#a68cff] uppercase">
                        Score
                      </th>
                      <th className="text-right px-6 py-4 font-label text-xs tracking-widest text-[#a68cff] uppercase hidden lg:table-cell">
                        Status
                      </th>
                      <th className="text-right px-6 py-4 font-label text-xs tracking-widest text-[#a68cff] uppercase hidden lg:table-cell">
                        Checks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr
                        key={entry.domain}
                        className={`border-b border-[#1c2028] hover:bg-[#1c2028]/50 transition-colors ${index === 0 ? 'bg-[#81ecff]/3' : ''}`}
                      >
                        <td className="px-6 py-4 font-display text-sm font-bold text-[#45484f] tabular-nums">
                          {rankLabel(entry.rank)}
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={`/analysis/${encodeURIComponent(entry.domain)}`}
                            className="font-display text-sm font-semibold text-[#ecedf6] hover:text-[#81ecff] transition-colors no-underline"
                          >
                            {entry.domain}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-display text-xl font-bold tabular-nums ${scoreColor(entry.score)}`}>
                            {entry.score}
                          </span>
                          <span className="text-[#45484f] text-xs">/100</span>
                        </td>
                        <td className="px-6 py-4 text-right hidden lg:table-cell">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-label font-bold border ${scoreBadgeClass(entry.score)} ${scoreColor(entry.score)}`}
                          >
                            {scoreLabel(entry.score)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right hidden lg:table-cell text-[#45484f] font-label text-xs tabular-nums">
                          {entry.checks.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden flex flex-col gap-3">
                {entries.map((entry) => (
                  <a
                    key={entry.domain}
                    href={`/analysis/${encodeURIComponent(entry.domain)}`}
                    className="bg-[#1c2028] rounded-xl p-4 flex items-center justify-between no-underline hover:bg-[#252a35] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-display text-sm font-bold text-[#45484f] w-6 tabular-nums">
                        {rankLabel(entry.rank)}
                      </span>
                      <div>
                        <p className="font-display text-sm font-semibold text-[#ecedf6]">{entry.domain}</p>
                        <span className={`inline-flex mt-1 text-xs font-label font-bold ${scoreColor(entry.score)}`}>
                          {scoreLabel(entry.score)}
                        </span>
                      </div>
                    </div>
                    <span className={`font-display text-2xl font-bold tabular-nums ${scoreColor(entry.score)}`}>
                      {entry.score}
                    </span>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0b0e14] py-24 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-4xl font-bold text-[#ecedf6] mb-4">Is your site AI-ready?</h2>
          <p className="text-[#a9abb3] mb-8">Score your website and see where you rank. Free, instant, no account needed.</p>
          <a href="/" className="gradient-primary text-[#005762] font-bold rounded-lg py-3 px-8 inline-block no-underline">
            {t('faqPage.ctaButton')}
          </a>
        </div>
      </section>

      <footer className="bg-[#10131a] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#a9abb3] text-sm">© {new Date().getFullYear()} GradeByAI. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="/privacy" className="text-[#a9abb3] hover:text-[#81ecff] text-sm no-underline transition-colors">
              Privacy
            </a>
            <a href="/terms" className="text-[#a9abb3] hover:text-[#81ecff] text-sm no-underline transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
