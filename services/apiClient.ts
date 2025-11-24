import axios from "axios";
import Constants from "expo-constants";

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "http://localhost:3000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Logout callback registry - allows AuthContext to register logout function
let logoutCallback: (() => Promise<void>) | null = null;

export const registerLogoutCallback = (callback: () => Promise<void>) => {
  logoutCallback = callback;
};

export const clearLogoutCallback = () => {
  logoutCallback = null;
};

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const { storage } = await import("./storage");
      const token = await storage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - automatically logout
      console.warn(
        "Unauthorized (401) - Token expired or invalid. Logging out..."
      );

      try {
        // Clear token from storage
        const { storage } = await import("./storage");
        await storage.removeToken();

        // Trigger logout callback if registered (from AuthContext)
        if (logoutCallback) {
          await logoutCallback();
        }
      } catch (logoutError) {
        console.error("Error during automatic logout:", logoutError);
      }
    }
    return Promise.reject(error);
  }
);
