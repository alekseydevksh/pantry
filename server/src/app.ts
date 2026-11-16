// Builds the GraphQL server. No port is opened here, so tests can call `app.fetch()` directly.
import { createSchema, createYoga, type Plugin } from 'graphql-yoga';

import { loadTypeDefs } from '@pantry/shared/schema';

import { CartStore } from './cart';
import { loadCatalog } from './catalog';
import { apiError } from './errors';
import { createResolvers, type Context } from './resolvers';

export interface AppOptions {
  /** Random delay before every operation, in ms. `null` turns it off (tests). */
  delayMs?: { min: number; max: number } | null;
  /** Share of operations (0–1) that fail with a simulated error. 0 turns it off (tests). */
  errorRate?: number;
  /** Source of randomness for the delay and the error rate. Injectable for tests. */
  random?: () => number;
  /** Log requests and errors. Off by default so tests stay quiet. */
  logging?: boolean;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Makes loading, retry and error states real in the app: every operation waits a random time,
 * and some fail. The failure is an HTTP 503 with a GraphQL error body, like an overloaded gateway.
 */
function useChaos({ delayMs, errorRate, random }: Required<Omit<AppOptions, 'logging'>>): Plugin {
  return {
    async onExecute({ setResultAndStopExecution }) {
      if (delayMs) await sleep(delayMs.min + random() * (delayMs.max - delayMs.min));
      if (errorRate > 0 && random() < errorRate) {
        setResultAndStopExecution({
          errors: [apiError('SIMULATED_ERROR', 'Simulated server error', 503)],
        });
      }
    },
  };
}

export function createApp(options: AppOptions = {}) {
  const { delayMs = null, errorRate = 0, random = Math.random, logging = false } = options;
  const catalog = loadCatalog();
  const cart = new CartStore(catalog);

  return createYoga<object, Context>({
    schema: createSchema<Context>({
      typeDefs: loadTypeDefs(),
      resolvers: createResolvers(catalog),
    }),
    context: { catalog, cart },
    plugins: [useChaos({ delayMs, errorRate, random })],
    logging,
    // Our own errors carry a code and are safe to show. Unexpected ones are masked by Yoga.
    maskedErrors: true,
    graphqlEndpoint: '/graphql',
    landingPage: false,
  });
}
