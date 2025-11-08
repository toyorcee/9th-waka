import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TabIcon = ({
  focused,
  IconComp,
  name,
  size = 22,
}: {
  focused: boolean;
  IconComp: any;
  name: string;
  size?: number;
}) => (
  <View className="items-center justify-center">
    <IconComp
      name={name as any}
      size={size}
      color={focused ? "#AB8BFF" : "#9CA4AB"}
    />
  </View>
);

export default function TabsLayout() {
  const { user, isAuthenticated } = useAuth();
  const userRole = user?.role || "customer";
  const insets = useSafeAreaInsets();
  const tabBarHeight = 65;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 20;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 8,
        },
        tabBarStyle: isAuthenticated
          ? {
              backgroundColor: "#030014",
              borderRadius: 25,
              marginHorizontal: 16,
              marginBottom: bottomPadding,
              position: "absolute",
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "#3A3A3C",
              height: tabBarHeight,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }
          : { display: "none" },
      }}
    >
      {/* Core Tab - Home (All Users) */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              IconComp={Icons.navigation}
              name={IconNames.homeOutline}
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
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              IconComp={Icons.package}
              name={MCIconNames.packageVariant}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          title: "Track",
          href: userRole === "customer" ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              IconComp={Icons.map}
              name={IconNames.mapOutline}
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
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              IconComp={Icons.delivery}
              name={MCIconNames.delivery}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          href: userRole === "rider" ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              IconComp={Icons.money}
              name={MCIconNames.cash}
            />
          ),
        }}
      />

      {/* Core Tab - Messages (All Users) - Always visible */}
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          href: undefined, // Always show
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              IconComp={Icons.communication}
              name={IconNames.chatbubbleOutline}
            />
          ),
        }}
      />

      {/* Core Tab - Profile (All Users) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              IconComp={Icons.user}
              name={IconNames.personOutline}
            />
          ),
        }}
      />
    </Tabs>
  );
}
