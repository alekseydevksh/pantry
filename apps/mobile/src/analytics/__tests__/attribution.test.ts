import { MAX_CAMPAIGN_VALUE_LENGTH, parseCampaign } from '../attribution';

describe('parseCampaign', () => {
  it('reads the five campaign params from a full link', () => {
    expect(
      parseCampaign(
        'pantry://search?q=pasta&utm_source=newsletter&utm_medium=email&utm_campaign=spring&utm_term=pasta&utm_content=hero',
      ),
    ).toStrictEqual({
      source: 'newsletter',
      medium: 'email',
      campaign: 'spring',
      term: 'pasta',
      content: 'hero',
    });
  });

  it('reads them from a path, as the router gets it in tests', () => {
    expect(parseCampaign('/recipe/r1?utm_source=ig')).toStrictEqual({ source: 'ig' });
  });

  it.each([
    ['no query string', 'pantry://search', null],
    ['no campaign params', '/search?q=pasta&diet=vegan', null],
    ['an empty query string', '/search?', null],
    ['only an empty value', '/search?utm_source=', null],
    ['a value of spaces', '/search?utm_source=%20%20', null],
    ['a key without a value', '/search?utm_source', null],
    ['an unknown utm key', '/search?utm_id=42&utm_foo=bar', null],
    ['a bad % escape in the value', '/search?utm_source=%E0%A4%A', null],
    ['the params only in the fragment', '/search#x?utm_source=ig', null],
  ])('returns null for %s', (_case, url, expected) => {
    expect(parseCampaign(url)).toBe(expected);
  });

  it.each([
    [
      'keys in any case',
      '/s?UTM_Source=ig&Utm_CAMPAIGN=spring',
      { source: 'ig', campaign: 'spring' },
    ],
    ['the first value of a repeated key', '/s?utm_source=a&utm_source=b', { source: 'a' }],
    [
      'encoded values and + as a space',
      '/s?utm_campaign=spring%20sale+2026',
      { campaign: 'spring sale 2026' },
    ],
    ['values trimmed', '/s?utm_source=%20ig%20', { source: 'ig' }],
    ['a value with = in it', '/s?utm_content=a=b', { content: 'a=b' }],
    ['a fragment after the query', '/s?utm_source=ig#top', { source: 'ig' }],
    ['a bad escape next to a good param', '/s?utm_medium=%ZZ&utm_source=ig', { source: 'ig' }],
    ['an empty value next to a good one', '/s?utm_source=&utm_medium=email', { medium: 'email' }],
    ['a stray & and a param with no =', '/s?&&utm_source=ig&flag', { source: 'ig' }],
  ])('accepts %s', (_case, url, expected) => {
    expect(parseCampaign(url)).toStrictEqual(expected);
  });

  it('cuts a long value to the limit, by code points', () => {
    const long = '🍝'.repeat(MAX_CAMPAIGN_VALUE_LENGTH + 20);

    const campaign = parseCampaign(`/s?utm_source=${encodeURIComponent(long)}`);

    expect(Array.from(campaign?.source ?? '')).toHaveLength(MAX_CAMPAIGN_VALUE_LENGTH);
    expect(campaign?.source).toBe('🍝'.repeat(MAX_CAMPAIGN_VALUE_LENGTH));
  });
});
