import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  transport: isProd
    ? undefined
    : {
        target: 'pino/file',
        options: { destination: 1 },
      },
  formatters: {
    level(label: string) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['password', 'token', 'refreshToken', 'accessToken', 'preAuthToken', 'profitDbPassword', 'secret'],
    censor: '[REDACTED]',
  },
});

export default logger;
