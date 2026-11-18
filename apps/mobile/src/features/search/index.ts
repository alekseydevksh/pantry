export { SearchScreen } from './components/SearchScreen';
// Other features (the assistant, Phase 4) build their `search` input through this, so the same
// search shares one cache entry wherever it comes from (ADR 0010).
export { canonicalSearchInput } from './model/searchParams';
