import { createApp, type AppOptions } from '../app';

export interface GqlResponse<T> {
  status: number;
  data?: T | null;
  errors?: { message: string; extensions?: { code?: string } }[];
}

/** A server with no delay and no errors, called in-process (no port). */
export function createTestClient(options: AppOptions = {}) {
  const app = createApp(options);

  // The response shape depends on the query, so each test names the fields it reads.
  async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<GqlResponse<T>> {
    const response = await app.fetch('http://pantry.test/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    const body = (await response.json()) as Omit<GqlResponse<T>, 'status'>;
    return { status: response.status, ...body };
  }

  /** Runs a query that must succeed and returns its data. */
  async function ok<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const result = await gql<T>(query, variables);
    if (result.errors || !result.data) {
      throw new Error(`GraphQL request failed: ${JSON.stringify(result.errors)}`);
    }
    return result.data;
  }

  return { gql, ok };
}
