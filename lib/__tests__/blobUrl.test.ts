import {
  getGalleryShareUrl,
  isPublicBlogAssetPath,
  isPublicGalleryAssetPath,
} from '@/lib/blobUrl';

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

describe('isPublicGalleryAssetPath', () => {
  it('allows a gallery image with user and file identifiers', () => {
    expect(isPublicGalleryAssetPath('profiles/user-id/image-id.webp')).toBe(true);
  });

  it('allows the legacy path with a duplicated owner identifier', () => {
    expect(isPublicGalleryAssetPath('profiles/user-id/user-id/image-id.webp')).toBe(true);
  });

  it.each([
    'profiles/image.webp',
    'profiles/user-id/nested/image.webp',
    'profiles/other-user/user-id/image.webp',
    'profiles/../private/image.webp',
    'uploads/user-id/image.webp',
  ])('keeps invalid gallery paths private: %s', (path) => {
    expect(isPublicGalleryAssetPath(path)).toBe(false);
  });
});

describe('getGalleryShareUrl', () => {
  it('creates an absolute gallery URL with the image selected', () => {
    expect(
      getGalleryShareUrl('profiles/user-id/image-id.webp', 'https://gareev.de'),
    ).toBe('https://gareev.de/projects/uploader?image=profiles%2Fuser-id%2Fimage-id.webp');
  });
});
