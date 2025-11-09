import { useAuth } from "@/contexts/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Hook to get consistent tab bar padding for screens
 * Returns the total bottom padding needed to prevent content from going under the tab bar
 */
export function useTabBarPadding() {
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 75; 
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 20;

  const labelHeight = 22;
  const extraSpacing = 20;

  const tabBarPadding = isAuthenticated
    ? tabBarHeight + bottomPadding + labelHeight + extraSpacing
    : insets.bottom + 20;

  return {
    tabBarHeight: tabBarHeight + labelHeight,
    bottomPadding,
    tabBarPadding,
    isAuthenticated,
  };
}
