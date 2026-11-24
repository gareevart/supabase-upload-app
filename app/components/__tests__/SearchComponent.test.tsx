import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import SearchComponent, { type SearchResult } from '../SearchComponent';

jest.mock('@gravity-ui/uikit', () => ({
  TextInput: ({ value, onUpdate, placeholder }: {
    value: string; onUpdate: (value: string) => void; placeholder: string;
  }) => (
    <input value={value} placeholder={placeholder}
      onChange={(event) => onUpdate(event.target.value)} />
  ),
  Text: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Skeleton: () => <div data-testid="skeleton" />,
  Icon: () => null,
  PlaceholderContainer: ({ title }: { title: string }) => <div>{title}</div>,
}));
jest.mock('@gravity-ui/icons', () => ({ Magnifier: {} }));
jest.mock('@/hooks/use-mobile', () => ({ useIsMobile: jest.fn(() => false) }));
jest.mock('@/shared/ui/BlogPostCard', () => ({
  BlogPostCard: ({ post, gridView }: { post: SearchResult; gridView: boolean }) => (
    <article data-grid={String(gridView)}>{post.title}</article>
  ),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const originalFetch = global.fetch;
const fetchMock = jest.fn();
const mobileMock = jest.requireMock('@/hooks/use-mobile').useIsMobile as jest.Mock;

function typeQuery(value: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value } });
}

function advance(ms = 500) {
  act(() => { jest.advanceTimersByTime(ms); });
}

function response(title: string): Response {
  const post: SearchResult = {
    id: title, title, excerpt: null, slug: null, featured_image: null,
    created_at: null, author_id: 'author',
    author: { name: null, username: null, avatar_url: null },
  };
  return { ok: true, json: async () => ({ results: [post] }) } as Response;
}

async function complete(request: ReturnType<typeof deferred<Response>>, title: string) {
  await act(async () => { request.resolve(response(title)); });
}

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock.mockReset();
  mobileMock.mockReturnValue(false);
  global.fetch = fetchMock;
});

afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('SearchComponent request lifecycle', () => {
  it('debounces rapid input and sends only the final query', async () => {
    const request = deferred<Response>();
    fetchMock.mockReturnValue(request.promise);
    render(<SearchComponent />);
    typeQuery('r');
    advance(100);
    typeQuery('re');
    advance(100);
    typeQuery('react');
    advance(499);
    expect(fetchMock).not.toHaveBeenCalled();
    advance(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/blog-posts/search?q=react',
      { signal: expect.any(AbortSignal) });
    await complete(request, 'React article');
    expect(screen.getByText('React article')).toBeInTheDocument();
  });

  it('invalidates the old request immediately during debounce', async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<SearchComponent />);
    typeQuery('react');
    advance();
    const signal = fetchMock.mock.calls[0][1].signal;
    typeQuery('typescript');
    expect(signal.aborted).toBe(true);
    // Deliberately ignore abort in the transport mock.
    await complete(first, 'Stale article');
    expect(screen.queryByText('Stale article')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    advance();
    await complete(second, 'TypeScript article');
    expect(screen.getByText('TypeScript article')).toBeInTheDocument();
  });

  it.each(['', '   '])('clears results and ignores pending responses for "%s"', async (empty) => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<SearchComponent />);
    typeQuery('react');
    advance();
    await complete(first, 'Existing article');
    expect(screen.getByText('Existing article')).toBeInTheDocument();
    typeQuery('typescript');
    advance();
    const signal = fetchMock.mock.calls[1][1].signal;
    typeQuery(empty);
    expect(signal.aborted).toBe(true);
    expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    expect(screen.queryByText('Existing article')).not.toBeInTheDocument();
    await complete(second, 'Stale article');
    expect(screen.queryByText('Stale article')).not.toBeInTheDocument();
    expect(screen.queryByText('Ничего не найдено')).not.toBeInTheDocument();
    advance();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the newest results when responses arrive in reverse order', async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<SearchComponent />);
    typeQuery('react');
    advance();
    typeQuery('typescript');
    advance();
    await complete(second, 'Newest article');
    await complete(first, 'Old article');
    expect(screen.getByText('Newest article')).toBeInTheDocument();
    expect(screen.queryByText('Old article')).not.toBeInTheDocument();
  });

  it('ignores a stale response whose JSON parsing finishes late', async () => {
    const body = deferred<{ results: { id: string; title: string }[] }>();
    const second = deferred<Response>();
    const json = jest.fn(() => body.promise);
    fetchMock.mockResolvedValueOnce({ ok: true, json }).mockReturnValueOnce(second.promise);
    render(<SearchComponent />);
    typeQuery('react');
    await act(async () => { jest.advanceTimersByTime(500); });
    expect(json).toHaveBeenCalledTimes(1);
    typeQuery('typescript');
    advance();
    await complete(second, 'Newest article');
    await act(async () => { body.resolve({ results: [{ id: 'old', title: 'Old article' }] }); });
    expect(screen.getByText('Newest article')).toBeInTheDocument();
    expect(screen.queryByText('Old article')).not.toBeInTheDocument();
  });

  it('does not stop the current loader when an old request fails', async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<SearchComponent />);
    typeQuery('react');
    advance();
    typeQuery('typescript');
    advance();
    await act(async () => { first.reject(new Error('Old request failed')); });
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    expect(consoleError).not.toHaveBeenCalled();
    await complete(second, 'Newest article');
    expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    expect(screen.getByText('Newest article')).toBeInTheDocument();
  });

  it('cancels a pending debounce when the field is cleared', () => {
    render(<SearchComponent />);
    typeQuery('react');
    advance(200);
    typeQuery('');
    advance();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aborts an active request on unmount', async () => {
    const request = deferred<Response>();
    fetchMock.mockReturnValue(request.promise);
    const { unmount } = render(<SearchComponent />);
    typeQuery('react');
    advance();
    const signal = fetchMock.mock.calls[0][1].signal;
    unmount();
    expect(signal.aborted).toBe(true);
    await complete(request, 'Ignored article');
  });
});

describe('SearchComponent display modes', () => {
  it.each([
    [false, false, false],
    [true, false, true],
    [true, true, false],
  ])('preserves grid=%s and mobile=%s', async (gridView, mobile, expectedGrid) => {
    mobileMock.mockReturnValue(mobile);
    const request = deferred<Response>();
    fetchMock.mockReturnValue(request.promise);
    const { container } = render(<SearchComponent gridView={gridView} />);
    typeQuery('react');
    advance();
    await complete(request, 'React article');
    const results = container.querySelector('.search-results-posts');
    expect(results).not.toBeNull();
    expect(results?.classList.contains('search-results-posts_grid')).toBe(expectedGrid);
    expect(screen.getByRole('article')).toHaveAttribute('data-grid', String(gridView));
  });
});
