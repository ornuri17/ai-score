// Mock config before any imports that trigger it
jest.mock('../config', () => ({
  config: {
    crawler: {
      timeoutMs: 10000,
      maxRedirects: 5,
    },
  },
}));

import axios from 'axios';
import { fetchWebsite } from './crawler';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const SAMPLE_HTML = '<html><head><title>Test</title></head><body><p>Hello world</p></body></html>';

// Type for the minimal shape axios.isAxiosError checks
interface MinimalAxiosError extends Error {
  isAxiosError: boolean;
  code: string;
  config: Record<string, unknown>;
  toJSON: () => Record<string, unknown>;
}

// Build a minimal AxiosError-shaped error for tests.
// We use axios.AxiosError constructor if available (axios >= 1.x),
// otherwise fall back to a manually shaped object.
function makeAxiosError(message: string, code: string): MinimalAxiosError {
  const err: MinimalAxiosError = Object.assign(new Error(message), {
    isAxiosError: true as const,
    code,
    config: {},
    toJSON: (): Record<string, unknown> => ({}),
  });
  return err;
}

describe('fetchWebsite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Use the real isAxiosError so the crawler's detection logic works.
    // Cast through unknown to satisfy the type-predicate + MockInstance intersection.
    mockedAxios.isAxiosError = jest.requireActual<typeof axios>('axios').isAxiosError as typeof mockedAxios.isAxiosError;
  });

  it('returns correct FetchResult shape on success', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: SAMPLE_HTML,
      status: 200,
      request: {
        res: { responseUrl: 'https://example.com' },
        _redirectable: { _redirectCount: 0 },
      },
    });

    const result = await fetchWebsite('https://example.com');

    expect(result.html).toBe(SAMPLE_HTML);
    expect(result.statusCode).toBe(200);
    expect(result.redirectCount).toBe(0);
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.finalUrl).toBe('https://example.com');
  });

  it('counts redirects correctly', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: SAMPLE_HTML,
      status: 200,
      request: {
        res: { responseUrl: 'https://example.com/final' },
        _redirectable: { _redirectCount: 3 },
      },
    });

    const result = await fetchWebsite('https://example.com/original');

    expect(result.redirectCount).toBe(3);
    expect(result.finalUrl).toBe('https://example.com/final');
  });

  it('returns non-200 status without throwing', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: '<html><body>Not found</body></html>',
      status: 404,
      request: {
        res: { responseUrl: 'https://example.com/missing' },
        _redirectable: { _redirectCount: 0 },
      },
    });

    const result = await fetchWebsite('https://example.com/missing');

    expect(result.statusCode).toBe(404);
    // Should NOT throw — scorer handles non-200
  });

  it('throws TIMEOUT on connection timeout', async () => {
    mockedAxios.get.mockRejectedValueOnce(
      makeAxiosError('timeout of 10000ms exceeded', 'ECONNABORTED'),
    );

    await expect(fetchWebsite('https://example.com')).rejects.toThrow('TIMEOUT');
  });

  it('throws TOO_MANY_REDIRECTS on redirect overflow', async () => {
    mockedAxios.get.mockRejectedValueOnce(
      makeAxiosError(
        'Exceeded maxRedirects. Probably stuck in a redirect loop.',
        'ERR_TOO_MANY_REDIRECTS',
      ),
    );

    await expect(fetchWebsite('https://example.com')).rejects.toThrow('TOO_MANY_REDIRECTS');
  });

  it('rethrows network errors with descriptive message', async () => {
    mockedAxios.get.mockRejectedValueOnce(
      makeAxiosError('ENOTFOUND some-domain.invalid', 'ENOTFOUND'),
    );

    await expect(fetchWebsite('https://some-domain.invalid')).rejects.toThrow(
      /Network error fetching/,
    );
  });

  it('calls axios.get with correct config', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: SAMPLE_HTML,
      status: 200,
      request: {
        res: { responseUrl: 'https://example.com' },
        _redirectable: { _redirectCount: 0 },
      },
    });

    await fetchWebsite('https://example.com');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        timeout: expect.any(Number),
        maxRedirects: expect.any(Number),
        headers: expect.objectContaining({
          'User-Agent': expect.stringContaining('AIScore-Crawler'),
        }),
        responseType: 'text',
        validateStatus: expect.any(Function),
      }),
    );
  });

  it('validateStatus returns true for any status code', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: '<html></html>',
      status: 503,
      request: {
        res: { responseUrl: 'https://example.com' },
        _redirectable: { _redirectCount: 0 },
      },
    });

    // Should not throw for 503
    const result = await fetchWebsite('https://example.com');
    expect(result.statusCode).toBe(503);
  });
});
