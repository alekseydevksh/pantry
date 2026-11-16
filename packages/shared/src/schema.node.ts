// Node-only entry (`@pantry/shared/schema`). It reads from disk, so the app must not import it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const schemaPath = join(__dirname, '..', 'schema.graphql');

/** The SDL of the Pantry API, as written in `schema.graphql`. */
export function loadTypeDefs(): string {
  return readFileSync(schemaPath, 'utf8');
}
