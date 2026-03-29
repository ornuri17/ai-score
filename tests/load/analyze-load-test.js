// k6 load test for /api/analyze
// Run: k6 run tests/load/analyze-load-test.js
// Requires: API_URL env var pointing to deployed API
// Example: k6 run -e API_URL=https://api.aiscore.io tests/load/analyze-load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const options = {
  vus: 100,
  duration: '60s',
  thresholds: {
    http_req_duration: ['p(99)<3000'],  // p99 < 3s
    http_req_failed: ['rate<0.01'],      // <1% errors
  },
};

const errorRate = new Rate('errors');

const TEST_URLS = [
  'https://example.com',
  'https://github.com',
  'https://stripe.com',
  'https://vercel.com',
  'https://cloudflare.com',
  'https://tailwindcss.com',
  'https://nextjs.org',
  'https://react.dev',
  'https://typescript.org',
  'https://nodejs.org',
];

const API_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  const url = TEST_URLS[Math.floor(Math.random() * TEST_URLS.length)];

  const res = http.post(
    `${API_URL}/api/analyze`,
    JSON.stringify({ url }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'has score': (r) => JSON.parse(r.body).score !== undefined,
  });

  errorRate.add(!ok);
  sleep(0.5);
}
