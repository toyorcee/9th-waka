import { useTheme } from "@/contexts/ThemeContext";

/**
 * Hook that returns theme-aware class names
 * This makes it easier to apply theme-aware styling without conditional logic everywhere
 */
export function useThemeClasses() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return {
    // Backgrounds
    bgPrimary: isDark ? "bg-primary" : "bg-white",
    bgSecondary: isDark ? "bg-secondary" : "bg-gray-50",
    bgCard: isDark ? "bg-dark-100" : "bg-white",

    // Text colors
    textPrimary: isDark ? "text-light-100" : "text-black",
    textSecondary: isDark ? "text-light-200" : "text-gray-600",
    textTertiary: isDark ? "text-light-300" : "text-gray-500",
    textMuted: isDark ? "text-light-400" : "text-gray-400",

    // Borders
    borderColor: isDark ? "border-neutral-100" : "border-gray-200",

    // Combined common patterns
    card: isDark
      ? "bg-secondary border border-neutral-100"
      : "bg-white border border-gray-200",

    screen: isDark ? "flex-1 bg-primary" : "flex-1 bg-white",
  };
}
