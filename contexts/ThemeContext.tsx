import { storage } from "@/services/storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: "light" | "dark";
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await storage.getTheme();
        if (savedTheme) {
          setThemeModeState(savedTheme as ThemeMode);
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      }
    };
    loadTheme();
  }, []);

  // Update theme based on mode
  useEffect(() => {
    if (themeMode === "system") {
      setTheme(systemColorScheme === "dark" ? "dark" : "light");
    } else {
      setTheme(themeMode);
    }
  }, [themeMode, systemColorScheme]);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await storage.setTheme(mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const toggleTheme = async () => {
    const newMode = theme === "dark" ? "light" : "dark";
    await setThemeMode(newMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

