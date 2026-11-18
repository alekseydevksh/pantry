// Campaign attribution: the `utm_*` params of the link that opened the app. Pure, no React.
//
// The search screen rewrites its route params into a canonical form and drops unknown ones such as
// `utm_source` (ADR 0010), so the campaign has to be read from the link itself, before Expo Router
// turns it into route state. `app/+native-intent.tsx` does that (ADR 0011).

/** The standard campaign params, without the `utm_` prefix. */
export const CAMPAIGN_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const;

export type CampaignKey = (typeof CAMPAIGN_KEYS)[number];

/** The campaign a link carried. Only the params the link had are present. */
export type Campaign = Partial<Record<CampaignKey, string>>;

/** Longer values are cut, so a crafted link cannot put a large string into every event. */
export const MAX_CAMPAIGN_VALUE_LENGTH = 100;

const isCampaignKey = (key: string): key is CampaignKey =>
  (CAMPAIGN_KEYS as readonly string[]).includes(key);

/** `decodeURIComponent` for a query string part (`+` is a space), or `null` for a bad `%` escape. */
function decodePart(part: string): string | null {
  try {
    return decodeURIComponent(part.replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

/**
 * The campaign in `url`, or `null` when it has none.
 *
 * `url` can be a full link (`pantry://search?q=a&utm_source=x`, what the device gives) or a path
 * (`/search?q=a&utm_source=x`). The query string is split by hand: React Native's `URL` does not
 * parse custom schemes.
 *
 * Lenient, like the search params: keys in any case, the first value of a repeated key, values
 * trimmed, empty values and bad `%` escapes skipped, values cut to 100 code points. It never throws.
 */
export function parseCampaign(url: string): Campaign | null {
  const withoutFragment = url.split('#', 1)[0] ?? '';
  const queryStart = withoutFragment.indexOf('?');
  if (queryStart === -1) return null;

  const campaign: Campaign = {};
  for (const pair of withoutFragment.slice(queryStart + 1).split('&')) {
    const separator = pair.indexOf('=');
    if (separator === -1) continue;
    const name = decodePart(pair.slice(0, separator))?.trim().toLowerCase();
    if (!name?.startsWith('utm_')) continue;
    const key = name.slice('utm_'.length);
    if (!isCampaignKey(key) || campaign[key] !== undefined) continue;
    const value = decodePart(pair.slice(separator + 1))?.trim();
    if (!value) continue;
    campaign[key] = Array.from(value).slice(0, MAX_CAMPAIGN_VALUE_LENGTH).join('');
  }

  return Object.keys(campaign).length > 0 ? campaign : null;
}
