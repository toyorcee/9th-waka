import { apiClient } from "./apiClient";
import { storage } from "./storage";

export interface User {
  id: string;
  email: string;
  profilePicture?: string | null;
  role?: "customer" | "rider" | "admin";
  fullName?: string | null;
  phoneNumber?: string | null;
  vehicleType?: "motorcycle" | "car" | null;
  nin?: string | null;
  bvn?: string | null;
  defaultAddress?: string | null;
  address?: string | null;
  driverLicenseNumber?: string | null;
  driverLicensePicture?: string | null;
  driverLicenseVerified?: boolean;
  vehiclePicture?: string | null;
  ninVerified?: boolean;
  bvnVerified?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface VerifyPayload {
  email: string;
  code: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  role?: "customer" | "rider";
  vehicleType?: "motorcycle" | "car";
}

export const registerUser = async (
  credentials: RegisterCredentials
): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post("/auth/register", credentials);
    return response.data;
  } catch (error: any) {
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      throw new Error(
        "Request timed out. Please check your connection and try again."
      );
    }
    if (error.code === "ERR_NETWORK" || !error.response) {
      throw new Error("Network error. Please check your internet connection.");
    }
    const errorMessage =
      error.response?.data?.error || error.message || "Registration failed";
    throw new Error(errorMessage);
  }
};

export const loginUser = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post("/auth/login", credentials);
    return response.data;
  } catch (error: any) {
    // Handle network errors
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      throw new Error(
        "Request timed out. Please check your connection and try again."
      );
    }
    if (error.code === "ERR_NETWORK" || !error.response) {
      throw new Error("Network error. Please check your internet connection.");
    }
    // Handle API errors
    const errorMessage =
      error.response?.data?.error || error.message || "Login failed";
    throw new Error(errorMessage);
  }
};

export const verifyEmailCode = async (
  payload: VerifyPayload
): Promise<AuthResponse> => {
  const response = await apiClient.post("/auth/verify", payload);
  return response.data;
};

export const resendVerification = async (email: string) => {
  const response = await apiClient.post("/auth/resend-verification", { email });
  return response.data;
};

export const getStoredToken = storage.getToken;
export const storeToken = storage.setToken;
export const removeToken = storage.removeToken;

export const fetchCurrentUser = async () => {
  const response = await apiClient.get("/auth/me");
  return response.data;
};
