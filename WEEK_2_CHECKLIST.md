# AIScore - Week 2 Checklist (Frontend + Lead Form)

**Duration**: 5 work days (~10 hours per day)
**Parallel Teams**: 2-3 agents can work simultaneously (minimal dependencies)
**Blocker**: None (all Week 1 backend work is prerequisite and complete)
**Success**: End of Week 2 = Full frontend + lead form + i18n working

---

## Dependencies Overview

```
Week 1 Complete (Backend + Scoring) ✓
    ↓
Week 2 Tasks (All independent, can run in parallel):
    ├─ STREAM A: Homepage + URL Input + Router Setup
    ├─ STREAM B: Results Page + Score Display + Sharing
    ├─ STREAM C: Lead Form + Phone Validation + API Integration
    ├─ STREAM D: i18n Setup + Language Detection
    └─ STREAM E: Styling + Mobile Responsiveness + Polish
```

**Key Point**: Teams can work on Streams A-E in parallel. The only hard dependency is:
- All streams depend on **`src/services/api.ts`** (created in Day 1)

---

## Day 1: Frontend Setup + API Client (Blocks everything) — CRITICAL SETUP

### This Day Must Complete First (All other teams wait)

#### 1.1: Vite Project Bootstrap
- [ ] Create Vite React app: `npm create vite@latest aiscore-frontend -- --template react-ts`
- [ ] Navigate to frontend directory: `cd aiscore-frontend`
- [ ] Install dependencies:
  ```bash
  npm install react-router-dom axios i18next react-i18next
  npm install libphonenumber-js
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  ```
- [ ] Project structure created:
  ```
  src/
  ├── pages/
  │   ├── Home.tsx
  │   └── Results.tsx
  ├── components/
  │   ├── Header.tsx
  │   ├── LeadForm.tsx
  │   ├── ScoreCard.tsx
  │   ├── DimensionBreakdown.tsx
  │   └── SocialShare.tsx
  ├── services/
  │   ├── api.ts              ← CRITICAL (other teams depend on this)
  │   └── phoneValidator.ts
  ├── utils/
  │   └── sharing.ts
  ├── locales/
  │   ├── en/
  │   │   └── translation.json
  │   └── fr/
  │       └── translation.json
  ├── App.tsx
  └── main.tsx
  ```
- [ ] `tsconfig.json` configured
- [ ] `vite.config.ts` configured
- [ ] `.env.example` created (with VITE_API_URL)

**Time**: 3 hours
**Blocker**: None (first task of the day)

---

#### 1.2: API Service Layer (BLOCKS ALL OTHER STREAMS)
- [ ] Create `src/services/api.ts`:
  ```typescript
  import axios from 'axios';

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  export interface AnalyzeResponse {
    check_id: string;
    score: number;
    dimensions: {
      crawlability: number;
      content: number;
      technical: number;
      quality: number;
    };
    issues: string[];
    cached: boolean;
    checked_at: string;
    cached_until: string;
    fallback_until: string;
  }

  export interface LeadSubmission {
    check_id: string;
    name: string;
    email: string;
    phone: string;
  }

  export interface LeadResponse {
    success: boolean;
    message: string;
    lead_id: string;
  }

  export async function analyzeWebsite(
    url: string,
    forceRefresh?: boolean
  ): Promise<AnalyzeResponse> {
    const response = await axios.post(`${API_BASE}/api/analyze`, {
      url,
      force_refresh: forceRefresh,
    });
    return response.data;
  }

  export async function submitLead(lead: LeadSubmission): Promise<LeadResponse> {
    const response = await axios.post(`${API_BASE}/api/leads`, lead);
    return response.data;
  }
  ```
- [ ] Error handling:
  - [ ] Catch 400 (invalid URL)
  - [ ] Catch 429 (rate limited)
  - [ ] Catch 503 (site unreachable)
  - [ ] Catch network errors (show "Connection error")
- [ ] Tests for api.ts:
  ```typescript
  // src/services/api.test.ts
  describe('API Service', () => {
    test('analyzeWebsite returns AnalyzeResponse', async () => {
      // Mock axios
      const result = await analyzeWebsite('https://example.com');
      expect(result.check_id).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });
  ```

**Time**: 2 hours
**Blocker**: YES (all other streams wait for this)
**Status**: ✅ MUST COMPLETE BEFORE OTHER TEAMS START

---

#### 1.3: React Router Setup
- [ ] Create `src/App.tsx`:
  ```typescript
  import { BrowserRouter, Routes, Route } from 'react-router-dom';
  import Home from './pages/Home';
  import Results from './pages/Results';

  export default function App() {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analysis/:domain" element={<Results />} />
        </Routes>
      </BrowserRouter>
    );
  }
  ```
- [ ] Create `src/main.tsx`:
  ```typescript
  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import App from './App';
  import './index.css';

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  ```
- [ ] Verify router works: `npm run dev` should start on http://localhost:5173

**Time**: 1 hour
**Blocker**: No (can happen in parallel with 1.2)

---

**End of Day 1**: All other streams can now start (they have `api.ts`)

---

## Day 2-3: PARALLEL STREAMS (Teams can split work)

After Day 1 completes, divide into teams:

---

### STREAM A: Homepage + URL Input (Days 2-3, 6 hours)

**Dependencies**: Requires `src/services/api.ts` (from Day 1) ✓
**Can run in parallel with**: Streams B, C, D, E
**Team**: 1 engineer

#### A.1: HomePage Component
- [ ] Create `src/pages/Home.tsx`:
  ```typescript
  import { useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import Header from '../components/Header';
  import { analyzeWebsite } from '../services/api';

  export default function Home() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleAnalyze = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      try {
        const result = await analyzeWebsite(url);
        // Extract domain from URL for route
        const domain = new URL(url).hostname;
        navigate(`/analysis/${domain}?checkId=${result.check_id}`);
      } catch (err: any) {
        if (err.response?.status === 429) {
          setError('Rate limit reached. Try again tomorrow.');
        } else if (err.response?.status === 503) {
          setError('Website unreachable. Check the URL.');
        } else {
          setError('Invalid URL. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="max-w-2xl w-full px-6">
            <h1 className="text-4xl font-bold text-white mb-4">
              How AI-Friendly is Your Website?
            </h1>
            <p className="text-lg text-slate-300 mb-8">
              Get a free AI-friendliness score and identify barriers preventing LLMs from discovering your content.
            </p>

            <form onSubmit={handleAnalyze} className="space-y-4">
              <input
                type="url"
                placeholder="Enter your website URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-700 text-white placeholder-slate-400"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Check Your AI Score'}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-900 text-red-100 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
  ```
- [ ] Tailwind styles for homepage
- [ ] Mobile responsive (responsive input, button sizing)
- [ ] Loading state (spinner or button text change)
- [ ] Error handling (400, 429, 503 errors)

**Time**: 4 hours
**Testing**:
- [ ] Test with valid URL
- [ ] Test with invalid URL
- [ ] Test with unreachable site
- [ ] Test mobile view

---

#### A.2: Header Component (Reusable)
- [ ] Create `src/components/Header.tsx`:
  ```typescript
  import { useTranslation } from 'react-i18next';

  export default function Header() {
    const { i18n } = useTranslation();

    return (
      <header className="bg-slate-900 text-white py-4">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="text-2xl font-bold">AIScore</div>
          <select
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            value={i18n.language}
            className="bg-slate-700 text-white px-3 py-2 rounded"
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>
      </header>
    );
  }
  ```
- [ ] Logo + branding
- [ ] Language selector dropdown

**Time**: 2 hours

---

**Stream A Blocker**: None (depends on Day 1)
**End of Stream A**: Homepage fully functional with URL input

---

### STREAM B: Results Page + Score Display (Days 2-3, 8 hours)

**Dependencies**: Requires `src/services/api.ts` (from Day 1) ✓
**Can run in parallel with**: Streams A, C, D, E
**Team**: 1-2 engineers

#### B.1: Results Page Layout
- [ ] Create `src/pages/Results.tsx`:
  ```typescript
  import { useEffect, useState } from 'react';
  import { useSearchParams } from 'react-router-dom';
  import Header from '../components/Header';
  import ScoreCard from '../components/ScoreCard';
  import DimensionBreakdown from '../components/DimensionBreakdown';
  import SocialShare from '../components/SocialShare';
  import { AnalyzeResponse } from '../services/api';

  export default function Results() {
    const [searchParams] = useSearchParams();
    const checkId = searchParams.get('checkId');
    const [result, setResult] = useState<AnalyzeResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      // Fetch from API using checkId
      // For now, mock data for testing
      setResult({
        check_id: checkId || '',
        score: 72,
        dimensions: {
          crawlability: 28,
          content: 24,
          technical: 15,
          quality: 5,
        },
        issues: ['metadata_optimization', 'structured_data_missing'],
        cached: false,
        checked_at: new Date().toISOString(),
        cached_until: new Date(Date.now() + 86400000).toISOString(),
        fallback_until: new Date(Date.now() + 604800000).toISOString(),
      });
      setLoading(false);
    }, [checkId]);

    if (loading) return <div>Loading...</div>;
    if (!result) return <div>Error loading results</div>;

    return (
      <>
        <Header />
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <ScoreCard score={result.score} />
            <DimensionBreakdown dimensions={result.dimensions} />

            {/* Issues */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">Issues Found</h3>
              <ul className="space-y-2">
                {result.issues.map((issue) => (
                  <li key={issue} className="text-slate-700">
                    • {issue}
                  </li>
                ))}
              </ul>
            </div>

            {/* Timestamp */}
            <div className="text-sm text-slate-500 mb-6">
              Last analyzed: {new Date(result.checked_at).toLocaleString()}
            </div>

            {/* Refresh button */}
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Analyze Again
            </button>

            <SocialShare score={result.score} domain="example.com" />
          </div>
        </div>
      </>
    );
  }
  ```
- [ ] Results page layout (score display, breakdown, issues, timestamp)
- [ ] Loading state
- [ ] Error handling

**Time**: 2 hours

---

#### B.2: ScoreCard Component (Large Score Display)
- [ ] Create `src/components/ScoreCard.tsx`:
  ```typescript
  interface Props {
    score: number;
  }

  export default function ScoreCard({ score }: Props) {
    const getColor = (score: number) => {
      if (score >= 80) return 'text-green-600';
      if (score >= 60) return 'text-yellow-600';
      return 'text-red-600';
    };

    return (
      <div className={`text-center py-12 bg-white rounded-lg shadow mb-6`}>
        <div className={`text-7xl font-bold ${getColor(score)}`}>
          {score}
        </div>
        <div className="text-2xl text-slate-700 mt-2">/ 100</div>
        <div className="text-lg text-slate-500 mt-4">
          AI-Friendliness Score
        </div>
      </div>
    );
  }
  ```
- [ ] Score color coding (green/yellow/red)
- [ ] Large, centered display

**Time**: 1 hour

---

#### B.3: DimensionBreakdown Component
- [ ] Create `src/components/DimensionBreakdown.tsx`:
  ```typescript
  interface Dimensions {
    crawlability: number;
    content: number;
    technical: number;
    quality: number;
  }

  export default function DimensionBreakdown({ dimensions }: { dimensions: Dimensions }) {
    const total = Object.values(dimensions).reduce((a, b) => a + b, 0);

    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-xl font-bold mb-6">Score Breakdown</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between mb-2">
              <span>Crawlability</span>
              <span className="font-bold">{dimensions.crawlability}/30</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${(dimensions.crawlability / 30) * 100}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span>Content Structure</span>
              <span className="font-bold">{dimensions.content}/35</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${(dimensions.content / 35) * 100}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span>Technical SEO</span>
              <span className="font-bold">{dimensions.technical}/25</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${(dimensions.technical / 25) * 100}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span>Content Quality</span>
              <span className="font-bold">{dimensions.quality}/10</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full"
                style={{ width: `${(dimensions.quality / 10) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  ```
- [ ] 4 progress bars (one per dimension)
- [ ] Color coding
- [ ] Score labels

**Time**: 2 hours

---

#### B.4: SocialShare Component
- [ ] Create `src/components/SocialShare.tsx`:
  ```typescript
  interface Props {
    score: number;
    domain: string;
  }

  export default function SocialShare({ score, domain }: Props) {
    const shareText = `${domain} scores ${score}/100 on AI-friendliness. Check yours at AIScore!`;
    const shareUrl = window.location.href;

    return (
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h3 className="text-lg font-bold mb-4">Share Results</h3>
        <div className="flex gap-4">
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
          >
            LinkedIn
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            X (Twitter)
          </a>
        </div>
      </div>
    );
  }
  ```
- [ ] LinkedIn share button
- [ ] X (Twitter) share button
- [ ] Pre-filled text with score + domain

**Time**: 1 hour

---

#### B.5: Open Graph Meta Tags
- [ ] Update `src/main.tsx` to dynamically set og:* tags based on results
- [ ] Or: Create component to inject `<meta>` tags on results page
- [ ] og:title: "example.com scores 72/100 on AI-friendliness"
- [ ] og:description: Score breakdown
- [ ] og:image: Static score card image (or generate dynamically later)

**Time**: 2 hours

---

**Stream B Blocker**: None (depends on Day 1)
**End of Stream B**: Results page fully styled with all components

---

### STREAM C: Lead Form + Phone Validation (Days 2-3, 7 hours)

**Dependencies**: Requires `src/services/api.ts` (from Day 1) ✓
**Can run in parallel with**: Streams A, B, D, E
**Team**: 1 engineer

#### C.1: Phone Validator Utility
- [ ] Create `src/services/phoneValidator.ts`:
  ```typescript
  import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

  export function validatePhone(phone: string): {
    valid: boolean;
    error?: string;
    formatted?: string;
  } {
    try {
      // Try to parse with automatic country detection
      if (!phone.trim()) {
        return { valid: false, error: 'Phone number is required' };
      }

      // If no country code, assume US
      const numberToTest = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;

      if (!isValidPhoneNumber(numberToTest)) {
        return { valid: false, error: 'Invalid phone number format' };
      }

      const parsed = parsePhoneNumber(numberToTest);
      return {
        valid: true,
        formatted: parsed?.formatInternational(),
      };
    } catch (err) {
      return { valid: false, error: 'Invalid phone number' };
    }
  }
  ```
- [ ] Unit tests:
  ```typescript
  describe('phoneValidator', () => {
    test('valid US number', () => {
      const result = validatePhone('+1-555-1234567');
      expect(result.valid).toBe(true);
    });

    test('invalid format', () => {
      const result = validatePhone('invalid');
      expect(result.valid).toBe(false);
    });
  });
  ```

**Time**: 2 hours

---

#### C.2: LeadForm Component
- [ ] Create `src/components/LeadForm.tsx`:
  ```typescript
  import { useState } from 'react';
  import { submitLead } from '../services/api';
  import { validatePhone } from '../services/phoneValidator';

  interface Props {
    checkId: string;
  }

  export default function LeadForm({ checkId }: Props) {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const validateForm = () => {
      const newErrors: Record<string, string> = {};

      if (!formData.name.trim()) newErrors.name = 'Name is required';

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Valid email required';
      }

      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.valid) {
        newErrors.phone = phoneValidation.error || 'Invalid phone';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      setLoading(true);
      try {
        const phoneValidation = validatePhone(formData.phone);
        await submitLead({
          check_id: checkId,
          name: formData.name,
          email: formData.email,
          phone: phoneValidation.formatted || formData.phone,
        });
        setSubmitted(true);
      } catch (err: any) {
        if (err.response?.status === 429) {
          setErrors({ form: 'Rate limit reached. Try again later.' });
        } else {
          setErrors({ form: 'Failed to submit. Please try again.' });
        }
      } finally {
        setLoading(false);
      }
    };

    if (submitted) {
      return (
        <div className="bg-green-100 text-green-800 rounded-lg p-6">
          <h3 className="font-bold mb-2">Thank You!</h3>
          <p>We'll follow up with you soon.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-2xl font-bold mb-4">Get Your AEO Action Plan</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <div className="bg-red-100 text-red-800 p-3 rounded">
              {errors.form}
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Your name"
            />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="+1 (555) 123-4567"
            />
            {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Get My Action Plan'}
          </button>
        </form>
      </div>
    );
  }
  ```
- [ ] Real-time phone validation (show error as user types)
- [ ] Email validation
- [ ] Required field validation
- [ ] Success message after submission
- [ ] Rate limit error handling

**Time**: 4 hours
**Testing**:
- [ ] Valid form submits
- [ ] Invalid phone shows error
- [ ] Invalid email shows error
- [ ] Rate limit shows error

---

#### C.3: Integrate LeadForm into Results Page
- [ ] Add `<LeadForm checkId={checkId} />` to Results page
- [ ] Position after score + breakdown (before timestamp)

**Time**: 1 hour

---

**Stream C Blocker**: None (depends on Day 1)
**End of Stream C**: Lead form fully functional with phone validation

---

### STREAM D: i18n Setup (Days 2-3, 5 hours)

**Dependencies**: Requires `src/services/api.ts` (from Day 1) ✓
**Can run in parallel with**: Streams A, B, C, E
**Team**: 1 engineer

#### D.1: i18next Configuration
- [ ] Create `src/i18n/config.ts`:
  ```typescript
  import i18n from 'i18next';
  import { initReactI18next } from 'react-i18next';
  import enTranslation from '../locales/en/translation.json';
  import frTranslation from '../locales/fr/translation.json';

  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: enTranslation },
      fr: { translation: frTranslation },
    },
    lng: localStorage.getItem('language') || navigator.language.split('-')[0] || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

  export default i18n;
  ```

**Time**: 1 hour

---

#### D.2: Translation Files
- [ ] Create `src/locales/en/translation.json`:
  ```json
  {
    "header": {
      "title": "AIScore",
      "language": "Language"
    },
    "home": {
      "title": "How AI-Friendly is Your Website?",
      "subtitle": "Get a free AI-friendliness score and identify barriers preventing LLMs from discovering your content.",
      "placeholder": "Enter your website URL",
      "button": "Check Your AI Score",
      "errors": {
        "rateLimit": "Rate limit reached. Try again tomorrow.",
        "unreachable": "Website unreachable. Check the URL.",
        "invalid": "Invalid URL. Please try again."
      }
    },
    "results": {
      "title": "AI-Friendliness Score",
      "breakdown": "Score Breakdown",
      "crawlability": "Crawlability",
      "content": "Content Structure",
      "technical": "Technical SEO",
      "quality": "Content Quality",
      "issues": "Issues Found",
      "lastAnalyzed": "Last analyzed",
      "analyzeAgain": "Analyze Again",
      "share": "Share Results"
    },
    "form": {
      "cta": "Get Your AEO Action Plan",
      "name": "Name",
      "email": "Email",
      "phone": "Phone",
      "submit": "Get My Action Plan",
      "success": "Thank You! We'll follow up with you soon.",
      "errors": {
        "nameRequired": "Name is required",
        "emailInvalid": "Valid email required",
        "phoneInvalid": "Invalid phone number",
        "rateLimit": "Rate limit reached. Try again later.",
        "submitFailed": "Failed to submit. Please try again."
      }
    }
  }
  ```
- [ ] Create `src/locales/fr/translation.json` (French translations):
  ```json
  {
    "header": {
      "title": "AIScore",
      "language": "Langue"
    },
    "home": {
      "title": "Votre site web est-il compatible avec l'IA ?",
      "subtitle": "Obtenez une note gratuite de compatibilité IA et identifiez les obstacles empêchant les LLM de découvrir votre contenu.",
      "placeholder": "Entrez l'URL de votre site web",
      "button": "Vérifiez votre score IA",
      "errors": {
        "rateLimit": "Limite de débit atteinte. Réessayez demain.",
        "unreachable": "Site web inaccessible. Vérifiez l'URL.",
        "invalid": "URL invalide. Veuillez réessayer."
      }
    },
    "results": {
      "title": "Score de compatibilité IA",
      "breakdown": "Ventilation du score",
      "crawlability": "Explorerabilité",
      "content": "Structure du contenu",
      "technical": "SEO technique",
      "quality": "Qualité du contenu",
      "issues": "Problèmes détectés",
      "lastAnalyzed": "Dernière analyse",
      "analyzeAgain": "Analyser à nouveau",
      "share": "Partager les résultats"
    },
    "form": {
      "cta": "Obtenez votre plan d'action AEO",
      "name": "Nom",
      "email": "Email",
      "phone": "Téléphone",
      "submit": "Obtenir mon plan d'action",
      "success": "Merci ! Nous vous recontacterons bientôt.",
      "errors": {
        "nameRequired": "Le nom est requis",
        "emailInvalid": "Email valide requis",
        "phoneInvalid": "Numéro de téléphone invalide",
        "rateLimit": "Limite de débit atteinte. Réessayez plus tard.",
        "submitFailed": "Échec de la soumission. Veuillez réessayer."
      }
    }
  }
  ```

**Time**: 2 hours

---

#### D.3: Hook Usage in Components
- [ ] Update all text strings to use `useTranslation()` hook:
  ```typescript
  import { useTranslation } from 'react-i18next';

  export default function Home() {
    const { t } = useTranslation();
    return <h1>{t('home.title')}</h1>;
  }
  ```
- [ ] Update all components: Home, Results, Header, LeadForm, etc.

**Time**: 2 hours

---

**Stream D Blocker**: None (independent work)
**End of Stream D**: Full i18n support (EN + FR)

---

### STREAM E: Styling + Mobile Responsiveness + Polish (Days 2-3, 6 hours)

**Dependencies**: Requires `src/services/api.ts` (from Day 1) ✓
**Can run in parallel with**: Streams A, B, C, D
**Team**: 1 engineer (or shared with another stream)

#### E.1: Tailwind CSS Configuration
- [ ] `tailwind.config.js` configured with theme:
  ```javascript
  module.exports = {
    content: [
      './index.html',
      './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
      extend: {
        colors: {
          slate: {
            50: '#f8fafc',
            900: '#0f172a',
          },
        },
      },
    },
    plugins: [],
  };
  ```
- [ ] Global styles in `src/index.css`:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  body {
    @apply bg-slate-50 text-slate-900;
  }
  ```

**Time**: 1 hour

---

#### E.2: Mobile Responsiveness
- [ ] Test on mobile (iPhone 12, Android)
- [ ] Adjust padding/margins for small screens
- [ ] Ensure buttons are tap-friendly (min 44px)
- [ ] Stack components vertically on mobile
- [ ] Test landscape orientation

**Time**: 2 hours

---

#### E.3: Polish & UX Details
- [ ] Loading spinners (or animated text)
- [ ] Smooth transitions (fade-in for results)
- [ ] Hover states (buttons, links)
- [ ] Focus states (accessibility)
- [ ] Consistent spacing (use Tailwind scale)
- [ ] Error states styled clearly
- [ ] Success states styled clearly

**Time**: 2 hours

---

#### E.4: Performance Optimization
- [ ] Lazy load images (if any)
- [ ] Minify CSS
- [ ] Code splitting (React.lazy for pages)
- [ ] Build size check: `npm run build`

**Time**: 1 hour

---

**Stream E Blocker**: None (independent work)
**End of Stream E**: Fully polished, mobile-responsive frontend

---

## Day 4-5: Integration + Testing (All teams come together)

### I.1: Full Integration Testing
- [ ] **All teams**: Verify all components work together
- [ ] [ ] Homepage → Results page flow works
- [ ] [ ] Language switching works on all pages
- [ ] [ ] Lead form submits successfully
- [ ] [ ] Phone validation works end-to-end
- [ ] [ ] Error messages display correctly
- [ ] [ ] Mobile view works on all pages

**Time**: 4 hours (shared effort)

---

### I.2: Backend Integration
- [ ] **Stream A + B + C**: Verify frontend talks to backend
  - [ ] `/api/analyze` endpoint returns correct response
  - [ ] `/api/leads` endpoint accepts form data
  - [ ] Error handling (429, 503, etc.) works
  - [ ] Caching works (same URL returns cached result)
  - [ ] Rate-limiting enforced (after 5 leads, shows error)

**Time**: 2 hours

---

### I.3: Browser Testing
- [ ] Chrome, Firefox, Safari
- [ ] Mobile browsers
- [ ] Responsive design breakpoints
- [ ] Console errors (none allowed)

**Time**: 2 hours

---

### I.4: Performance Audit
- [ ] Lighthouse score >90
- [ ] First contentful paint <2s
- [ ] Bundle size <100KB (with i18n)
- [ ] No unnecessary re-renders

**Time**: 2 hours

---

## End of Week 2 Checklist

### Code Quality
- [ ] All TypeScript types defined (no `any`)
- [ ] ESLint passing: `npm run lint`
- [ ] Type checking passing: `npm run type-check`
- [ ] All components have unit tests passing
- [ ] Integration tests passing (all flows work)

### Documentation
- [ ] README.md has frontend setup instructions
- [ ] .env.example has VITE_API_URL
- [ ] Components documented with JSDoc comments
- [ ] Translation keys documented in translation.json

### Deployment Prep
- [ ] Frontend builds: `npm run build` produces dist/
- [ ] Build is <1MB (gzip)
- [ ] Can be served from CloudFront

### Before Moving to Week 3
- [ ] Git repo updated with frontend code
- [ ] CI/CD pipeline passing (GitHub Actions)
- [ ] All Streams A-E complete + integrated
- [ ] Lighthouse score >90
- [ ] Zero console errors

---

## Files Created This Week

```
src/
├── pages/
│   ├── Home.tsx
│   └── Results.tsx
├── components/
│   ├── Header.tsx
│   ├── LeadForm.tsx
│   ├── ScoreCard.tsx
│   ├── DimensionBreakdown.tsx
│   └── SocialShare.tsx
├── services/
│   ├── api.ts                ✓ Day 1 (CRITICAL)
│   ├── api.test.ts
│   └── phoneValidator.ts
├── i18n/
│   └── config.ts
├── locales/
│   ├── en/
│   │   └── translation.json
│   └── fr/
│       └── translation.json
├── utils/
│   └── sharing.ts
├── App.tsx
├── main.tsx
└── index.css

tailwind.config.js
```

---

## Parallel Work Summary

| Day | Stream A | Stream B | Stream C | Stream D | Stream E |
|-----|----------|----------|----------|----------|----------|
| **1** | API Service (BLOCKER) | — | — | — | — |
| **2** | Homepage | Results Page | Form | i18n | Styling |
| **3** | Polish | Polish | Polish | Polish | Polish |
| **4-5** | Integration Testing + Backend Verification |

---

## Time Budget

| Task | Hours | Team Size | Total Hours |
|------|-------|-----------|-------------|
| Day 1 (Setup + API) | 6 | 1 eng | 6 |
| Stream A (Homepage) | 6 | 1 eng | 6 |
| Stream B (Results) | 8 | 1-2 eng | 8-16 |
| Stream C (Form) | 7 | 1 eng | 7 |
| Stream D (i18n) | 5 | 1 eng | 5 |
| Stream E (Styling) | 6 | 1 eng | 6 |
| Integration (D4-5) | 12 | 2-3 eng | 12-18 |
| **Total** | — | — | **50-66 hours** |

**For 2 engineers**: 25-33 hours each (3-4 days at 8 hrs/day)
**For 3 engineers**: 17-22 hours each (2-3 days at 8 hrs/day)

---

**Status**: Ready for Week 2 Execution
**Parallelization**: 5 independent streams after Day 1
**Next**: Week 3 is Deployment + Testing

Good luck! 🚀
