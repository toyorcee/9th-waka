import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { io } from "../server.js";
import { isNotificationEnabled } from "./notificationPreferences.js";
import { sendNotificationToUser } from "./socketService.js";

/**
 * Create and send notification respecting user preferences
 * @param {string} userId - User ID
 * @param {Object} notificationData - { type, title, message, metadata }
 * @param {Object} options - { skipInApp, skipPush, skipEmail } - Force skip channels (for scheduled notifications)
 * @returns {Object|null} - Created notification or null
 */
export const createAndSendNotification = async (
  userId,
  { type, title, message, metadata },
  options = {}
) => {
  // Get user with preferences
  const user = await User.findById(userId).select(
    "notificationPreferences expoPushToken"
  );

  if (!user) {
    console.warn(`[NOTIFICATION] User ${userId} not found`);
    return null;
  }

  // Check preferences for in-app notifications
  const shouldSendInApp =
    !options.skipInApp && isNotificationEnabled(user, type, "inApp");

  let notif = null;

  // Create in-app notification if enabled
  if (shouldSendInApp) {
    try {
      notif = await Notification.create({
        userId,
        type,
        title,
        message,
        metadata: metadata || {},
      });

      // Send via socket (in-app)
      sendNotificationToUser(io, userId.toString(), {
        id: notif._id.toString(),
        type,
        title,
        message,
        timestamp: notif.createdAt?.toISOString?.() || new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        `[NOTIFICATION] Failed to create in-app notification:`,
        error.message
      );
    }
  }

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
