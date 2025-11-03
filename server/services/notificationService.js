import Notification from "../models/Notification.js";
import { io } from "../server.js";
import { sendNotificationToUser } from "./socketService.js";

export const createAndSendNotification = async (
  userId,
  { type, title, message, metadata }
) => {
  const notif = await Notification.create({
    userId,
    type,
    title,
    message,
    metadata: metadata || {},
  });

  sendNotificationToUser(io, userId.toString(), {
    id: notif._id.toString(),
    type,
    title,
    message,
    timestamp: notif.createdAt?.toISOString?.() || new Date().toISOString(),
  });

  return notif;
};

export const markNotificationRead = async (userId, notificationId) => {
  const notif = await Notification.findOne({ _id: notificationId, userId });
  if (!notif) return null;
  notif.read = true;
  notif.readAt = new Date();
  await notif.save();
  return notif;
};

export const listNotifications = async (
  userId,
  { limit = 50, skip = 0 } = {}
) => {
  const items = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  const total = await Notification.countDocuments({ userId });
  return { items, total };
};
