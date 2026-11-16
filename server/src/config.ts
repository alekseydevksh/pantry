import type { AppOptions } from './app';

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number, got "${raw}"`);
  }
  return value;
}

/**
 * Environment variables:
 * - PORT          (default 4000)
 * - DELAY_MIN_MS  (default 100)  } both 0 = no delay
 * - DELAY_MAX_MS  (default 800)  }
 * - ERROR_RATE    (default 0)    share of operations that fail, 0–1
 */
export function readConfig(): { port: number; app: AppOptions } {
  const min = numberFromEnv('DELAY_MIN_MS', 100);
  const max = Math.max(min, numberFromEnv('DELAY_MAX_MS', 800));
  const errorRate = numberFromEnv('ERROR_RATE', 0);
  if (errorRate > 1) throw new Error('ERROR_RATE must be between 0 and 1');

  return {
    port: numberFromEnv('PORT', 4000),
    app: { delayMs: max === 0 ? null : { min, max }, errorRate, logging: true },
  };
}
