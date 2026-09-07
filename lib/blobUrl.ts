const BLOB_HOST_SUFFIX = '.blob.vercel-storage.com';

/** Blog covers are intentionally public even though the underlying Blob store is private. */
export function isPublicBlogAssetPath(path: string): boolean {
  const segments = path.split('/');

  return (
    segments.length === 3 &&
    segments[0] === 'featured' &&
    segments[1].length > 0 &&
    segments[2].length > 0 &&
    !segments.includes('.') &&
    !segments.includes('..')
  );
}

/** Convert private Vercel Blob URLs (or pathnames) to the authenticated file route. */
export function getBlobPreviewUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.hostname.endsWith(BLOB_HOST_SUFFIX)) {
      return `/api/storage/file?path=${encodeURIComponent(parsed.pathname.replace(/^\//, ''))}`;
    }
    return value;
  } catch {
    return `/api/storage/file?path=${encodeURIComponent(value.replace(/^\//, ''))}`;
  }
}

export function getBlobPath(value: string): string {
  try {
    const parsed = new URL(value);
    if (parsed.hostname.endsWith(BLOB_HOST_SUFFIX)) {
      return parsed.pathname.replace(/^\//, '');
    }
  } catch {
    // The value is already a pathname.
  }

  return value.replace(/^\//, '');
}
