import { useTheme } from "@/contexts/ThemeContext";
import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

interface RobotIconProps {
  size?: number;
  color?: string;
  helpBubble?: boolean;
}

export default function RobotIcon({
  size = 40,
  color,
  helpBubble = true,
}: RobotIconProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Theme-aware colors
  const iconColor = color || (isDark ? "#30D158" : "#30D158");
  const bubbleBg = isDark ? "#FF69B4" : "#FFB6C1";
  const bubbleText = isDark ? "#FFFFFF" : "#FFFFFF";

  return (
    <View
      style={{
        position: "relative",
        width: size,
        height: size + (helpBubble ? 16 : 0),
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 40 40">
        {/* Main rounded square body */}
        <Rect
          x="8"
          y="10"
          width="24"
          height="24"
          rx="4"
          fill="none"
          stroke={iconColor}
          strokeWidth="2.5"
        />
        {/* Smile */}
        <Path
          d="M 14 24 Q 20 28 26 24"
          fill="none"
          stroke={iconColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Left handle/ear */}
        <Circle
          cx="6"
          cy="18"
          r="3"
          fill="none"
          stroke={iconColor}
          strokeWidth="2.5"
        />
        {/* Right handle/ear */}
        <Circle
          cx="34"
          cy="18"
          r="3"
          fill="none"
          stroke={iconColor}
          strokeWidth="2.5"
        />
      </Svg>
      {/* HELP label - positioned above the icon */}
      {helpBubble && (
        <View
          style={{
            position: "absolute",
            top: -14,
            left: 0,
            backgroundColor: bubbleBg,
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 3,
            minWidth: 36,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: bubbleText,
              fontSize: 9,
              fontWeight: "bold",
              letterSpacing: 0.5,
            }}
          >
            HELP
          </Text>
        </View>
      )}
    </View>
  );
}
