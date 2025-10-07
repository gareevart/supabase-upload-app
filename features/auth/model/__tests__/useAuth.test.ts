import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { AuthService } from '../../../../shared/lib/auth';

// Mock the auth service
jest.mock('../../../../shared/lib/auth');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should set user when authentication succeeds', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'admin' as const,
    };

    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle authentication failure', async () => {
    mockAuthService.getCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should check user roles correctly', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'admin' as const,
    };

    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.hasRole(['admin'])).toBe(true);
    expect(result.current.hasRole(['editor'])).toBe(false);
    expect(result.current.isAdmin()).toBe(true);
    expect(result.current.isEditor()).toBe(true);
    expect(result.current.canAccessBroadcasts()).toBe(true);
  });

  it('should handle sign out', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'admin' as const,
    };

    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
    mockAuthService.signOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockAuthService.signOut).toHaveBeenCalled();
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });
});
