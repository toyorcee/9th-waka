import { io, Socket } from "socket.io-client";
import { storage } from "./storage";

/**
 * Socket.IO Client Service
 * Manages real-time connection to the server for notifications
 */

class SocketClient {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private notificationListeners: Array<(data: any) => void> = [];

  /**
   * Initialize socket connection
   */
  async connect(serverUrl?: string) {
    const baseUrl =
      process.env.EXPO_PUBLIC_API_BASE_URL?.replace("/api", "") ||
      process.env.EXPO_PUBLIC_API_BASE_URL ||
      "http://localhost:3000";
    const API_URL = serverUrl || baseUrl;
    if (this.socket?.connected) {
      console.log("🔌 [SOCKET] Already connected");
      return;
    }

    try {
      const token = await storage.getToken();

      if (!token) {
        console.warn("🔌 [SOCKET] No token found, cannot connect");
        return;
      }

      this.socket = io(API_URL, {
        auth: {
          token: token,
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error("❌ [SOCKET] Connection error:", error);
    }
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log("✅ [SOCKET] Connected:", this.socket?.id);
    });

    this.socket.on("disconnect", () => {
      this.isConnected = false;
      console.log("🔌 [SOCKET] Disconnected");
    });

    this.socket.on("connect_error", (error) => {
      this.reconnectAttempts++;
      console.error("❌ [SOCKET] Connection error:", error.message);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn("⚠️ [SOCKET] Max reconnection attempts reached");
      }
    });

    this.socket.on("notification", (data) => {
      console.log("🔔 [SOCKET] Notification received:", data);

      // Notify registered listeners (RN-safe)
      this.notificationListeners.forEach((listener) => {
        try {
          listener(data);
        } catch (e) {
          // swallow listener errors to not break others
        }
      });

      // For web, also emit a DOM CustomEvent (optional)
      if (
        typeof window !== "undefined" &&
        typeof (window as any).CustomEvent !== "undefined"
      ) {
        window.dispatchEvent(
          new CustomEvent("socket-notification", { detail: data })
        );
      }
    });

    this.socket.on("pong", (data) => {
      console.log("🏓 [SOCKET] Pong received:", data);
    });
  }

  /**
   * Subscribe to notification events (works on React Native and Web)
   */
  addNotificationListener(listener: (data: any) => void) {
    this.notificationListeners.push(listener);
    return () => this.removeNotificationListener(listener);
  }

  removeNotificationListener(listener: (data: any) => void) {
    this.notificationListeners = this.notificationListeners.filter(
      (l) => l !== listener
    );
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log("🔌 [SOCKET] Disconnected manually");
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Get socket instance
   */
  get socketInstance(): Socket | null {
    return this.socket;
  }

  /**
   * Send ping to server
   */
  ping() {
    if (this.socket?.connected) {
      this.socket.emit("ping");
    }
  }
}

export const socketClient = new SocketClient();
