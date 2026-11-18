import { useApolloClient } from '@apollo/client/react';
import { useEffect, useState } from 'react';

import { SuggestionsDocument } from '@pantry/shared';

import { SUGGESTION_DEBOUNCE_MS, suggestionPrefix } from '../model/typeahead';
import { useDebouncedValue } from './useDebouncedValue';

/**
 * Typeahead suggestions for the text in the field.
 *
 * - The request waits until the text has been still for 250 ms, so typing fast sends one request.
 * - A newer request aborts the one before it. If a response arrives anyway (the server had already
 *   answered), it is ignored: only the request of the current text can set the result.
 * - While the next request is loading, the last good suggestions stay on screen. A failed request
 *   keeps them too: suggestions are a convenience, so there is no error state for them.
 * - Cleared text clears the suggestions at once, without a request.
 */
export function useSuggestions(text: string): string[] {
  const client = useApolloClient();
  const prefix = suggestionPrefix(text);
  const debouncedPrefix = useDebouncedValue(prefix, SUGGESTION_DEBOUNCE_MS);
  const [settled, setSettled] = useState<string[]>([]);

  useEffect(() => {
    if (!debouncedPrefix) return;
    const controller = new AbortController();

    client
      .query({
        query: SuggestionsDocument,
        variables: { prefix: debouncedPrefix },
        context: { fetchOptions: { signal: controller.signal } },
      })
      .then(({ data }) => {
        if (controller.signal.aborted || !data) return;
        setSettled(data.suggestions);
      })
      // Aborted, offline or a server error: keep what is on screen.
      .catch(() => {});

    return () => controller.abort();
  }, [client, debouncedPrefix]);

  return prefix ? settled : [];
}
