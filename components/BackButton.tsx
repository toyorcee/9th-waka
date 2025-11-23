import { IconNames, Icons } from "@/constants/icons";
import { useTheme } from "@/contexts/ThemeContext";
import { Routes } from "@/services/navigationHelper";
import { useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";

interface BackButtonProps {
  /**
   * Fallback route when there's no navigation history
   * Defaults to home page
   */
  fallbackRoute?: string;
  /**
   * Custom onPress handler (overrides default navigation)
   */
  onPress?: () => void;
  /**
   * Custom icon size
   */
  size?: number;
  /**
   * Custom icon color
   */
  color?: string;
  /**
   * Additional className for styling
   */
  className?: string;
}

/**
 * Reusable BackButton component
 * Safely navigates to previous screen or fallback route
 * Handles navigation context errors gracefully
 */
export default function BackButton({
  fallbackRoute = Routes.tabs.home,
  onPress,
  size = 24,
  className = "",
}: BackButtonProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handlePress = () => {
    // If custom onPress is provided, use it
    if (onPress) {
      onPress();
      return;
    }

    // Check if router is available and ready
    if (!router) {
      console.warn("BackButton: Router not available");
      return;
    }

    try {
      if (typeof router.canGoBack === "function" && router.canGoBack()) {
        if (typeof router.back === "function") {
          router.back();
        } else {
          if (typeof router.replace === "function") {
            router.replace(fallbackRoute as any);
          }
        }
      } else {
        // No history, go to fallback route
        if (typeof router.replace === "function") {
          router.replace(fallbackRoute as any);
        }
      }
    } catch (error) {
      console.warn("BackButton: Navigation error", error);
      try {
        if (typeof router.replace === "function") {
          router.replace(fallbackRoute as any);
        }
      } catch (fallbackError) {
        console.error("BackButton: Fallback navigation failed", fallbackError);
      }
    }
  };

  const iconColor = isDark ? "#E6E6F0" : "#000000";

  return (
    <TouchableOpacity
      onPress={handlePress}
      className={`w-10 h-10 items-center justify-center ${className}`}
      activeOpacity={0.7}
    >
      <Icons.navigation
        name={IconNames.arrowBack as any}
        size={size}
        color={iconColor}
      />
    </TouchableOpacity>
  );
}
