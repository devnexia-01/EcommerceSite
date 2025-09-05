import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, tokenManager, type User, type LoginData, type RegisterData, type AuthResponse } from "@/lib/auth";
import { useToast } from "./use-toast";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: authData, isLoading } = useQuery({
    queryKey: ["/api/v1/auth/me"],
    queryFn: () => authApi.getMe(),
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!tokenManager.getAccessToken() // Only run if we have a token
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data: AuthResponse) => {
      // Store the complete user data structure that getMe returns
      queryClient.setQueryData(["/api/v1/auth/me"], { user: data.user });
      // Invalidate all queries to refresh with new auth state
      queryClient.invalidateQueries();
      if (!data.twoFactorRequired) {
        toast({
          title: "Success",
          description: "Logged in successfully"
        });
      } else {
        toast({
          title: "2FA Required",
          description: "Please complete two-factor authentication",
          variant: "default"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive"
      });
    }
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data: AuthResponse) => {
      // Store the complete user data structure that getMe returns
      queryClient.setQueryData(["/api/v1/auth/me"], { user: data.user });
      // Invalidate all queries to refresh with new auth state
      queryClient.invalidateQueries();
      toast({
        title: "Success",
        description: data.user.emailVerified ? "Account created successfully" : "Account created! Please check your email to verify your account."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Registration failed",
        variant: "destructive"
      });
    }
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/v1/auth/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.clear(); // Clear all queries on logout
      toast({
        title: "Success",
        description: "Logged out successfully"
      });
    }
  });
  
  // Additional mutation hooks for enhanced functionality
  const forgotPasswordMutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password reset email sent. Please check your inbox."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email",
        variant: "destructive"
      });
    }
  });
  
  const resetPasswordMutation = useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) => 
      authApi.resetPassword(token, newPassword),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password reset successfully. You can now log in with your new password."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive"
      });
    }
  });
  
  const verifyEmailMutation = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: () => {
      // Refresh user data to show verified status
      queryClient.invalidateQueries({ queryKey: ["/api/v1/auth/me"] });
      toast({
        title: "Success",
        description: "Email verified successfully!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Email verification failed",
        variant: "destructive"
      });
    }
  });

  const value: AuthContextType = {
    user: authData?.user || null,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending || logoutMutation.isPending,
    login: async (data: LoginData) => {
      await loginMutation.mutateAsync(data);
    },
    register: async (data: RegisterData) => {
      await registerMutation.mutateAsync(data);
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
    isAuthenticated: !!authData?.user && !!tokenManager.getAccessToken(),
    forgotPassword: async (email: string) => {
      await forgotPasswordMutation.mutateAsync(email);
    },
    resetPassword: async (token: string, newPassword: string) => {
      await resetPasswordMutation.mutateAsync({ token, newPassword });
    },
    verifyEmail: async (token: string) => {
      await verifyEmailMutation.mutateAsync(token);
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
