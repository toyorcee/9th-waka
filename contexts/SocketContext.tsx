import { socketClient } from "@/services/socketClient";
import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
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
  const { isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      socketClient.disconnect();
      setConnected(false);
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

    const handleNotification = (event: any) => {
      const notification = event.detail as Notification;
      const newNotification = {
        ...notification,
        id: notification.id || Date.now().toString(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev]);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("socket-notification", handleNotification);
    }

    // Handle app state changes
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

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("socket-notification", handleNotification);
      }
      subscription.remove();
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
