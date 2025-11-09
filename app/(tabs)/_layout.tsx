import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Tabs, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TabIcon = ({
  focused,
  IconComp,
  name,
  size = 22,
  isDark,
}: {
  focused: boolean;
  IconComp: any;
  name: string;
  size?: number;
  isDark: boolean;
}) => (
  <View className="items-center justify-center">
    {focused ? (
      <View
        className="rounded-full items-center justify-center"
        style={{
          width: 48,
          height: 48,
          backgroundColor: isDark ? "#AB8BFF" : "#AB8BFF",
        }}
      >
        <IconComp
          name={name as any}
          size={size}
          color={isDark ? "#030014" : "#FFFFFF"}
        />
      </View>
    ) : (
      <IconComp
        name={name as any}
        size={size}
        color={isDark ? "#9CA4AB" : "#6E6E73"}
      />
    )}
  </View>
);

export default function TabsLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const userRole = user?.role || "customer";
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const tabBarHeight = 75;
  const labelHeight = 22;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 20;

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !user.termsAccepted) {
      const currentRoute = segments[0];
      if (currentRoute !== "accept-terms") {
        router.replace("/accept-terms");
      }
    }
  }, [isLoading, isAuthenticated, user, segments, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 8,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 6,
        },
        tabBarStyle: isAuthenticated
          ? {
              backgroundColor: isDark ? "#030014" : "#FFFFFF",
              borderTopLeftRadius: 25,
              borderTopRightRadius: 25,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              marginBottom: 0,
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              overflow: "hidden",
              borderTopWidth: 1,
              borderLeftWidth: 0,
              borderRightWidth: 0,
              borderBottomWidth: 0,
              borderColor: isDark ? "#3A3A3C" : "#E5E5EA",
              height: tabBarHeight + bottomPadding + labelHeight,
              paddingBottom: bottomPadding,
              paddingTop: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: isDark ? 0.3 : 0.1,
              shadowRadius: 8,
              elevation: 8,
              zIndex: 1000,
            }
          : { display: "none", height: 0 },
        tabBarActiveTintColor: isDark ? "#AB8BFF" : "#AB8BFF",
        tabBarInactiveTintColor: isDark ? "#9CA4AB" : "#6E6E73",
      }}
    >
      {/* Core Tab - Home (All Users) */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon
              focused={focused}
              IconComp={Icons.navigation}
              name={IconNames.homeOutline}
              isDark={isDark}
            />
          ),
        }}
      />

      {/* Customer-specific tabs (shown when role is customer; hidden otherwise) */}
      <Tabs.Screen
        name="orders"
        options={{
          title: "My Orders",
          href: userRole === "customer" ? undefined : null,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon
              focused={focused}
              IconComp={Icons.package}
              name={MCIconNames.packageVariant}
              isDark={isDark}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          title: "Track",
          href: userRole === "customer" ? undefined : null,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon
              focused={focused}
              IconComp={Icons.map}
              name={IconNames.mapOutline}
              isDark={isDark}
            />
          ),
        }}
      />

      {/* Rider-specific tabs (shown when role is rider; hidden otherwise) */}
      <Tabs.Screen
        name="deliveries"
        options={{
          title: "Deliveries",
          href: userRole === "rider" ? undefined : null,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon
              focused={focused}
              IconComp={Icons.delivery}
              name={MCIconNames.delivery}
              isDark={isDark}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          href: userRole === "rider" ? undefined : null,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon
              focused={focused}
              IconComp={Icons.money}
              name={MCIconNames.cash}
              isDark={isDark}
            />
          ),
        }}
      />

      {/* Core Tab - Messages (All Users) - Always visible */}
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          href: undefined,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon
              focused={focused}
              IconComp={Icons.communication}
              name={IconNames.chatbubbleOutline}
              isDark={isDark}
            />
          ),
        }}
      />

      {/* Core Tab - Profile (All Users) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon
              focused={focused}
              IconComp={Icons.user}
              name={IconNames.personOutline}
              isDark={isDark}
            />
          ),
        }}
      />
    </Tabs>
  );
}
