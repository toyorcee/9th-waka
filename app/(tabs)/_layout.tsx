import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  const { user, isLoading } = useAuth();
  const userRole = user?.role || "customer";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#AB8BFF",
        tabBarInactiveTintColor: "#9CA4AB",
        tabBarStyle: {
          backgroundColor: "#030014",
          borderTopColor: "#3A3A3C",
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      {/* Core Tab - Home (All Users) */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Icons.navigation
              name={IconNames.homeOutline as any}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Customer Tabs */}
      {userRole === "customer" && (
        <>
          <Tabs.Screen
            name="orders"
            options={{
              title: "My Orders",
              tabBarIcon: ({ color, size }) => (
                <Icons.package
                  name={IconNames.packageOutline as any}
                  size={size}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="track"
            options={{
              title: "Track",
              tabBarIcon: ({ color, size }) => (
                <Icons.map
                  name={IconNames.mapOutline as any}
                  size={size}
                  color={color}
                />
              ),
            }}
          />
        </>
      )}

      {/* Rider Tabs */}
      {userRole === "rider" && (
        <>
          <Tabs.Screen
            name="deliveries"
            options={{
              title: "Deliveries",
              tabBarIcon: ({ color, size }) => (
                <Icons.delivery
                  name={MCIconNames.delivery as any}
                  size={size}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="earnings"
            options={{
              title: "Earnings",
              tabBarIcon: ({ color, size }) => (
                <Icons.money
                  name={MCIconNames.cash as any}
                  size={size}
                  color={color}
                />
              ),
            }}
          />
        </>
      )}

      {/* Core Tab - Profile (All Users) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Icons.user
              name={IconNames.personOutline as any}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
