import dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '3000'), 10),
  database: {
    url: required('DATABASE_URL'),
  },
  redis: {
    url: optional('REDIS_URL', 'redis://localhost:6379'),
  },
  rateLimit: {
    checksPerIpPerDay: parseInt(optional('RATE_LIMIT_CHECKS_IP', '50'), 10),
    checksPerDomainPerDay: parseInt(optional('RATE_LIMIT_CHECKS_DOMAIN', '100'), 10),
    formsPerIpPerDay: parseInt(optional('RATE_LIMIT_FORMS_IP', '3'), 10),
    circuitBreakerFailures: parseInt(optional('CIRCUIT_BREAKER_FAILURES', '3'), 10),
    circuitBreakerResetMs: parseInt(optional('CIRCUIT_BREAKER_RESET_MS', '300000'), 10), // 5 min
  },
  crawler: {
    timeoutMs: parseInt(optional('CRAWLER_TIMEOUT_MS', '10000'), 10),
    maxRedirects: parseInt(optional('CRAWLER_MAX_REDIRECTS', '5'), 10),
  },
  cache: {
    ttlSeconds: parseInt(optional('CACHE_TTL_SECONDS', '604800'), 10), // 7 days
  },
  zapier: {
    webhookUrl: optional('ZAPIER_WEBHOOK_URL', ''),
  },
} as const;
