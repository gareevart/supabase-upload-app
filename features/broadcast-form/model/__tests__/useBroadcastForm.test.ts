import { renderHook, act } from '@testing-library/react';
import { useBroadcastForm } from '../useBroadcastForm';
import { BroadcastApi } from '@/shared/api/broadcast';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/app/contexts/I18nContext';

jest.mock('@/shared/api/broadcast');
jest.mock('@/hooks/use-toast');
jest.mock('@/app/contexts/I18nContext');

const mockToast = jest.fn();
const mockBroadcastApi = BroadcastApi as jest.Mocked<typeof BroadcastApi>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseI18n = useI18n as jest.MockedFunction<typeof useI18n>;

const broadcastData = {
  subject: 'Test subject',
  content: 'Test content',
  recipients: ['a@example.com'],
  status: 'draft' as const,
  scheduled_for: null,
};

const mockBroadcast = {
  id: 'bc-1',
  ...broadcastData,
  content_html: '<p>Test content</p>',
  user_id: 'user-1',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  sent_at: null,
  broadcast_id: null,
  total_recipients: 1,
  opened_count: 0,
  clicked_count: 0,
};

describe('useBroadcastForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({ toast: mockToast } as any);
    mockUseI18n.mockReturnValue({ t: (key: string) => key, language: 'en', setLanguage: jest.fn() });
  });

  describe('initial state', () => {
    it('starts with isSubmitting false', () => {
      const { result } = renderHook(() => useBroadcastForm());
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('saveAsDraft', () => {
    it('creates broadcast with draft status and shows success toast', async () => {
      mockBroadcastApi.createBroadcast = jest.fn().mockResolvedValue({ data: mockBroadcast });

      const { result } = renderHook(() => useBroadcastForm());

      await act(async () => {
        await result.current.saveAsDraft(broadcastData);
      });

      expect(mockBroadcastApi.createBroadcast).toHaveBeenCalledWith({
        ...broadcastData,
        status: 'draft',
        scheduled_for: null,
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'broadcast.toast.success' }));
      expect(result.current.isSubmitting).toBe(false);
    });

    it('shows error toast and re-throws on failure', async () => {
      mockBroadcastApi.createBroadcast = jest.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useBroadcastForm());

      let caughtError: Error | undefined;
      await act(async () => {
        try { await result.current.saveAsDraft(broadcastData); }
        catch (e) { caughtError = e as Error; }
      });

      expect(caughtError?.message).toBe('Network error');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('updateDraft', () => {
    it('updates broadcast with draft status and shows success toast', async () => {
      mockBroadcastApi.updateBroadcast = jest.fn().mockResolvedValue({ data: mockBroadcast });

      const { result } = renderHook(() => useBroadcastForm());

      await act(async () => {
        await result.current.updateDraft('bc-1', broadcastData);
      });

      expect(mockBroadcastApi.updateBroadcast).toHaveBeenCalledWith('bc-1', {
        ...broadcastData,
        status: 'draft',
        scheduled_for: null,
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'broadcast.toast.success' }));
    });
  });

  describe('scheduleBroadcast', () => {
    it('creates broadcast with scheduled status and ISO date', async () => {
      mockBroadcastApi.createBroadcast = jest.fn().mockResolvedValue({ data: mockBroadcast });
      const scheduleDate = new Date('2024-06-01T10:00:00.000Z');

      const { result } = renderHook(() => useBroadcastForm());

      await act(async () => {
        await result.current.scheduleBroadcast(broadcastData, scheduleDate);
      });

      expect(mockBroadcastApi.createBroadcast).toHaveBeenCalledWith({
        ...broadcastData,
        status: 'scheduled',
        scheduled_for: scheduleDate.toISOString(),
      });
    });
  });

  describe('updateSchedule', () => {
    it('updates broadcast with scheduled status and new date', async () => {
      mockBroadcastApi.updateBroadcast = jest.fn().mockResolvedValue({ data: mockBroadcast });
      const scheduleDate = new Date('2024-06-01T10:00:00.000Z');

      const { result } = renderHook(() => useBroadcastForm());

      await act(async () => {
        await result.current.updateSchedule('bc-1', broadcastData, scheduleDate);
      });

      expect(mockBroadcastApi.updateBroadcast).toHaveBeenCalledWith('bc-1', {
        ...broadcastData,
        status: 'scheduled',
        scheduled_for: scheduleDate.toISOString(),
      });
    });
  });

  describe('sendNow', () => {
    it('creates broadcast then sends it', async () => {
      mockBroadcastApi.createBroadcast = jest.fn().mockResolvedValue({ data: mockBroadcast });
      mockBroadcastApi.sendBroadcast = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useBroadcastForm());

      await act(async () => {
        await result.current.sendNow(broadcastData);
      });

      expect(mockBroadcastApi.createBroadcast).toHaveBeenCalledWith(broadcastData);
      expect(mockBroadcastApi.sendBroadcast).toHaveBeenCalledWith('bc-1');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'broadcast.toast.success' }));
    });

    it('shows error toast if sendBroadcast fails', async () => {
      mockBroadcastApi.createBroadcast = jest.fn().mockResolvedValue({ data: mockBroadcast });
      mockBroadcastApi.sendBroadcast = jest.fn().mockRejectedValue(new Error('Send failed'));

      const { result } = renderHook(() => useBroadcastForm());

      let caughtError: Error | undefined;
      await act(async () => {
        try { await result.current.sendNow(broadcastData); }
        catch (e) { caughtError = e as Error; }
      });

      expect(caughtError?.message).toBe('Send failed');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });

  describe('updateAndSend', () => {
    it('updates broadcast then sends it', async () => {
      mockBroadcastApi.updateBroadcast = jest.fn().mockResolvedValue({ data: mockBroadcast });
      mockBroadcastApi.sendBroadcast = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useBroadcastForm());

      await act(async () => {
        await result.current.updateAndSend('bc-1', broadcastData);
      });

      expect(mockBroadcastApi.updateBroadcast).toHaveBeenCalledWith('bc-1', broadcastData);
      expect(mockBroadcastApi.sendBroadcast).toHaveBeenCalledWith('bc-1');
    });
  });
});
