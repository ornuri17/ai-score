import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { trackPageView } from './services/analytics';

const Home = lazy(() => import('./pages/Home'));
const Results = lazy(() => import('./pages/Results'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));
const CompareResults = lazy(() => import('./pages/CompareResults'));
const Admin = lazy(() => import('./pages/Admin'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Check = lazy(() => import('./pages/Check'));
const GuideHowToCheck = lazy(() => import('./pages/GuideHowToCheck'));

function PageViewTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <PageViewTracker />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analysis/:domain" element={<Results />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/compare" element={<CompareResults />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/check" element={<Check />} />
          <Route path="/guides/how-to-check-ai-readiness" element={<GuideHowToCheck />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
