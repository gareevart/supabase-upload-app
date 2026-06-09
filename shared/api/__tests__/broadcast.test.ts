import { BroadcastApi } from '../broadcast';

const mockResponse = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  });

describe('BroadcastApi', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getBroadcasts', () => {
    it('calls /api/broadcasts with no query string when no filters', async () => {
      (global.fetch as jest.Mock).mockReturnValue(mockResponse({ data: [], count: 0 }));

      await BroadcastApi.getBroadcasts();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/broadcasts',
        expect.objectContaining({ credentials: 'include' })
      );
    });

    it('appends single status filter to URL', async () => {
      (global.fetch as jest.Mock).mockReturnValue(mockResponse({ data: [], count: 0 }));

      await BroadcastApi.getBroadcasts({ status: 'draft' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/broadcasts?status=draft',
        expect.anything()
      );
    });

    it('appends multiple status values as repeated params', async () => {
      (global.fetch as jest.Mock).mockReturnValue(mockResponse({ data: [], count: 0 }));

      await BroadcastApi.getBroadcasts({ status: ['draft', 'scheduled'] });

      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('status=draft');
      expect(url).toContain('status=scheduled');
    });

    it('appends limit and offset', async () => {
      (global.fetch as jest.Mock).mockReturnValue(mockResponse({ data: [], count: 0 }));

      await BroadcastApi.getBroadcasts({ limit: 20, offset: 40 });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/broadcasts?limit=20&offset=40',
        expect.anything()
      );
    });
  });

  describe('getBroadcast', () => {
    it('calls /api/broadcasts/:id', async () => {
      (global.fetch as jest.Mock).mockReturnValue(mockResponse({ data: {} }));

      await BroadcastApi.getBroadcast('abc-123');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/broadcasts/abc-123',
        expect.anything()
      );
    });
  });

  describe('createBroadcast', () => {
    it('sends POST with JSON body', async () => {
      (global.fetch as jest.Mock).mockReturnValue(mockResponse({ data: {} }));
      const payload = { subject: 'Hello', content: 'Body', recipients: [], status: 'draft' as const, scheduled_for: null };

      await BroadcastApi.createBroadcast(payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/broadcasts',
        expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) })
      );
    });
  });

  describe('deleteBroadcast', () => {
    it('sends DELETE to /api/broadcasts/:id', async () => {
      (global.fetch as jest.Mock).mockReturnValue(mockResponse(null, 204));

      await BroadcastApi.deleteBroadcast('abc-123');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/broadcasts/abc-123',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('sendBroadcast', () => {
    it('sends POST to /api/broadcasts/send with id in body', async () => {
      (global.fetch as jest.Mock).mockReturnValue(mockResponse(null, 200));

      await BroadcastApi.sendBroadcast('abc-123');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/broadcasts/send',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ id: 'abc-123' }) })
      );
    });
  });

  describe('error handling', () => {
    it('throws with parsed error message on non-ok response', async () => {
      (global.fetch as jest.Mock).mockReturnValue(
        mockResponse({ error: 'Not found' }, 404)
      );

      await expect(BroadcastApi.getBroadcast('missing')).rejects.toThrow('Not found');
    });

    it('throws unauthorised message on 401', async () => {
      (global.fetch as jest.Mock).mockReturnValue(
        mockResponse({ error: 'Unauthorized' }, 401)
      );

      await expect(BroadcastApi.getBroadcasts()).rejects.toThrow('Не авторизован');
    });

    it('throws network error message on fetch failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(BroadcastApi.getBroadcasts()).rejects.toThrow('Ошибка сети');
    });
  });
});
