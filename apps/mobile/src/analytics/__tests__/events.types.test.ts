// A type test: `pnpm typecheck` compiles this file, and each `@ts-expect-error` fails the check if
// the line below it stops being an error. So an event with a wrong payload cannot compile.
import { createAnalytics } from '../analytics';

const { track } = createAnalytics();

// Never called: only compiled.
function _wrongPayloads() {
  // @ts-expect-error An event that is not in the schema.
  track('search_done', { query: 'pasta' });

  // @ts-expect-error A prop is missing (`source`).
  track('search_submitted', { query: 'pasta', filterCount: 0, sort: 'RELEVANCE' });

  // @ts-expect-error A prop has the wrong type (`position` is a number).
  track('search_result_clicked', { query: 'a', position: '2', itemId: 'p1', itemType: 'product' });

  // @ts-expect-error A value that is not in the union (`itemType`).
  track('search_result_clicked', { query: 'a', position: 2, itemId: 'p1', itemType: 'video' });

  // @ts-expect-error A sort order the schema does not have.
  track('search_submitted', { query: 'a', source: 'field', filterCount: 0, sort: 'NEWEST' });

  // @ts-expect-error The props of another event.
  track('search_zero_results', { query: 'a', source: 'field', filterCount: 0, sort: 'RELEVANCE' });

  // @ts-expect-error No props.
  track('search_zero_results');
}

describe('event schema (type test)', () => {
  it('accepts the right payload for each event', () => {
    expect(() => {
      track('search_submitted', { query: 'a', source: 'field', filterCount: 0, sort: 'RELEVANCE' });
      track('search_result_clicked', { query: 'a', position: 1, itemId: 'p1', itemType: 'recipe' });
      track('search_zero_results', { query: 'a', filterCount: 2 });
    }).not.toThrow();
    expect(_wrongPayloads).toBeInstanceOf(Function);
  });
});
