import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_ACTION_KEY = "pendingAction";

export type PendingAction = "request" | "track" | "sos" | null;

export const navigationHelper = {
  setPendingAction: async (action: PendingAction): Promise<void> => {
    try {
      if (action) {
        await AsyncStorage.setItem(PENDING_ACTION_KEY, action);
      } else {
        await AsyncStorage.removeItem(PENDING_ACTION_KEY);
      }
    } catch (error) {
      console.error("Error storing pending action:", error);
    }
  },

  getPendingAction: async (): Promise<PendingAction> => {
    try {
      const action = await AsyncStorage.getItem(PENDING_ACTION_KEY);
      return (action as PendingAction) || null;
    } catch (error) {
      console.error("Error getting pending action:", error);
      return null;
    }
  },

  clearPendingAction: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(PENDING_ACTION_KEY);
    } catch (error) {
      console.error("Error clearing pending action:", error);
    }
  },
};

// Centralized route map
export const Routes = {
  tabs: {
    home: "/(tabs)/home",
    orders: "/(tabs)/orders",
    track: "/(tabs)/track",
    deliveries: "/(tabs)/deliveries",
    earnings: "/(tabs)/earnings",
    profile: "/(tabs)/profile",
  },
  standalone: {
    auth: "/auth",
    newOrder: "/orders/new",
    orderDetail: (id: string) => `/orders/${id}`,
    chatList: "/chat",
    chatForOrder: (orderId: string) => `/chat/${orderId}`,
    sos: "/sos",
    profileEdit: "/profile/edit",
    profileSettings: "/profile/settings",
  },
} as const;
