/**
 * Pure helpers for blog full-text search, shared between the server search
 * route and any client that needs to render highlighted context.
 */

/** Strip markdown syntax to plain text for content matching. */
export function extractPlainText(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') {
    return content
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[(.+?)\]\(.*?\)/g, '$1')
      .replace(/[*_`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return '';
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Extract a short snippet around the first match, with the term wrapped in <mark>. */
export function extractSearchContext(
  text: string,
  searchTerm: string,
  wordsBefore = 3,
  wordsAfter = 5
): { context: string; highlightedContext: string } | null {
  if (!text || !searchTerm) return null;
  const lowerText = text.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  if (lowerText.indexOf(lowerTerm) === -1) return null;
  const words = text.split(/\s+/);
  const matchWordIndex = words.findIndex((w) => w.toLowerCase().includes(lowerTerm));
  if (matchWordIndex === -1) return null;
  const start = Math.max(0, matchWordIndex - wordsBefore);
  const end = Math.min(words.length, matchWordIndex + wordsAfter + 1);
  const context = words.slice(start, end).join(' ');
  const highlightedContext = context.replace(
    new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi'),
    '<mark class="search-highlight">$1</mark>'
  );
  return { context, highlightedContext };
}

export type BlogSearchResult = {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string | null;
  featured_image: string | null;
  created_at: string | null;
  author_id: string;
  author: {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  searchContext?: { context: string; highlightedContext: string } | null;
};
