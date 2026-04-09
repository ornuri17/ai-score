// ============================================================
// AIScore Config
// Central configuration loaded from environment variables.
// ============================================================

export const config = {
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  redisUrl: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  databaseUrl: process.env['DATABASE_URL'] ?? 'postgresql://aiscore:password@localhost:5432/aiscore',
  crawlerTimeoutMs: parseInt(process.env['CRAWLER_TIMEOUT_MS'] ?? '10000', 10),
  cacheTtlSeconds: parseInt(process.env['CACHE_TTL_SECONDS'] ?? '604800', 10),
  rateLimitChecksIp: parseInt(process.env['RATE_LIMIT_CHECKS_IP'] ?? '50', 10),
  circuitBreakerFailures: parseInt(process.env['CIRCUIT_BREAKER_FAILURES'] ?? '3', 10),
};
