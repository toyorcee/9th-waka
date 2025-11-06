import {
  fetchCurrentUser,
  getStoredToken,
  loginUser,
  registerUser,
  removeToken,
  storeToken,
  User,
} from "@/services/authApi";
import { registerForPushNotificationsAsync } from "@/services/notificationService";
import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkAuthStatus: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    role?: "customer" | "rider",
    vehicleType?: "motorcycle" | "car"
  ) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (token: string, user: User) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await getStoredToken();
      if (token) {
        try {
          const me = await fetchCurrentUser();
          const u = me?.user || me;
          if (u?.id || u?._id) {
            setUser({
              id: String(u.id || u._id),
              email: u.email,
              profilePicture: u.profilePicture ?? null,
              role: u.role,
              fullName: u.fullName ?? null,
              phoneNumber: u.phoneNumber ?? null,
              vehicleType: u.vehicleType ?? null,
            });
            registerForPushNotificationsAsync().catch((err) =>
              console.warn("Failed to register push notifications:", err)
            );
          }
        } catch (e) {
          console.error("/auth/me failed", e);
        }
      } else {
        console.log("No token found");
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await loginUser({ email, password });
      await storeToken(response.token);
      setUser(response.user);
      console.log("✅ Login successful");
      // Register for push notifications after login
      registerForPushNotificationsAsync().catch((err) =>
        console.warn("Failed to register push notifications:", err)
      );
    } catch (error: any) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    role?: "customer" | "rider",
    vehicleType?: "motorcycle" | "car"
  ) => {
    try {
      const response = await registerUser({
        email,
        password,
        role: role || "customer",
        ...(vehicleType ? { vehicleType } : {}),
      });

      console.log("✅ Registration successful (verification required)");
    } catch (error: any) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await removeToken();
      setUser(null);
      console.log("✅ Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const verifyEmail = async (token: string, user: User) => {
    try {
      await storeToken(token);
      setUser(user);
      console.log("✅ Email verified and user logged in");
      registerForPushNotificationsAsync().catch((err) =>
        console.warn("Failed to register push notifications:", err)
      );
    } catch (error) {
      console.error("Error completing verification:", error);
      throw error;
    }
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return prevUser;
      return { ...prevUser, ...updates };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        checkAuthStatus,
        login,
        register,
        logout,
        verifyEmail,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
