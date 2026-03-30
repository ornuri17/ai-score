# AIScore Frontend

React + TypeScript + Vite frontend for the AIScore AI-readiness scoring tool.

## Tech Stack

- **React 19** + TypeScript
- **Vite 8** with `@tailwindcss/vite`
- **Tailwind CSS v4** with Neural Overlay design system
- **react-router-dom v7** — client-side routing
- **react-i18next** — 6-language i18n (EN, FR, DE, ES, HE, RU)
- **axios** — API client

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Production build to dist/
npm run preview    # Preview production build
npm run lint       # ESLint
```

### Environment

```bash
# frontend/.env
VITE_API_URL=http://localhost:3000
```

## Pages

| Route | Component | Description |
|---|---|---|
| `/` | `Home` | Landing page — URL input, how it works, CTA |
| `/analysis/:domain` | `Results` | Score results with summary, dimensions, issues |
| `/how-it-works` | `HowItWorks` | Process steps, score tiers, FAQ |
| `/privacy` | `Privacy` | Privacy policy |
| `/terms` | `Terms` | Terms of service |

## Components

| Component | Description |
|---|---|
| `NavBar` | Fixed glassmorphism nav with language selector (all pages) |
| `Header` | Thin wrapper around NavBar (used by Privacy, Terms, HowItWorks) |
| `ScoreCard` | Animated SVG circular arc gauge — counts up from 0 |
| `DimensionBreakdown` | 4-column bento grid — crawlability, content, technical, quality |
| `LeadForm` | Lead capture form with phone validation and i18n |
| `SocialShare` | Twitter/LinkedIn share buttons |

## Design System — Neural Overlay

Dark-mode design system ("The Cognitive Prism"). Key tokens defined in `src/index.css`:

| Token | Value | Usage |
|---|---|---|
| `surface` | `#0b0e14` | Page background |
| `surface-container-low` | `#10131a` | Section backgrounds |
| `surface-container-high` | `#1c2028` | Cards and interactive elements |
| `primary` | `#81ecff` | Electric Blue — CTAs, active states |
| `secondary` | `#a68cff` | Violet — secondary accents, labels |
| `tertiary` | `#ff6c95` | Deep Rose — alerts, critical states |

Fonts: **Manrope** (headlines), **Inter** (body), **Space Grotesk** (labels/metadata)

Rules:
- No 1px borders — use surface color shifts for separation
- Glassmorphism for fixed overlays: `bg-[#0b0e14]/80 backdrop-blur-xl`
- Primary CTAs: gradient `#81ecff → #00d4ec` at 135°
- Input focus: bottom-edge glow only (`box-shadow: 0 2px 0 0 #81ecff`)

## Multilingual (i18n)

Translation files live in `src/locales/{lang}/translation.json`:
- `en` English (default)
- `fr` Français
- `de` Deutsch
- `es` Español
- `he` עברית (RTL — automatically sets `document.dir = 'rtl'`)
- `ru` Русский

Language detection order: `localStorage.language` → `navigator.language` → `en`

To add a new language: create `src/locales/{code}/translation.json` with all keys from `en/translation.json`, then register it in `src/i18n/config.ts` and add an `<option>` in `NavBar.tsx`.

## URL Input Behaviour

- Accepts URLs with or without `https://` prefix — automatically prepends `https://` if missing
- Validates non-empty input in JavaScript (no browser-native `required` validation)
- Error codes: 429 → rate limit message, 503 → unreachable message, network error → server unreachable message
