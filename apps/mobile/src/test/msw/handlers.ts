// Ready-made handlers for the cases many tests share. A test adds them with `server.use(...)`.
import { FeedPreviewDocument } from '@pantry/shared';

import { api } from './api';

/** The feed has no items. For tests that render a screen which loads the feed but do not check it. */
export const emptyFeed = () =>
  api.query(FeedPreviewDocument, () => ({
    feed: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
  }));
