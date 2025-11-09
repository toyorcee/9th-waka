import { useTheme } from "@/contexts/ThemeContext";
import { getThemeColors } from "@/utils/themeColors";
import React from "react";
import { View } from "react-native";

/**
 * Wrapper component that applies theme-aware styling
 * This ensures all child components have access to the current theme
 */
export const ThemeWrapper = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.primary,
      }}
    >
      {children}
    </View>
  );
};
