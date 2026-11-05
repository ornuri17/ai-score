import request from 'supertest';
import { createApp } from '../src/app';
import { createMemoryCheckStore } from '../src/services/checkStore';
import { memoryCache } from './helpers';

const app = createApp({ checkStore: createMemoryCheckStore(), cacheService: memoryCache() });

function rpc(method: string, params: Record<string, unknown> = {}, id: number | null = 1) {
  // id null = a notification (no id member)
  return request(app).post('/mcp').send({ jsonrpc: '2.0', method, params, ...(id === null ? {} : { id }) });
}

describe('MCP endpoint', () => {
  it('initializes with a supported protocol version', async () => {
    const res = await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } });
    expect(res.status).toBe(200);
    const body = res.body as { result: { protocolVersion: string; serverInfo: { name: string } } };
    expect(body.result.protocolVersion).toBe('2025-03-26');
    expect(body.result.serverInfo.name).toBe('gradebyai');
  });

  it('accepts notifications with 202', async () => {
    const res = await rpc('notifications/initialized', {}, null);
    expect(res.status).toBe(202);
  });

  it('lists the scan_site tool', async () => {
    const res = await rpc('tools/list');
    const body = res.body as { result: { tools: Array<{ name: string }> } };
    expect(body.result.tools.map((t) => t.name)).toEqual(['scan_site']);
  });

  it('rejects a bad url as a tool error, not a protocol error', async () => {
    const res = await rpc('tools/call', { name: 'scan_site', arguments: { url: 'ftp://x' } });
    const body = res.body as { result: { isError: boolean } };
    expect(body.result.isError).toBe(true);
  });

  it('answers unknown methods with -32601 and GET with 405', async () => {
    const res = await rpc('resources/list');
    expect((res.body as { error: { code: number } }).error.code).toBe(-32601);
    expect((await request(app).get('/mcp')).status).toBe(405);
  });
});
