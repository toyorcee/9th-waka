import { SocketEvents } from "@/constants/socketEvents";
import { showLocalNotification } from "@/services/notificationService";
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

    // Let socketClient determine the URL itself using the same logic as apiClient
    socketClient.connect();

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

      // Show native notification
      showLocalNotification(notification.title, notification.message, {
        notificationId: newNotification.id,
        type: notification.type,
      }).catch((err) => console.warn("Failed to show notification:", err));
    };
    const unsubscribeNotification =
      socketClient.addNotificationListener(handleNotification);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && isAuthenticated) {
        socketClient.connect();
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
        showLocalNotification("Verified", "Welcome to 9thWaka").catch(() => {});
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
        showLocalNotification(
          "Order created",
          "Your order has been placed and is awaiting assignment"
        ).catch(() => {});
      });
      on(SocketEvents.ORDER_ASSIGNED, (data: any) => {
        const isRider = !data.riderId;
        const title = isRider ? "Order accepted" : "Rider assigned";
        const message = isRider
          ? "You have accepted the order"
          : "A rider has been assigned to your order";
        Toast.show({
          type: "success",
          text1: title,
          text2: message,
        });
        showLocalNotification(title, message).catch(() => {});
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
        showLocalNotification(msg.title, msg.subtitle).catch(() => {});
      });
      on(SocketEvents.DELIVERY_OTP, () => {
        Toast.show({
          type: "info",
          text1: "Delivery code sent",
          text2: "Check your notifications for the delivery code",
        });
        showLocalNotification(
          "Delivery code sent",
          "Check your notifications for the delivery code"
        ).catch(() => {});
      });
      on(SocketEvents.DELIVERY_VERIFIED, () => {
        Toast.show({
          type: "success",
          text1: "Delivery confirmed",
          text2: "Order has been verified and marked as delivered",
        });
        showLocalNotification(
          "Delivery confirmed",
          "Order has been verified and marked as delivered"
        ).catch(() => {});
      });
      on(SocketEvents.DELIVERY_PROOF_UPDATED, () => {
        Toast.show({
          type: "info",
          text1: "Delivery proof updated",
          text2: "The rider has uploaded delivery confirmation",
        });
      });
      on(SocketEvents.RIDER_LOCATION_UPDATED, (data: any) => {
        if (
          typeof window !== "undefined" &&
          typeof (window as any).CustomEvent !== "undefined"
        ) {
          window.dispatchEvent(
            new CustomEvent("rider-location-updated", { detail: data })
          );
        }
      });
      on(SocketEvents.PAYOUT_GENERATED, () => {
        Toast.show({
          type: "info",
          text1: "Weekly payout generated",
          text2: "Your weekly earnings summary is ready",
        });
        showLocalNotification(
          "Weekly payout generated",
          "Your weekly earnings summary is ready"
        ).catch(() => {});
      });
      on(SocketEvents.PAYOUT_PAID, () => {
        Toast.show({
          type: "success",
          text1: "Payout processed",
          text2: "Your weekly remittance has been marked as paid",
        });
        showLocalNotification(
          "Payout processed",
          "Your weekly remittance has been marked as paid"
        ).catch(() => {});
      });
      on(SocketEvents.PRICE_CHANGE_REQUESTED, (data: any) => {
        Toast.show({
          type: "info",
          text1: "Price change requested",
          text2: `Rider requested ₦${
            data?.requestedPrice?.toLocaleString() || "new price"
          }`,
        });
        showLocalNotification(
          "Price change requested",
          `Rider requested a price change for your order`
        ).catch(() => {});
      });
      on(SocketEvents.PRICE_CHANGE_ACCEPTED, (data: any) => {
        Toast.show({
          type: "success",
          text1: "Price change accepted",
          text2: `Customer accepted your requested price of ₦${
            data?.finalPrice?.toLocaleString() || ""
          }`,
        });
        showLocalNotification(
          "Price change accepted",
          "Customer accepted your price change request"
        ).catch(() => {});
      });
      on(SocketEvents.PRICE_CHANGE_REJECTED, () => {
        Toast.show({
          type: "error",
          text1: "Price change rejected",
          text2: "Customer rejected your price change request",
        });
        showLocalNotification(
          "Price change rejected",
          "Customer rejected your price change request"
        ).catch(() => {});
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
        off(SocketEvents.PRICE_CHANGE_REQUESTED);
        off(SocketEvents.PRICE_CHANGE_ACCEPTED);
        off(SocketEvents.PRICE_CHANGE_REJECTED);
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
