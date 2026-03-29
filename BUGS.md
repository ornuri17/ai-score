# Known Issues + Backlog

## P2 — Post-launch (Phase 2 candidates)

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 1 | SPAs (React, Next.js) score lower because JS isn't executed during crawl | Scores for JS-heavy sites may be misleading | Add Puppeteer/Playwright rendering option |
| 2 | Results page fetches fresh data instead of using the check_id from the URL | Extra crawl triggered on page load | Pass result data through navigation state or fetch by check_id |
| 3 | Language switcher resets to browser language on page refresh | Minor UX friction | Already persisted to localStorage — verify on reload |
| 4 | No loading skeleton on Results page (just text) | UX | Add skeleton cards while score loads |
| 5 | `og-image.png` is a placeholder — no actual image | Social shares show no preview image | Generate a real 1200×630 OG image |
| 6 | No unsubscribe link in confirmation email | CAN-SPAM compliance gap | Add one-click unsubscribe to email template |
| 7 | sitemap.xml only lists homepage — result pages not indexed | Lower SEO coverage | Add dynamic sitemap with top-checked domains |
| 8 | No error boundary in React — unhandled errors show blank page | UX | Add `<ErrorBoundary>` wrapper in App.tsx |
| 9 | Phone field accepts any input until submit — no real-time validation | UX friction | Validate on blur, not just on submit |

## Phase 2 features (not bugs)

- Zapier/webhook integration for agencies
- JS rendering (Puppeteer) for SPA sites
- More languages (DE, ES, HE, RU)
- Agency dashboard (lead management UI)
- API access for agencies (white-label)
- Historical score tracking (re-check + diff)
