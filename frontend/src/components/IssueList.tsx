interface IssueListProps {
  issues: string[];
}

const ISSUE_MAP: Record<string, { label: string; icon: string; severity: 'high' | 'medium' | 'low' }> = {
  blocked_from_crawlers: { label: 'Blocked from AI crawlers (noindex)', icon: '🚫', severity: 'high' },
  ai_crawlers_blocked: { label: 'AI bots blocked in robots.txt (GPTBot, ClaudeBot, PerplexityBot)', icon: '🤖', severity: 'high' },
  not_publicly_accessible: { label: 'Site requires authentication', icon: '🔒', severity: 'high' },
  crawlability_issues: { label: 'No sitemap found', icon: '🗺️', severity: 'medium' },
  structured_data_missing: { label: 'Missing structured data (JSON-LD)', icon: '📋', severity: 'medium' },
  metadata_optimization: { label: 'Missing or invalid meta description/title', icon: '📝', severity: 'medium' },
  mobile_unfriendly: { label: 'Not mobile-friendly (no viewport tag)', icon: '📱', severity: 'medium' },
  no_https: { label: 'Not using HTTPS', icon: '⚠️', severity: 'high' },
  slow_page_load: { label: 'Slow page load (>3s)', icon: '🐢', severity: 'medium' },
  no_internal_links: { label: 'Too few internal links', icon: '🔗', severity: 'low' },
  no_language_tag: { label: 'Missing language attribute', icon: '🌐', severity: 'low' },
  access_or_speed_issues: { label: 'Access or speed issues detected', icon: '⚡', severity: 'medium' },
};

const SEVERITY_STYLES = {
  high: {
    card: 'bg-[#ff6e84]/10 border-[#ff6e84]/20 text-[#ecedf6]',
    badge: 'bg-[#ff6e84]/20 text-[#ff6e84]',
  },
  medium: {
    card: 'bg-[#a68cff]/10 border-[#a68cff]/20 text-[#ecedf6]',
    badge: 'bg-[#a68cff]/20 text-[#a68cff]',
  },
  low: {
    card: 'bg-[#81ecff]/10 border-[#81ecff]/20 text-[#ecedf6]',
    badge: 'bg-[#81ecff]/20 text-[#81ecff]',
  },
};

export default function IssueList({ issues }: IssueListProps) {
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 bg-[#81ecff]/10 border border-[#81ecff]/20 rounded-xl">
        <span className="text-2xl">✅</span>
        <div>
          <p className="font-headline font-semibold text-[#81ecff]">No issues detected</p>
          <p className="text-sm text-[#a9abb3]">Your site looks great for AI crawlers!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {issues.map((issueKey) => {
        const info = ISSUE_MAP[issueKey];
        if (!info) {
          return (
            <div key={issueKey} className="flex items-start gap-3 p-3 bg-[#1c2028] border border-[#45484f]/20 rounded-lg">
              <span className="text-xl mt-0.5">⚠️</span>
              <span className="text-sm text-[#a9abb3]">{issueKey.replace(/_/g, ' ')}</span>
            </div>
          );
        }
        const styles = SEVERITY_STYLES[info.severity];
        return (
          <div key={issueKey} className={`flex items-start gap-3 p-3 border rounded-lg ${styles.card}`}>
            <span className="text-xl mt-0.5 flex-shrink-0">{info.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-label leading-snug">{info.label}</p>
            </div>
            <span className={`text-xs font-label font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ${styles.badge}`}>
              {info.severity}
            </span>
          </div>
        );
      })}
    </div>
  );
}
