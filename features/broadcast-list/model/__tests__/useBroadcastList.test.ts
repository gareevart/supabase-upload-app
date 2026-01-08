import { renderHook, waitFor, act } from '@testing-library/react';
import { useBroadcastList } from '../useBroadcastList';
import { BroadcastApi } from '@/shared/api/broadcast';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/shared/api/broadcast');
jest.mock('@/hooks/use-toast');

const mockToast = jest.fn();
const mockBroadcastApi = BroadcastApi as jest.Mocked<typeof BroadcastApi>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('useBroadcastList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({ toast: mockToast } as any);

    // Default mock implementation
    mockBroadcastApi.getBroadcasts = jest.fn().mockResolvedValue({
      data: [],
      count: 0,
      pagination: { offset: 0, limit: 10, hasMore: false }
    });
  });

  describe('Initial state', () => {
    it('should initialize with loading state', async () => {
      mockBroadcastApi.getBroadcasts.mockResolvedValue({
        data: [],
        count: 0,
        pagination: { offset: 0, limit: 10, hasMore: false }
      });

      const { result } = renderHook(() => useBroadcastList());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.broadcasts).toEqual([]);
      expect(result.current.error).toBeNull();

      // Wait for the mount fetch to complete to avoid act() warning
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Fetching broadcasts', () => {
    it('should fetch broadcasts successfully', async () => {
      const mockBroadcasts = [
        {
          id: '1',
          subject: 'Test Broadcast',
          content: { text: 'Test content' },
          content_html: '<p>Test content</p>',
          status: 'draft' as const,
          scheduled_for: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          user_id: 'user-1',
          sent_at: null,
          broadcast_id: null,
          recipients: ['test@example.com'],
          total_recipients: 1,
          opened_count: 0,
          clicked_count: 0
        }
      ];

      mockBroadcastApi.getBroadcasts.mockResolvedValue({
        data: mockBroadcasts,
        count: 1,
        pagination: { offset: 0, limit: 10, hasMore: false }
      });

      const { result } = renderHook(() => useBroadcastList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.broadcasts).toEqual(mockBroadcasts);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Failed to fetch broadcasts';
      mockBroadcastApi.getBroadcasts.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useBroadcastList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.broadcasts).toEqual([]);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    });
  });

  describe('Filtering', () => {
    it('should apply filters', async () => {
      mockBroadcastApi.getBroadcasts.mockResolvedValue({
        data: [],
        count: 0,
        pagination: { offset: 0, limit: 10, hasMore: false }
      });

      const { result } = renderHook(() => useBroadcastList({ status: 'sent' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockBroadcastApi.getBroadcasts).toHaveBeenCalledWith({ status: 'sent' });
    });

    it('should update filters', async () => {
      mockBroadcastApi.getBroadcasts.mockResolvedValue({
        data: [],
        count: 0,
        pagination: { offset: 0, limit: 10, hasMore: false }
      });

      const { result } = renderHook(() => useBroadcastList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.updateFilters({ status: 'draft' });

      await waitFor(() => {
        expect(mockBroadcastApi.getBroadcasts).toHaveBeenCalledWith({ status: 'draft' });
      });
    });
  });

  describe('Delete broadcast', () => {
    it('should delete broadcast successfully', async () => {
      const mockBroadcasts = [
        {
          id: '1',
          subject: 'Test 1',
          content: { text: 'Content 1' },
          content_html: '<p>Content 1</p>',
          status: 'draft' as const,
          scheduled_for: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          user_id: 'user-1',
          sent_at: null,
          broadcast_id: null,
          recipients: ['test@example.com'],
          total_recipients: 1,
          opened_count: 0,
          clicked_count: 0
        },
        {
          id: '2',
          subject: 'Test 2',
          content: { text: 'Content 2' },
          content_html: '<p>Content 2</p>',
          status: 'draft' as const,
          scheduled_for: null,
          created_at: '2024-01-02',
          updated_at: '2024-01-02',
          user_id: 'user-1',
          sent_at: null,
          broadcast_id: null,
          recipients: ['test2@example.com'],
          total_recipients: 1,
          opened_count: 0,
          clicked_count: 0
        }
      ];

      mockBroadcastApi.getBroadcasts.mockResolvedValue({
        data: mockBroadcasts,
        count: 2,
        pagination: { offset: 0, limit: 10, hasMore: false }
      });

      mockBroadcastApi.deleteBroadcast.mockResolvedValue();

      const { result } = renderHook(() => useBroadcastList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteBroadcast('1');
      });

      await waitFor(() => {
        expect(result.current.broadcasts).toHaveLength(1);
      });
      expect(result.current.broadcasts[0].id).toBe('2');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Broadcast deleted successfully',
      });
    });

    it('should handle delete error', async () => {
      mockBroadcastApi.getBroadcasts.mockResolvedValue({
        data: [],
        count: 0,
        pagination: { offset: 0, limit: 10, hasMore: false }
      });

      const errorMessage = 'Failed to delete';
      mockBroadcastApi.deleteBroadcast.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useBroadcastList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.deleteBroadcast('1');

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    });
  });

  describe('Send broadcast', () => {
    it('should send broadcast successfully', async () => {
      const mockBroadcasts = [
        {
          id: '1',
          subject: 'Test',
          content: { text: 'Content' },
          content_html: '<p>Content</p>',
          status: 'draft' as const,
          scheduled_for: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          user_id: 'user-1',
          sent_at: null,
          broadcast_id: null,
          recipients: ['test@example.com'],
          total_recipients: 1,
          opened_count: 0,
          clicked_count: 0
        }
      ];

      mockBroadcastApi.getBroadcasts.mockResolvedValue({
        data: mockBroadcasts,
        count: 1,
        pagination: { offset: 0, limit: 10, hasMore: false }
      });

      mockBroadcastApi.sendBroadcast.mockResolvedValue();

      const { result } = renderHook(() => useBroadcastList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.sendBroadcast('1');
      });

      await waitFor(() => {
        expect(result.current.broadcasts[0].status).toBe('sent');
      });
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Broadcast sent successfully',
      });
    });
  });

  describe('Cancel schedule', () => {
    it('should cancel schedule successfully', async () => {
      const mockBroadcasts = [
        {
          id: '1',
          subject: 'Test',
          content: { text: 'Content' },
          content_html: '<p>Content</p>',
          status: 'scheduled' as const,
          scheduled_for: '2024-12-31',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          user_id: 'user-1',
          sent_at: null,
          broadcast_id: null,
          recipients: ['test@example.com'],
          total_recipients: 1,
          opened_count: 0,
          clicked_count: 0
        }
      ];

      mockBroadcastApi.getBroadcasts.mockResolvedValue({
        data: mockBroadcasts,
        count: 1,
        pagination: { offset: 0, limit: 10, hasMore: false }
      });

      mockBroadcastApi.cancelSchedule.mockResolvedValue();

      const { result } = renderHook(() => useBroadcastList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.cancelSchedule('1');
      });

      await waitFor(() => {
        expect(result.current.broadcasts[0].status).toBe('draft');
      });
      expect(result.current.broadcasts[0].scheduled_for).toBeNull();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Broadcast schedule cancelled',
      });
    });
  });

  describe('Refresh', () => {
    it('should refresh broadcasts', async () => {
      mockBroadcastApi.getBroadcasts.mockResolvedValue({
        data: [],
        count: 0,
        pagination: { offset: 0, limit: 10, hasMore: false }
      });

      const { result } = renderHook(() => useBroadcastList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      result.current.refresh();

      await waitFor(() => {
        expect(mockBroadcastApi.getBroadcasts).toHaveBeenCalled();
      });
    });
  });
});