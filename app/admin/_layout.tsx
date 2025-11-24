import { useTheme } from "@/contexts/ThemeContext";
import { Stack } from "expo-router";

export default function AdminLayout() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Stack
      screenOptions={{
        headerShown: false, // Custom headers in each page
        contentStyle: {
          backgroundColor: isDark ? "#000000" : "#FFFFFF",
        },
      }}
    />
  );
}
