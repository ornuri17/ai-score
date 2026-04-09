declare function gtag(...args: unknown[]): void;

function track(eventName: string, params?: Record<string, unknown>) {
  if (typeof gtag === 'undefined') return;
  gtag('event', eventName, params);
}

export function trackCheckSubmitted(url: string) {
  track('check_submitted', { url });
}

export function trackCheckCompleted(domain: string, score: number) {
  track('check_completed', { domain, score });
}

export function trackLeadSubmitted(checkId: string) {
  track('lead_submitted', { check_id: checkId });
}

export function trackCompareSubmitted(myUrl: string, competitorUrl: string) {
  track('compare_submitted', { my_url: myUrl, competitor_url: competitorUrl });
}

export function trackCompareCompleted(myDomain: string, competitorDomain: string, winner: string, delta: number) {
  track('compare_completed', { my_domain: myDomain, competitor_domain: competitorDomain, winner, delta });
}

export function trackPageView(path: string) {
  track('page_view', { page_path: path });
}
