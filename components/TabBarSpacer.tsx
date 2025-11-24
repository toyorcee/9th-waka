import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * TabBarSpacer - A component that provides the same height as the tab bar
 * but without icons, used on profile-related pages to maintain consistent spacing
 */
export default function TabBarSpacer() {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  if (!isAuthenticated) return null;

  const tabBarHeight = 30;
  const labelHeight = 12;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 20;
  const totalHeight = tabBarHeight + bottomPadding + labelHeight;

  return (
    <View
      style={{
        height: totalHeight,
        backgroundColor: isDark ? "#000000" : "#FFFFFF",
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        borderTopWidth: 1,
        borderTopColor: isDark ? "#3A3A3C" : "#E5E5EA",
        paddingBottom: bottomPadding,
        paddingTop: 8, // Reduced from 10
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 8,
        elevation: 8,
      }}
    />
  );
}
