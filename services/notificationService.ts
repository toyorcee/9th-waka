import Constants from "expo-constants";
import { Platform } from "react-native";

let notificationsModule: any | null = null;
async function getNotifications() {
  if (!notificationsModule) {
    try {
      notificationsModule = await import("expo-notifications");
    } catch (e) {
      console.warn("⚠️ [NOTIFICATIONS] expo-notifications not available:", e);
      notificationsModule = null;
    }
  }
  return notificationsModule;
}

let handlerInitialized = false;
async function ensureNotificationHandler() {
  if (handlerInitialized) return;
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return;
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    handlerInitialized = true;
  } catch (error) {
    handlerInitialized = true;
  }
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
  metadata?: {
    orderId?: string;
    [key: string]: any;
  };
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
}

// API calls
export async function fetchNotifications(skip = 0, limit = 50) {
  const { apiClient } = await import("./apiClient");
  const response = await apiClient.get(
    `/notifications?skip=${skip}&limit=${limit}`
  );
  return response.data as NotificationListResponse;
}

export async function markNotificationRead(id: string) {
  const { apiClient } = await import("./apiClient");
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function getNotification(id: string): Promise<NotificationItem> {
  const { apiClient } = await import("./apiClient");
  const response = await apiClient.get(`/notifications/${id}`);
  const notif = response.data?.notification || response.data;
  return {
    id: String(notif.id || notif._id),
    type: notif.type,
    title: notif.title,
    message: notif.message,
    timestamp: notif.timestamp || notif.createdAt || new Date().toISOString(),
    read: Boolean(notif.read),
    metadata: notif.metadata || {},
  };
}

async function savePushTokenToBackend(token: string): Promise<void> {
  try {
    const { apiClient } = await import("./apiClient");
    await apiClient.post("/user/push-token", { expoPushToken: token });
    console.log("✅ [NOTIFICATIONS] Push token saved to backend");
  } catch (error: any) {
    console.warn(
      "⚠️ [NOTIFICATIONS] Failed to save push token to backend:",
      error?.response?.data?.error || error?.message
    );
  }
}

// Expo Notifications setup
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  try {
    let token: string | null = null;
    await ensureNotificationHandler();
    const Notifications = await getNotifications();
    if (!Notifications) return null;

    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }
    } catch (error) {
      // Silently fail - channel setup not critical
    }

    let finalStatus = "undetermined";
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
    } catch (error) {
      // Silently fail - permissions not available
      return null;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    try {
      const resolvedProjectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        process.env.EXPO_PUBLIC_PROJECT_ID;

      if (!resolvedProjectId) {
        return null;
      }

      const expoToken = await Notifications.getExpoPushTokenAsync({
        projectId: resolvedProjectId,
      });
      token = expoToken.data;

      // Save token to backend
      if (token) {
        await savePushTokenToBackend(token).catch(() => {
          // Silently fail - backend save not critical
        });
      }
    } catch (error) {
      // Silently fail - push token not available
      return null;
    }

    return token;
  } catch (error) {
    // Silently fail - all notification errors
    return null;
  }
}

// Show a local notification
export async function showLocalNotification(
  title: string,
  body: string,
  data?: any
) {
  try {
    await ensureNotificationHandler();
    const Notifications = await getNotifications();
    if (!Notifications) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    // Silently fail - local notifications not available
  }
}

// Get notification permissions status
export async function getNotificationPermissions(): Promise<boolean> {
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return false;
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  } catch (error) {
    return false;
  }
}
