import { storage } from "@/services/storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useColorScheme } from "react-native";

export type ThemeMode = "light" | "dark" | "system" | "auto";

interface ThemeContextType {
  theme: "light" | "dark";
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  autoThemeEnabled: boolean;
  setAutoThemeEnabled: (enabled: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [autoThemeEnabled, setAutoThemeEnabledState] = useState<boolean>(false);
  const timeCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // Get Nigerian time (WAT - UTC+1)
  const getNigerianTime = () => {
    const now = new Date();
    // Get UTC time and add 1 hour for Nigerian time (UTC+1)
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    // Add 1 hour for Nigerian time
    let nigerianHours = utcHours + 1;
    if (nigerianHours >= 24) {
      nigerianHours -= 24;
    }
    return {
      hours: nigerianHours,
      minutes: utcMinutes,
    };
  };

  // Check time and switch theme if auto mode is enabled
  const checkAndUpdateAutoTheme = useCallback(() => {
    if (themeMode !== "auto" || !autoThemeEnabled) return;

    const { hours, minutes } = getNigerianTime();
    const currentTimeMinutes = hours * 60 + minutes;

    // Light theme: 7:30 AM (7 * 60 + 30 = 450 minutes)
    // Dark theme: 6:30 PM (18 * 60 + 30 = 1110 minutes)
    const lightThemeTime = 7 * 60 + 30; // 7:30 AM
    const darkThemeTime = 18 * 60 + 30; // 6:30 PM

    let shouldBeLight = false;
    if (
      currentTimeMinutes >= lightThemeTime &&
      currentTimeMinutes < darkThemeTime
    ) {
      shouldBeLight = true;
    }

    setTheme((currentTheme) => {
      if (shouldBeLight && currentTheme !== "light") {
        return "light";
      } else if (!shouldBeLight && currentTheme !== "dark") {
        return "dark";
      }
      return currentTheme;
    });
  }, [themeMode, autoThemeEnabled]);

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await storage.getTheme();
        const savedAutoTheme = await storage.getAutoTheme();

        if (savedTheme) {
          const mode = savedTheme as ThemeMode;
          setThemeModeState(mode);

          // If auto mode, enable auto theme
          if (mode === "auto") {
            setAutoThemeEnabledState(savedAutoTheme !== "false");
          }
        } else {
          // Default to dark if no saved theme
          setThemeModeState("dark");
        }
      } catch (error) {
        console.error("Error loading theme:", error);
        // Default to dark on error
        setThemeModeState("dark");
      }
    };
    loadTheme();
  }, []);

  // Update theme based on mode
  useEffect(() => {
    // Clear any existing interval
    if (timeCheckIntervalRef.current) {
      clearInterval(timeCheckIntervalRef.current);
      timeCheckIntervalRef.current = null;
    }

    if (themeMode === "system") {
      setTheme(systemColorScheme === "dark" ? "dark" : "light");
    } else if (themeMode === "auto") {
      // Check immediately
      checkAndUpdateAutoTheme();

      // Set up interval to check every minute if auto theme is enabled
      if (autoThemeEnabled) {
        timeCheckIntervalRef.current = setInterval(() => {
          checkAndUpdateAutoTheme();
        }, 60000); // Check every minute

        return () => {
          if (timeCheckIntervalRef.current) {
            clearInterval(timeCheckIntervalRef.current);
            timeCheckIntervalRef.current = null;
          }
        };
      }
    } else {
      setTheme(themeMode);
    }
  }, [themeMode, systemColorScheme, autoThemeEnabled, checkAndUpdateAutoTheme]);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await storage.setTheme(mode);
      setThemeModeState(mode);

      // If switching to auto mode, enable auto theme
      if (mode === "auto") {
        await setAutoThemeEnabled(true);
      }
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const setAutoThemeEnabled = async (enabled: boolean) => {
    try {
      await storage.setAutoTheme(enabled ? "true" : "false");
      setAutoThemeEnabledState(enabled);

      // If enabling auto theme, switch mode to auto
      if (enabled && themeMode !== "auto") {
        await setThemeMode("auto");
      }

      // Immediately check and update theme
      if (enabled) {
        checkAndUpdateAutoTheme();
      }
    } catch (error) {
      console.error("Error saving auto theme setting:", error);
    }
  };

  const toggleTheme = async () => {
    // If in auto mode, disable it first
    if (themeMode === "auto") {
      const newMode = theme === "dark" ? "light" : "dark";
      await setThemeMode(newMode);
      await setAutoThemeEnabled(false);
    } else {
      const newMode = theme === "dark" ? "light" : "dark";
      await setThemeMode(newMode);
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (timeCheckIntervalRef.current) {
        clearInterval(timeCheckIntervalRef.current);
      }
    };
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setThemeMode,
        toggleTheme,
        autoThemeEnabled,
        setAutoThemeEnabled,
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
