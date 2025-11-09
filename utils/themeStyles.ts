import { getThemeColors } from "./themeColors";

/**
 * Get theme-aware style objects for inline styles
 * Use this when you need precise control or can't use className
 */
export const getThemeStyles = (theme: "light" | "dark") => {
  const colors = getThemeColors(theme);
  const isDark = theme === "dark";

  return {
    screen: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    card: {
      backgroundColor: colors.dark[100],
      borderColor: colors.neutral[100],
      borderWidth: 1,
    },
    text: {
      primary: { color: colors.text[100] },
      secondary: { color: colors.text[200] },
      tertiary: { color: colors.text[300] },
      muted: { color: colors.text[400] },
    },
    background: {
      primary: { backgroundColor: colors.primary },
      secondary: { backgroundColor: colors.secondary },
      card: { backgroundColor: colors.dark[100] },
    },
    border: {
      default: { borderColor: colors.neutral[100] },
    },
  };
};
