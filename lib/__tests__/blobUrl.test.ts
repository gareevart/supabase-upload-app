import { isPublicBlogAssetPath } from '@/lib/blobUrl';

describe('isPublicBlogAssetPath', () => {
  it('allows a blog cover stored under a user folder', () => {
    expect(isPublicBlogAssetPath('featured/user-id/cover.webp')).toBe(true);
  });

  it.each([
    'profiles/user-id/avatar.webp',
    'uploads/user-id/document.pdf',
    'featured/cover.webp',
    'featured/user-id/nested/cover.webp',
    'featured/../profiles/avatar.webp',
  ])('keeps non-cover paths private: %s', (path) => {
    expect(isPublicBlogAssetPath(path)).toBe(false);
  });
});
