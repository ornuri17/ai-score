// ============================================================
// AIScore Logger
// All workstreams must import from this module.
// Do NOT use console.log / console.error directly.
// ============================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isProduction = process.env['NODE_ENV'] === 'production';

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaPart = meta !== undefined ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaPart}`;
}

function log(level: LogLevel, message: string, meta?: unknown): void {
  if (level === 'debug' && isProduction) {
    return;
  }

  const formatted = formatMessage(level, message, meta);

  switch (level) {
    case 'debug':
    case 'info':
      // eslint-disable-next-line no-console
      console.info(formatted);
      break;
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(formatted);
      break;
    case 'error':
      // eslint-disable-next-line no-console
      console.error(formatted);
      break;
  }
}

export const logger = {
  debug(message: string, meta?: unknown): void {
    log('debug', message, meta);
  },
  info(message: string, meta?: unknown): void {
    log('info', message, meta);
  },
  warn(message: string, meta?: unknown): void {
    log('warn', message, meta);
  },
  error(message: string, meta?: unknown): void {
    log('error', message, meta);
  },
};
