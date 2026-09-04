import { Logger } from '../lib/observability/telemetry';

const record = Logger.error(
  'provider request failed',
  new Error('do not log provider body or secret-bearing message'),
  {
    requestId: 'req_123',
    authorization: 'Bearer secret-token',
    nested: {
      apiKey: 'key-value',
      paymentSignature: 'sig-value',
      deliveredCode: 'digital-code-value',
      safe: 'kept',
    },
    list: [{ refresh_token: 'refresh-value' }, { safe: 'also-kept' }],
  },
);

const context = record.context as Record<string, any>;

const assertions: Array<[boolean, string]> = [
  [record.level === 'ERROR', 'error log level must remain ERROR'],
  [record.error?.name === 'Error', 'error logs should keep only a safe error class name'],
  [!('stack' in record.error), 'error stack must not be emitted'],
  [!('message' in record.error), 'raw error message must not be emitted'],
  [context.requestId === 'req_123', 'safe correlation context must remain available'],
  [context.authorization === '[REDACTED]', 'authorization must be redacted'],
  [context.nested.apiKey === '[REDACTED]', 'nested API keys must be redacted'],
  [context.nested.paymentSignature === '[REDACTED]', 'payment signatures must be redacted'],
  [context.nested.deliveredCode === '[REDACTED]', 'delivered digital codes must be redacted'],
  [context.nested.safe === 'kept', 'safe nested context must remain available'],
  [context.list[0].refresh_token === '[REDACTED]', 'tokens inside arrays must be redacted'],
  [context.list[1].safe === 'also-kept', 'safe array context must remain available'],
];

for (const [passed, message] of assertions) {
  if (!passed) throw new Error(`Logger redaction regression: ${message}`);
}

console.log('Logger redaction regression guard passed.');
