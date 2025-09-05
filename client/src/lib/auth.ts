import { apiRequest } from "./queryClient";

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isAdmin: boolean;
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
  phone?: string;
}

export const authApi = {
  login: async (data: LoginData): Promise<{ user: User }> => {
    const response = await apiRequest("POST", "/api/auth/login", data);
    return response.json();
  },

  register: async (data: RegisterData): Promise<{ user: User }> => {
    const response = await apiRequest("POST", "/api/auth/register", data);
    return response.json();
  },

  logout: async (): Promise<void> => {
    await apiRequest("POST", "/api/auth/logout");
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  }
};
