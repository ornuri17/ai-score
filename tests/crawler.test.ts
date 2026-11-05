import http from 'http';
import { AddressInfo } from 'net';
import { crawlUrl } from '../src/services/crawler';

describe('crawlUrl', () => {
  let server: http.Server;
  let base = '';

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/old') {
        res.writeHead(301, { Location: '/page' });
        res.end();
        return;
      }
      if (req.url === '/page') {
        res.setHeader('X-Robots-Tag', ['noindex', 'GPTBot: nofollow']);
        res.setHeader('Link', '</.well-known/api-catalog>; rel="api-catalog"');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body>hi</body></html>');
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('keeps the final response headers, joining repeated ones', async () => {
    const result = await crawlUrl(`${base}/old`, 5000);
    expect(result.statusCode).toBe(200);
    expect(result.redirectCount).toBe(1);
    expect(result.finalUrl).toBe(`${base}/page`);
    expect(result.headers['x-robots-tag']).toBe('noindex, GPTBot: nofollow');
    expect(result.headers['link']).toContain('rel="api-catalog"');
    expect(result.robotsTxt).toBeNull();
  });
});
