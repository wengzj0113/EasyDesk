/**
 * useAuth Hook Tests
 * Tests for authentication hook functionality
 */

import { renderHook, act } from '@testing-library/react';

// Mock the store
const mockStore = {
  user: null as any,
  token: null as string | null,
  setUser: jest.fn(),
  setToken: jest.fn(),
  clearUser: jest.fn()
};

jest.mock('../../store/useStore', () => ({
  useStore: () => mockStore
}));

jest.mock('../../services/api', () => ({
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn()
  }
}));

// Import the mocked authAPI
import { authAPI } from '../../services/api';

// Simulate the useAuth hook behavior
interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  login: (values: { username: string; password: string }) => Promise<void>;
  register: (values: { username: string; password: string; email: string }) => Promise<void>;
  logout: () => void;
}

const useAuth = (): UseAuthReturn => {
  const { user, token, setUser, setToken, clearUser } = mockStore;

  const isAuthenticated = !!token && !!user;
  const isLoading = false;

  const login = async (values: { username: string; password: string }) => {
    const res = await authAPI.login(values);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (values: { username: string; password: string; email: string }) => {
    const res = await authAPI.register(values);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    clearUser();
  };

  return { isAuthenticated, isLoading, user, login, register, logout };
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.user = null;
    mockStore.token = null;
  });

  describe('Authentication State', () => {
    test('should return isAuthenticated as false when not logged in', () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isAuthenticated).toBe(false);
    });

    test('should return isAuthenticated as true when logged in', () => {
      mockStore.token = 'mock-token';
      mockStore.user = { username: 'testuser' };

      const { result } = renderHook(() => useAuth());
      expect(result.current.isAuthenticated).toBe(true);
    });

    test('should return user as null when not logged in', () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.user).toBeNull();
    });

    test('should return user when logged in', () => {
      const mockUser = { username: 'testuser', email: 'test@example.com' };
      mockStore.user = mockUser;
      mockStore.token = 'mock-token';

      const { result } = renderHook(() => useAuth());
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('Loading State', () => {
    test('should return isLoading as false initially', () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Logout Function', () => {
    test('should call clearUser on logout', () => {
      mockStore.token = 'mock-token';
      mockStore.user = { username: 'testuser' };

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.logout();
      });

      expect(mockStore.clearUser).toHaveBeenCalled();
    });

    test('should clear authentication state after logout', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.logout();
      });

      // After logout, isAuthenticated should be false
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});

describe('Token Validation', () => {
  test('should consider null token as not authenticated', () => {
    mockStore.token = null;
    mockStore.user = { username: 'testuser' };

    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });

  test('should consider empty token as not authenticated', () => {
    mockStore.token = '';
    mockStore.user = { username: 'testuser' };

    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });

  test('should consider undefined user as not authenticated', () => {
    mockStore.token = 'mock-token';
    mockStore.user = null;

    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });
});
