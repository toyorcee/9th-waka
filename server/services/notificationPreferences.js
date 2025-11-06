/**
 * Notification Preferences Service
 * Handles checking and managing user notification preferences
 */

import User from "../models/User.js";

/**
 * Map notification types to preference keys
 */
const NOTIFICATION_TYPE_MAP = {
  // Payment
  payment_reminder: "payment_reminder",
  payment_day: "payment_day",
  // Orders
  order: "order_created",
  order_created: "order_created",
  order_assigned: "order_assigned",
  order_status_updated: "order_status_updated",
  // Delivery
  delivery_otp: "delivery_otp",
  delivery_verified: "delivery_verified",
  delivery_proof_updated: "delivery_proof_updated",
  // Account
  verification: "auth_verified",
  auth_verified: "auth_verified",
  welcome: "auth_verified",
  profile_updated: "profile_updated",
  // System (fallback - defaults to enabled)
  system: "order_created",
  // Payouts
  payout_generated: "payout_generated",
  payout_paid: "payout_paid",
  // Price negotiation
  price_change_requested: "price_change_requested",
  price_change_accepted: "price_change_accepted",
  price_change_rejected: "price_change_rejected",
};

/**
 * Get preference key from notification type
 */
function getPreferenceKey(notificationType) {
  return NOTIFICATION_TYPE_MAP[notificationType] || "order_created";
}

/**
 * Check if user has preference enabled for a specific channel and notification type
 * @param {Object} user - User document
 * @param {string} notificationType - Type of notification (e.g., "order_created", "payment_reminder")
 * @param {string} channel - Channel to check ("inApp", "push", "email")
 * @returns {boolean} - True if enabled, false if disabled or not set
 */
export function isNotificationEnabled(user, notificationType, channel) {
  if (!user || !user.notificationPreferences) {
    return true;
  }

  const preferenceKey = getPreferenceKey(notificationType);
  const preference = user.notificationPreferences[preferenceKey];

  if (!preference) {
    return true;
  }

  // Check specific channel
  return preference[channel] !== false;
}

/**
 * Get user with preferences populated
 * @param {string} userId - User ID
 * @returns {Object|null} - User document or null
 */
export async function getUserWithPreferences(userId) {
  try {
    const user = await User.findById(userId).select(
      "notificationPreferences expoPushToken email fullName"
    );
    return user;
  } catch (error) {
    console.error("[PREFERENCES] Error fetching user:", error.message);
    return null;
  }
}

/**
 * Update user notification preferences
 * @param {string} userId - User ID
 * @param {Object} preferences - Preferences object (e.g., { payment_reminder: { inApp: false, push: true, email: true } })
 * @returns {Object|null} - Updated user or null
 */
export async function updateNotificationPreferences(userId, preferences) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return null;
    }

    // Merge preferences (only update provided keys)
    if (!user.notificationPreferences) {
      user.notificationPreferences = {};
    }

    for (const [key, value] of Object.entries(preferences)) {
      if (value && typeof value === "object") {
        if (!user.notificationPreferences[key]) {
          user.notificationPreferences[key] = {};
        }
        // Update only provided channels
        if (typeof value.inApp === "boolean") {
          user.notificationPreferences[key].inApp = value.inApp;
        }
        if (typeof value.push === "boolean") {
          user.notificationPreferences[key].push = value.push;
        }
        if (typeof value.email === "boolean") {
          user.notificationPreferences[key].email = value.email;
        }
      }
    }

    await user.save();
    return user;
  } catch (error) {
    console.error("[PREFERENCES] Error updating preferences:", error.message);
    return null;
  }
}

/**
 * Get default notification preferences (all enabled)
 */
export function getDefaultPreferences() {
  const keys = Object.keys(NOTIFICATION_TYPE_MAP);
  const defaults = {};
  keys.forEach((key) => {
    defaults[key] = { inApp: true, push: true, email: true };
  });
  return defaults;
}
