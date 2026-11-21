export function normalizeFavoriteHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) {
    return '/';
  }

  let pathname = trimmed;
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      pathname = new URL(trimmed).pathname;
    } else {
      const queryIndex = pathname.indexOf('?');
      const hashIndex = pathname.indexOf('#');
      const cutAt = Math.min(
        queryIndex === -1 ? pathname.length : queryIndex,
        hashIndex === -1 ? pathname.length : hashIndex,
      );
      pathname = pathname.slice(0, cutAt);
    }
  } catch {
    const queryIndex = pathname.indexOf('?');
    if (queryIndex !== -1) {
      pathname = pathname.slice(0, queryIndex);
    }
  }

  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  return pathname;
}