import { apiRequest } from "./queryClient";

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  isAdmin: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  twoFactorRequired?: boolean;
}

// Token management
const TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export const tokenManager = {
  getAccessToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },
  
  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  
  setTokens: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  
  clearTokens: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

// Enhanced API request function with JWT auth
const authenticatedApiRequest = async (method: string, url: string, data?: any) => {
  const accessToken = tokenManager.getAccessToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(errorData.message || 'Request failed');
  }
  
  return response;
};

export const authApi = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(errorData.message || 'Login failed');
    }
    
    const result = await response.json();
    
    // Store tokens if provided
    if (result.tokens) {
      tokenManager.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
    }
    
    return result;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(errorData.message || 'Registration failed');
    }
    
    const result = await response.json();
    
    // Store tokens if provided
    if (result.tokens) {
      tokenManager.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
    }
    
    return result;
  },

  logout: async (): Promise<void> => {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        await authenticatedApiRequest('POST', '/api/v1/auth/logout', { refreshToken });
      }
    } catch (error) {
      // Ignore logout errors and clear tokens anyway
      console.warn('Logout request failed:', error);
    } finally {
      tokenManager.clearTokens();
    }
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await authenticatedApiRequest('GET', '/api/v1/auth/me');
    return response.json();
  },
  
  // Additional auth methods for enhanced functionality
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await fetch('/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Password reset failed' }));
      throw new Error(errorData.message || 'Password reset failed');
    }
    
    return response.json();
  },
  
  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await fetch('/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Password reset failed' }));
      throw new Error(errorData.message || 'Password reset failed');
    }
    
    return response.json();
  },
  
  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const response = await fetch('/api/v1/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Email verification failed' }));
      throw new Error(errorData.message || 'Email verification failed');
    }
    
    return response.json();
  }
};
