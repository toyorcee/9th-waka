/**
 * Theme-aware color utilities
 * Returns colors based on current theme
 */

export const getThemeColors = (theme: "light" | "dark") => {
  if (theme === "light") {
    return {
      primary: "#FFFFFF",
      secondary: "#F5F5F7",
      text: {
        100: "#000000",
        200: "#6E6E73",
        300: "#8E8E93",
        400: "#AEAEB2",
      },
      dark: {
        100: "#FFFFFF",
        200: "#F2F2F7",
        300: "#E5E5EA",
      },
      neutral: {
        100: "#C7C7CC",
        200: "#AEAEB2",
        300: "#8E8E93",
      },
    };
  }

  // Dark theme (default)
  return {
    primary: "#030014",
    secondary: "#1A234B",
    text: {
      100: "#FFFFFF",
      200: "#D6C6FF",
      300: "#A8B5DB",
      400: "#9CA4AB",
    },
    dark: {
      100: "#221F3D",
      200: "#0F0D23",
      300: "#151312",
    },
    neutral: {
      100: "#3A3A3C",
      200: "#48484A",
      300: "#636366",
    },
  };
};

