// Reproduces the production failure: behind @vendia/serverless-express, a request
// that fell through to Express's default 404 handler crashed with
// "TypeError: ee.on is not a function" and returned HTTP 500.

process.env['AWS_LAMBDA_FUNCTION_NAME'] = 'test';
// Importing the handler builds the real app; keep it off Redis so no connection outlives the test
delete process.env['REDIS_URL'];

import { handler } from '../src/index';

function apiGatewayEvent(path: string): Record<string, unknown> {
  return {
    version: '1.0',
    resource: '/{proxy+}',
    path,
    httpMethod: 'GET',
    headers: { Host: 'api.example.com' },
    multiValueHeaders: { Host: ['api.example.com'] },
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: { proxy: path.slice(1) },
    stageVariables: null,
    requestContext: {
      resourcePath: '/{proxy+}',
      httpMethod: 'GET',
      path: `/prod${path}`,
      stage: 'prod',
      identity: { sourceIp: '203.0.113.1' },
      requestId: 'test',
    },
    body: null,
    isBase64Encoded: false,
  };
}

describe('Lambda handler', () => {
  it('serves /health', async () => {
    const res = (await handler(apiGatewayEvent('/health'), {})) as { statusCode: number };
    expect(res.statusCode).toBe(200);
  });

  it('returns 404, not 500, for an unknown path', async () => {
    const res = (await handler(apiGatewayEvent('/api/does-not-exist'), {})) as { statusCode: number; body: string };
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe('not_found');
  });
});
