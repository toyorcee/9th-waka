/**
 * Scheduled Notification Service
 * Cron jobs for Saturday (payment reminder) and Sunday (payment day) notifications
 */

import cron from "node-cron";
import nodemailer from "nodemailer";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { buildDarkEmailTemplate } from "./emailTemplates.js";
import { isNotificationEnabled } from "./notificationPreferences.js";
import { createAndSendNotification } from "./notificationService.js";
import { sendExpoPushNotifications } from "./pushNotificationService.js";

// Get current week range (Sunday to Saturday)
function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday
  const diff = d.getDate() - day; // Go back to Sunday
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7); // Next Sunday (exclusive, so includes all of Saturday)
  return { start, end };
}

// Email helper functions
const getEmailTransporter = () => {
  const service = process.env.EMAIL_SERVICE;
  const user = process.env.EMAIL_USER;
  const password = process.env.EMAIL_PASSWORD;

  if (!user || !password) {
    return null;
  }

  if (service) {
    return nodemailer.createTransport({
      service: service.toLowerCase(),
      auth: { user, pass: password },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user, pass: password },
  });
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = getEmailTransporter();
  if (!transporter) return;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    console.log(`✉️ [EMAIL] Sent to ${to}`);
  } catch (error) {
    console.error(`❌ [EMAIL] Failed to send to ${to}:`, error.message);
  }
};

/**
 * Get current week's earnings for a rider
 */
async function getRiderWeekEarnings(riderId, weekStart, weekEnd) {
  const orders = await Order.find({
    riderId,
    status: "delivered",
    "delivery.deliveredAt": { $gte: weekStart, $lt: weekEnd },
  }).select("financial price");

  const totals = orders.reduce(
    (acc, order) => {
      const fin = order.financial || {
        grossAmount: order.price || 0,
        commissionAmount: 0,
        riderNetAmount: order.price || 0,
      };
      acc.gross += fin.grossAmount || 0;
      acc.commission += fin.commissionAmount || 0;
      acc.riderNet += fin.riderNetAmount || 0;
      acc.count += 1;
      return acc;
    },
    { gross: 0, commission: 0, riderNet: 0, count: 0 }
  );

  return totals;
}

/**
 * Send Saturday payment reminder notifications
 * Runs every Saturday at 9:00 AM (reminder for Sunday payment)
 */
export const scheduleSaturdayReminder = () => {
  // Cron: Every Saturday at 9:00 AM (0 9 * * 6)
  cron.schedule("0 9 * * 6", async () => {
    console.log("📅 [CRON] Saturday payment reminder job started");

    try {
      const { start, end } = getWeekRange();
      const riders = await User.find({
        role: "rider",
        isVerified: true,
      }).select("_id email fullName expoPushToken");

      const notifications = [];
      const pushTokens = [];
      const emails = [];

      for (const rider of riders) {
        const earnings = await getRiderWeekEarnings(rider._id, start, end);

        if (earnings.riderNet > 0) {
          const amount = earnings.riderNet.toLocaleString();
          const title = "💰 Payment Reminder - Tomorrow!";
          const message = `Your weekly earnings of ₦${amount} will be remitted tomorrow (Sunday) after 10% commission deduction.`;

          // Check preferences
          const inAppEnabled = isNotificationEnabled(
            rider,
            "payment_reminder",
            "inApp"
          );
          const pushEnabled = isNotificationEnabled(
            rider,
            "payment_reminder",
            "push"
          );
          const emailEnabled = isNotificationEnabled(
            rider,
            "payment_reminder",
            "email"
          );

          // In-app notification (via socket)
          if (inAppEnabled) {
            try {
              await createAndSendNotification(
                rider._id,
                {
                  type: "payment_reminder",
                  title,
                  message,
                },
                { skipInApp: false }
              );
              notifications.push(rider._id);
            } catch (e) {
              console.error(
                `[CRON] Failed to create notification for ${rider._id}:`,
                e.message
              );
            }
          }

          // Push notification (via Expo) - only if enabled and token exists
          if (pushEnabled && rider.expoPushToken) {
            pushTokens.push({
              token: rider.expoPushToken,
              riderId: rider._id,
            });
          }

          // Email - only if enabled
          if (emailEnabled && rider.email) {
            emails.push({
              rider,
              amount,
              earnings,
            });
          }
        }
      }

      // Send batch push notifications
      if (pushTokens.length > 0) {
        const tokens = pushTokens.map((item) =>
          typeof item === "string" ? item : item.token
        );
        await sendExpoPushNotifications(
          tokens,
          "💰 Payment Reminder",
          `Your weekly earnings will be remitted tomorrow (Sunday)`,
          { type: "payment_reminder" }
        );
      }

      // Send emails using dark theme template
      const transporter = getEmailTransporter();
      if (transporter) {
        for (const { rider, amount, earnings } of emails) {
          try {
            const emailMessage = `Hello ${
              rider.fullName || "Rider"
            },<br><br>This is a reminder that your weekly earnings will be remitted tomorrow (Sunday).<br><br><strong>Summary:</strong><br>• Total Deliveries: ${
              earnings.count
            }<br>• Gross Earnings: ₦${earnings.gross.toLocaleString()}<br>• Commission (10%): ₦${earnings.commission.toLocaleString()}<br>• <strong style="color:#AB8BFF;">Your Net: ₦${amount}</strong><br><br>Thank you for your hard work this week!<br><br>Best regards,<br>9thWaka Team`;

            await sendEmail({
              to: rider.email,
              subject: "💰 Payment Reminder - 9thWaka",
              html: buildDarkEmailTemplate(
                "Payment Reminder",
                emailMessage,
                null
              ),
            });
          } catch (e) {
            console.error(
              `[CRON] Failed to send email to ${rider.email}:`,
              e.message
            );
          }
        }
      }

      console.log(
        `✅ [CRON] Saturday reminder: ${notifications.length} notifications, ${pushTokens.length} push, ${emails.length} emails`
      );
    } catch (error) {
      console.error("❌ [CRON] Saturday reminder error:", error.message);
    }
  });

  console.log(
    "📅 [CRON] Saturday payment reminder scheduled (Every Saturday 9:00 AM)"
  );
};

/**
 * Send Sunday payment day notifications
 * Runs every Sunday at 9:00 AM (payment day)
 */
export const scheduleSundayPayment = () => {
  // Cron: Every Sunday at 9:00 AM (0 9 * * 0)
  cron.schedule("0 9 * * 0", async () => {
    console.log("📅 [CRON] Sunday payment day job started");

    try {
      // Get last week's earnings (Sunday to Saturday)
      const { start, end } = getWeekRange(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      const riders = await User.find({
        role: "rider",
        isVerified: true,
      }).select("_id email fullName expoPushToken");

      const notifications = [];
      const pushTokens = [];
      const emails = [];

      for (const rider of riders) {
        const earnings = await getRiderWeekEarnings(rider._id, start, end);

        if (earnings.riderNet > 0) {
          const amount = earnings.riderNet.toLocaleString();
          const title = "💰 Payment Day - Your Earnings";
          const message = `Your weekly earnings of ₦${amount} are being processed for remittance today (Sunday).`;

          // Check preferences
          const inAppEnabled = isNotificationEnabled(
            rider,
            "payment_day",
            "inApp"
          );
          const pushEnabled = isNotificationEnabled(
            rider,
            "payment_day",
            "push"
          );
          const emailEnabled = isNotificationEnabled(
            rider,
            "payment_day",
            "email"
          );

          // In-app notification (via socket)
          if (inAppEnabled) {
            try {
              await createAndSendNotification(
                rider._id,
                {
                  type: "payment_day",
                  title,
                  message,
                },
                { skipInApp: false }
              );
              notifications.push(rider._id);
            } catch (e) {
              console.error(
                `[CRON] Failed to create notification for ${rider._id}:`,
                e.message
              );
            }
          }

          if (pushEnabled && rider.expoPushToken) {
            pushTokens.push({
              token: rider.expoPushToken,
              riderId: rider._id,
            });
          }

          // Email - only if enabled
          if (emailEnabled && rider.email) {
            emails.push({
              rider,
              amount,
              earnings,
            });
          }
        }
      }

      // Send batch push notifications
      if (pushTokens.length > 0) {
        const tokens = pushTokens.map((item) =>
          typeof item === "string" ? item : item.token
        );
        await sendExpoPushNotifications(
          tokens,
          "💰 Payment Day",
          "Your weekly earnings are being processed for remittance today",
          { type: "payment_day" }
        );
      }

      // Send emails using dark theme template
      const transporter = getEmailTransporter();
      if (transporter) {
        for (const { rider, amount, earnings } of emails) {
          try {
            const emailMessage = `Hello ${
              rider.fullName || "Rider"
            },<br><br>Today is payment day! Your weekly earnings are being processed for remittance.<br><br><strong>Summary:</strong><br>• Total Deliveries: ${
              earnings.count
            }<br>• Gross Earnings: ₦${earnings.gross.toLocaleString()}<br>• Commission (10%): ₦${earnings.commission.toLocaleString()}<br>• <strong style="color:#AB8BFF;">Your Net: ₦${amount}</strong><br><br>Payment will be processed and you'll receive a confirmation once completed.<br><br>Thank you for your hard work!<br><br>Best regards,<br>9thWaka Team`;

            await sendEmail({
              to: rider.email,
              subject: "💰 Payment Day - 9thWaka",
              html: buildDarkEmailTemplate("Payment Day", emailMessage, null),
            });
          } catch (e) {
            console.error(
              `[CRON] Failed to send email to ${rider.email}:`,
              e.message
            );
          }
        }
      }

      console.log(
        `✅ [CRON] Sunday payment: ${notifications.length} notifications, ${pushTokens.length} push, ${emails.length} emails`
      );
    } catch (error) {
      console.error("❌ [CRON] Sunday payment error:", error.message);
    }
  });

  console.log("📅 [CRON] Sunday payment day scheduled (Every Sunday 9:00 AM)");
};
