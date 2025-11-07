import nodemailer from "nodemailer";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { io } from "../server.js";
import { buildDarkEmailTemplate } from "./emailTemplates.js";
import { isNotificationEnabled } from "./notificationPreferences.js";
import { sendExpoPushNotification } from "./pushNotificationService.js";
import { sendNotificationToUser } from "./socketService.js";

let cachedTransporter = null;
let emailConfigChecked = false;

function getEmailConfig() {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASSWORD;
  const emailService = process.env.EMAIL_SERVICE;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  return {
    emailUser,
    emailPass,
    emailService,
    smtpHost,
    smtpPort,
  };
}

function canSendEmail() {
  // Skip email if SKIP_EMAIL is set
  if (process.env.SKIP_EMAIL === "true") {
    return false;
  }
  const { emailUser, emailPass } = getEmailConfig();
  return Boolean(emailUser && emailPass);
}

function createEmailTransporter() {
  const { emailUser, emailPass, emailService, smtpHost, smtpPort } =
    getEmailConfig();

  if (!emailUser || !emailPass) {
    if (!emailConfigChecked) {
      console.warn(
        "✉️ [EMAIL] Notification transport not configured (set EMAIL_USER & EMAIL_PASSWORD)"
      );
      emailConfigChecked = true;
    }
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = emailService
    ? nodemailer.createTransport({
        service: emailService.toLowerCase(),
        auth: { user: emailUser, pass: emailPass },
      })
    : nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false,
        auth: { user: emailUser, pass: emailPass },
      });

  return cachedTransporter;
}

async function sendEmailNotification(to, subject, title, message) {
  // Skip email if SKIP_EMAIL is set
  if (process.env.SKIP_EMAIL === "true") {
    console.log(`✉️ [EMAIL] Skipped notification (SKIP_EMAIL=true) to ${to}`);
    return false;
  }

  const transporter = createEmailTransporter();
  if (!transporter) {
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html: buildDarkEmailTemplate(title, message, null),
    });
    console.log(`✉️ [EMAIL] Notification sent to ${to}`);
    return true;
  } catch (error) {
    console.error(
      `❌ [EMAIL] Failed to send notification to ${to}:`,
      error?.message || error
    );
    return false;
  }
}

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
    "notificationPreferences expoPushToken email fullName"
  );

  if (!user) {
    console.warn(`[NOTIFICATION] User ${userId} not found`);
    return null;
  }

  // Check preferences for in-app notifications
  const shouldSendInApp =
    !options.skipInApp && isNotificationEnabled(user, type, "inApp");
  const shouldSendPush =
    !options.skipPush &&
    isNotificationEnabled(user, type, "push") &&
    Boolean(user.expoPushToken);
  const shouldSendEmail =
    !options.skipEmail &&
    isNotificationEnabled(user, type, "email") &&
    Boolean(user.email) &&
    canSendEmail();

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

  if (shouldSendPush) {
    try {
      const pushResult = await sendExpoPushNotification(
        user.expoPushToken,
        title,
        message,
        { type, metadata: metadata || {} }
      );
      if (!pushResult) {
        console.warn(
          `⚠️ [PUSH] Notification not delivered to user ${userId}`
        );
      }
    } catch (error) {
      console.error(
        `❌ [PUSH] Failed to send notification to user ${userId}:`,
        error?.message || error
      );
    }
  }

  if (shouldSendEmail) {
    try {
      const subject = title || "Notification";
      await sendEmailNotification(user.email, subject, title, message);
    } catch (error) {
      console.error(
        `❌ [EMAIL] Failed to send notification to user ${userId}:`,
        error?.message || error
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

export const getNotification = async (userId, notificationId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    userId,
  }).lean();
  return notification;
};