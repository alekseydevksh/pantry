import { useState } from 'react';

import { StyleSheet } from 'react-native-unistyles';
import { View } from 'react-native';

import { track, type SearchSource } from '@/analytics';
import { Screen } from '@/design-system';
import { FeatureErrorBoundary } from '@/lib/error-boundary';
import { OfflineBanner } from '@/lib/network';

import { useSearchRoute } from '../hooks/useSearchRoute';
import { useSearchResults } from '../hooks/useSearchResults';
import { useSuggestions } from '../hooks/useSuggestions';
import { useZeroResultsEvent } from '../hooks/useZeroResultsEvent';
import { clearFilters } from '../model/filters';
import { searchSubmitted } from '../model/searchEvents';
import { suggestionPrefix } from '../model/typeahead';
import { FilterPanel } from './FilterPanel';
import { SearchField } from './SearchField';
import { SearchResults } from './SearchResults';
import { SuggestionList } from './SuggestionList';

export function SearchScreen() {
  return (
    <FeatureErrorBoundary feature="search">
      <SearchContent />
    </FeatureErrorBoundary>
  );
}

function SearchContent() {
  // The route params are the state of the search (ADR 0005, ADR 0010). `draft` is only the text in
  // the field, which is ahead of the params until the user submits.
  const { input, setInput } = useSearchRoute();
  const [draft, setDraft] = useState(input.query);
  const [seenQuery, setSeenQuery] = useState(input.query);
  if (seenQuery !== input.query) {
    // The params changed from outside (a link, the back button): the field follows.
    setSeenQuery(input.query);
    setDraft(input.query);
  }

  // Once the text is submitted (or comes from a link), the suggestions have done their job.
  const editing = suggestionPrefix(draft) !== input.query;
  const suggestions = useSuggestions(editing ? draft : '');

  function submit(text: string, source: SearchSource) {
    const next = { ...input, query: text };
    setInput(next);
    // A link that opens a search does not come through here, so it is not a submitted search.
    const event = searchSubmitted(next, source);
    if (event) track('search_submitted', event);
  }

  function select(text: string, source: SearchSource) {
    setDraft(text);
    submit(text, source);
  }

  // The suggestions take the place of the results while the user is typing something new.
  const showSuggestions = editing && suggestions.length > 0;
  const results = useSearchResults(input);
  useZeroResultsEvent(input, results);

  return (
    <Screen bottomInset={false} style={styles.screen}>
      <OfflineBanner />
      <View style={styles.field}>
        <SearchField
          value={draft}
          onChangeText={setDraft}
          onSubmit={(text) => submit(text, 'field')}
        />
      </View>
      <FilterPanel input={input} onChange={setInput} />
      {showSuggestions ? (
        <SuggestionList
          suggestions={suggestions}
          onSelect={(suggestion) => select(suggestion, 'suggestion')}
        />
      ) : (
        <SearchResults
          results={results}
          input={input}
          onSearch={(query) => select(query, 'empty_state')}
          onClearFilters={() => setInput(clearFilters(input))}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  // The list scrolls edge to edge; the field and the list keep their own padding.
  screen: { padding: theme.spacing.none, gap: theme.spacing.none },
  field: { padding: theme.spacing.lg },
}));
