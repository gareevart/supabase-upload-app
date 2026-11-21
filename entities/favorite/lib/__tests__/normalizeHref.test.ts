import { normalizeFavoriteHref } from '../normalizeHref';

describe('normalizeFavoriteHref', () => {
  it('strips query and hash', () => {
    expect(normalizeFavoriteHref('/blog/post?filter=drafts#section')).toBe('/blog/post');
  });

  it('removes trailing slash', () => {
    expect(normalizeFavoriteHref('/blog/')).toBe('/blog');
  });

  it('adds leading slash', () => {
    expect(normalizeFavoriteHref('blog/post')).toBe('/blog/post');
  });
});