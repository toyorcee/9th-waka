// Shared storage utility for React Native
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "authToken";
const THEME_KEY = "themeMode";

export const storage = {
  // Get token from storage
  getToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  },

  // Store token
  setToken: async (token: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error("Error storing token:", error);
    }
  },

  // Remove token (logout)
  removeToken: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error("Error removing token:", error);
    }
  },

  // Get theme preference
  getTheme: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(THEME_KEY);
    } catch (error) {
      console.error("Error getting theme:", error);
      return null;
    }
  },

  // Store theme preference
  setTheme: async (theme: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      console.error("Error storing theme:", error);
    }
  },
};
