import { SocketEvents } from "@/constants/socketEvents";
import { socketClient } from "@/services/socketClient";
import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import Toast from "react-native-toast-message";
import { useAuth } from "./AuthContext";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
}

interface SocketContextType {
  connected: boolean;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, checkAuthStatus } = useAuth();
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      socketClient.disconnect();
      setConnected(false);
      setNotifications([]);
      return;
    }

    const baseUrl =
      process.env.EXPO_PUBLIC_API_BASE_URL?.replace("/api", "") ||
      process.env.EXPO_PUBLIC_API_BASE_URL ||
      "http://localhost:3000";
    socketClient.connect(baseUrl);

    const interval = setInterval(() => {
      setConnected(socketClient.connected);
    }, 1000);

    const handleNotification = (payload: any) => {
      const notification = (payload?.detail ?? payload) as Notification;
      const newNotification = {
        ...notification,
        id: notification.id || Date.now().toString(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev]);
    };
    const unsubscribeNotification =
      socketClient.addNotificationListener(handleNotification);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && isAuthenticated) {
        socketClient.connect(baseUrl);
      } else if (nextAppState === "background") {
        // Keep connected but can optimize
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    let detachFns: Array<() => void> = [];
    const tryAttach = () => {
      const s = socketClient.socketInstance;
      if (!s) return;
      const on = s.on.bind(s);
      on(SocketEvents.AUTH_VERIFIED, () => {
        Toast.show({
          type: "success",
          text1: "Verified",
          text2: "Welcome to 9thWaka",
        });
        checkAuthStatus();
      });
      on(SocketEvents.PROFILE_UPDATED, () => {
        Toast.show({
          type: "success",
          text1: "Profile updated",
          text2: "Your profile changes have been saved",
        });
        checkAuthStatus();
      });
      on(SocketEvents.ORDER_CREATED, () => {
        Toast.show({
          type: "success",
          text1: "Order created",
          text2: "Your order has been placed and is awaiting assignment",
        });
      });
      on(SocketEvents.ORDER_ASSIGNED, (data: any) => {
        const isRider = !data.riderId;
        Toast.show({
          type: "success",
          text1: isRider ? "Order accepted" : "Rider assigned",
          text2: isRider
            ? "You have accepted the order"
            : "A rider has been assigned to your order",
        });
      });
      on(SocketEvents.ORDER_STATUS_UPDATED, (data: any) => {
        const statusMessages: Record<
          string,
          { title: string; subtitle: string }
        > = {
          picked_up: {
            title: "Order picked up",
            subtitle: "The rider has picked up your order",
          },
          delivering: {
            title: "Out for delivery",
            subtitle: "Your order is on the way",
          },
          delivered: {
            title: "Order delivered",
            subtitle: "Your order has been successfully delivered",
          },
          cancelled: {
            title: "Order cancelled",
            subtitle: "This order has been cancelled",
          },
        };
        const msg = statusMessages[data?.status] || {
          title: "Order updated",
          subtitle: "Order status has changed",
        };
        Toast.show({ type: "info", text1: msg.title, text2: msg.subtitle });
      });
      on(SocketEvents.DELIVERY_OTP, () => {
        Toast.show({
          type: "info",
          text1: "Delivery code sent",
          text2: "Check your notifications for the delivery code",
        });
      });
      on(SocketEvents.DELIVERY_VERIFIED, () => {
        Toast.show({
          type: "success",
          text1: "Delivery confirmed",
          text2: "Order has been verified and marked as delivered",
        });
      });
      on(SocketEvents.DELIVERY_PROOF_UPDATED, () => {
        Toast.show({
          type: "info",
          text1: "Delivery proof updated",
          text2: "The rider has uploaded delivery confirmation",
        });
      });
      on(SocketEvents.PAYOUT_GENERATED, () => {
        Toast.show({
          type: "info",
          text1: "Weekly payout generated",
          text2: "Your weekly earnings summary is ready",
        });
      });
      on(SocketEvents.PAYOUT_PAID, () => {
        Toast.show({
          type: "success",
          text1: "Payout processed",
          text2: "Your weekly remittance has been marked as paid",
        });
      });
      // Detach on cleanup
      detachFns.push(() => {
        const off = s.off.bind(s);
        off(SocketEvents.AUTH_VERIFIED);
        off(SocketEvents.PROFILE_UPDATED);
        off(SocketEvents.ORDER_CREATED);
        off(SocketEvents.ORDER_ASSIGNED);
        off(SocketEvents.ORDER_STATUS_UPDATED);
        off(SocketEvents.DELIVERY_OTP);
        off(SocketEvents.DELIVERY_VERIFIED);
        off(SocketEvents.DELIVERY_PROOF_UPDATED);
        off(SocketEvents.PAYOUT_GENERATED);
        off(SocketEvents.PAYOUT_PAID);
      });
    };
    const attachTimer = setTimeout(tryAttach, 300);

    return () => {
      clearInterval(interval);
      unsubscribeNotification();
      subscription.remove();
      detachFns.forEach((fn) => fn());
      clearTimeout(attachTimer);
    };
  }, [isAuthenticated]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SocketContext.Provider
      value={{
        connected,
        notifications,
        unreadCount,
        markAsRead,
        clearAll,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
