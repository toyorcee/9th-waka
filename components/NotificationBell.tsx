import { IconNames, Icons } from "@/constants/icons";
import { useTheme } from "@/contexts/ThemeContext";
import { Routes } from "@/services/navigationHelper";
import { fetchNotifications } from "@/services/notificationService";
import useFetch from "@/services/useFetch";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { TouchableOpacity, View } from "react-native";

export default function NotificationBell() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const pathname = usePathname();
  const { data, refetch } = useFetch(() => fetchNotifications(0, 20), true);

  useEffect(() => {
    if (pathname !== Routes.standalone.notifications) {
      refetch();
    }
  }, [pathname, refetch]);

  const hasUnread = useMemo(() => {
    const notifications = data?.items || [];
    return notifications.some((n: any) => !n.read);
  }, [data]);

  return (
    <TouchableOpacity
      onPress={() => {
        router.push(Routes.standalone.notifications as any);
      }}
      className="relative mr-4"
      accessibilityRole="button"
      accessibilityLabel="Notifications"
    >
      <Icons.notification
        name={IconNames.notificationsOutline as any}
        size={24}
        color={isDark ? "#FFFFFF" : "#000000"}
      />
      {hasUnread && (
        <View
          className="absolute -top-1 -right-0.5 w-2.5 h-2.5 rounded-full bg-danger border-2"
          style={{ borderColor: "#030014" }}
        />
      )}
    </TouchableOpacity>
  );
}
