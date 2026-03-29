// ============================================================
// AIScore Scoring Validation — 20-Website Test Suite
//
// Tests call the real scoreWebsite() function with constructed FetchResult
// objects that simulate what the crawler returns for each site category.
// No real network calls are made — fixtures are deterministic.
// ============================================================

import { scoreWebsite } from '../../src/services/scorer';
import websitesJson from './websites.json';
import { getFixtureForCategory } from './html-fixtures';

interface WebsiteEntry {
  url: string;
  name: string;
  category: string;
  expectedMin: number;
  expectedMax: number;
}

describe('Scoring Validation — 20 Website Test', () => {
  const results: Array<{
    name: string;
    category: string;
    score: number;
    expected: string;
    tolerance: string;
    pass: boolean;
  }> = [];

  afterAll(() => {
    const passed = results.filter(r => r.pass).length;
    const total = results.length;
    console.info(`\nValidation Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}% accuracy)`);
    console.info('');
    console.info('Site'.padEnd(30) + 'Category'.padEnd(22) + 'Score'.padEnd(8) + 'Expected'.padEnd(14) + 'Tolerance'.padEnd(14) + 'Result');
    console.info('-'.repeat(100));
    results.forEach(r => {
      const icon = r.pass ? '✓' : '✗';
      console.info(
        r.name.padEnd(30) +
        r.category.padEnd(22) +
        String(r.score).padEnd(8) +
        r.expected.padEnd(14) +
        r.tolerance.padEnd(14) +
        icon,
      );
    });
    // Gate: 18/20 must pass (90% accuracy — Week 1 blocker threshold)
    expect(passed).toBeGreaterThanOrEqual(18);
  });

  (websitesJson as WebsiteEntry[]).forEach((site) => {
    test(`${site.name} scores ${site.expectedMin}-${site.expectedMax} (±10 tolerance)`, () => {
      const fixture = getFixtureForCategory(site.category, site.url);
      const result = scoreWebsite(fixture, site.url);

      const lowerBound = site.expectedMin - 10;
      const upperBound = site.expectedMax + 10;
      const pass = result.score >= lowerBound && result.score <= upperBound;

      results.push({
        name: site.name,
        category: site.category,
        score: result.score,
        expected: `${site.expectedMin}-${site.expectedMax}`,
        tolerance: `${lowerBound}-${upperBound}`,
        pass,
      });

      expect(result.score).toBeGreaterThanOrEqual(lowerBound);
      expect(result.score).toBeLessThanOrEqual(upperBound);
    });
  });
});
