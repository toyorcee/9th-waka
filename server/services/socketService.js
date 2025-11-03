import jwt from "jsonwebtoken";
import User from "../models/User.js";

const userConnections = new Map();

/**
 * Authenticate socket connection using JWT token
 */
export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    
    next();
  } catch (error) {
    next(new Error("Authentication error: Invalid token"));
  }
};

/**
 * Join user to their personal notification room
 */
export const joinUserRoom = (socket) => {
  if (!socket.userId) return;

  const userId = socket.userId;
  const roomName = `user:${userId}`;
  
  socket.join(roomName);
  
  if (!userConnections.has(userId)) {
    userConnections.set(userId, []);
  }
  userConnections.get(userId).push(socket.id);
  
  console.log(`🔔 [SOCKET] User ${userId} joined room: ${roomName}`);
  console.log(`📊 [SOCKET] Active connections for user ${userId}: ${userConnections.get(userId).length}`);
  
  socket.emit("notification", {
    type: "connected",
    title: "Connected",
    message: "You're now connected to NightWalker",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Remove user connection when they disconnect
 */
export const handleDisconnect = (socket) => {
  if (!socket.userId) return;

  const userId = socket.userId;
  const connections = userConnections.get(userId);
  
  if (connections) {
    const index = connections.indexOf(socket.id);
    if (index > -1) {
      connections.splice(index, 1);
    }
    
    if (connections.length === 0) {
      userConnections.delete(userId);
    }
  }
  
  console.log(`🔔 [SOCKET] User ${userId} disconnected`);
};

/**
 * Send notification to a specific user
 */
export const sendNotificationToUser = (io, userId, notification) => {
  const roomName = `user:${userId}`;
  io.to(roomName).emit("notification", {
    ...notification,
    timestamp: notification.timestamp || new Date().toISOString(),
  });
  
  console.log(`📨 [SOCKET] Notification sent to user ${userId}:`, notification.title);
};

/**
 * Send notification to all users with a specific role
 */
export const sendNotificationToRole = async (io, role, notification) => {
  const users = await User.find({ role, isVerified: true }).select("_id");
  
  users.forEach((user) => {
    const roomName = `user:${user._id}`;
    io.to(roomName).emit("notification", {
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString(),
    });
  });
  
  console.log(`📨 [SOCKET] Notification sent to ${users.length} users with role: ${role}`);
};

