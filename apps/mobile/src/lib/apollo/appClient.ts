// The app's one Apollo Client, used by `ApolloProvider` in the root layout.
// Task 2.3 restores the persisted cache into it before the first render.
import { createApolloClient } from './client';

export const apolloClient = createApolloClient();
