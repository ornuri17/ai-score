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

export function trackPageView(path: string) {
  track('page_view', { page_path: path });
}
