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

function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

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
 * Send Friday payment reminder notifications
 * Runs every Friday at 9:00 AM (1 day before payment is due)
 */
export const scheduleFridayReminder = () => {
  // Cron: Every Friday at 9:00 AM (0 9 * * 5)
  cron.schedule("0 9 * * 5", async () => {
    console.log("📅 [CRON] Friday payment reminder job started");

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

        if (earnings.commission > 0) {
          const commissionAmount = earnings.commission.toLocaleString();
          const title = "💰 Payment Reminder - Tomorrow";
          const message = `Your commission payment of ₦${commissionAmount} is due tomorrow (Saturday) by 11:59 PM. You have until Sunday 11:59 PM to make payment.`;

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
                { skipInApp: false, skipPush: true, skipEmail: true }
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
              commissionAmount,
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
          `Your commission payment is due tomorrow (Saturday) by 11:59 PM`,
          { type: "payment_reminder" }
        );
      }

      // Send emails using dark theme template
      const transporter = getEmailTransporter();
      if (transporter) {
        for (const { rider, commissionAmount, earnings } of emails) {
          try {
            const emailMessage = `Hello ${
              rider.fullName || "Rider"
            },<br><br>This is a reminder that your commission payment is due <strong>tomorrow (Saturday) by 11:59 PM</strong>. You have until Sunday 11:59 PM to make payment.<br><br><strong>Payment Summary:</strong><br>• Total Deliveries: ${
              earnings.count
            }<br>• Gross Earnings: ₦${earnings.gross.toLocaleString()}<br>• <strong style="color:#FF3B30;">Commission Due (10%): ₦${commissionAmount}</strong><br>• Your Net Earnings: ₦${earnings.riderNet.toLocaleString()}<br><br>Please ensure payment is made by Sunday 11:59 PM to avoid account suspension.<br><br>Thank you for your hard work this week!<br><br>Best regards,<br>9thWaka Team`;

            await sendEmail({
              to: rider.email,
              subject: "💰 Payment Reminder - Tomorrow - 9thWaka",
              html: buildDarkEmailTemplate(
                "Payment Reminder - Tomorrow",
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
        `✅ [CRON] Friday reminder: ${notifications.length} notifications, ${pushTokens.length} push, ${emails.length} emails`
      );
    } catch (error) {
      console.error("❌ [CRON] Friday reminder error:", error.message);
    }
  });

  console.log(
    "📅 [CRON] Friday payment reminder scheduled (Every Friday 9:00 AM - Payment due tomorrow)"
  );
};

/**
 * Send Saturday payment reminder notifications
 * Runs every Saturday at 9:00 AM (reminder that payment is due TODAY)
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

        if (earnings.commission > 0) {
          const commissionAmount = earnings.commission.toLocaleString();
          const title = "💰 Payment Due Today!";
          const message = `Your commission payment of ₦${commissionAmount} is due TODAY (Saturday) by 11:59 PM. You have until Sunday 11:59 PM to make payment.`;

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
                { skipInApp: false, skipPush: true, skipEmail: true }
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
          "💰 Payment Due Today",
          `Your commission payment is due TODAY by 11:59 PM`,
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
            },<br><br>This is a reminder that your commission payment is due <strong>TODAY (Saturday) by 11:59 PM</strong>. You have until Sunday 11:59 PM to make payment.<br><br><strong>Payment Summary:</strong><br>• Total Deliveries: ${
              earnings.count
            }<br>• Gross Earnings: ₦${earnings.gross.toLocaleString()}<br>• <strong style="color:#FF3B30;">Commission Due (10%): ₦${commissionAmount}</strong><br>• Your Net Earnings: ₦${earnings.riderNet.toLocaleString()}<br><br>Please ensure payment is made by Sunday 11:59 PM to avoid account suspension.<br><br>Thank you for your hard work this week!<br><br>Best regards,<br>9thWaka Team`;

            await sendEmail({
              to: rider.email,
              subject: "💰 Payment Due Today - 9thWaka",
              html: buildDarkEmailTemplate(
                "Payment Due Today",
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
    "📅 [CRON] Saturday payment reminder scheduled (Every Saturday 9:00 AM - Payment due TODAY)"
  );
};

/**
 * Block riders with overdue commission payments
 * Runs every Monday at 12:00 AM (after Sunday grace period deadline)
 */
export const schedulePaymentBlocking = () => {
  // Cron: Every Monday at 12:00 AM (0 0 * * 1)
  cron.schedule("0 0 * * 1", async () => {
    console.log("🔒 [CRON] Payment blocking job started");

    try {
      const RiderPayout = (await import("../models/RiderPayout.js")).default;
      const User = (await import("../models/User.js")).default;
      const { createAndSendNotification } = await import(
        "./notificationService.js"
      );

      // Get last week's range (Sunday to Saturday)
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { start, end } = getWeekRange(lastWeek);

      // Get grace period deadline (Sunday 11:59 PM - 1 day allowance)
      const graceDeadline = new Date(end);
      graceDeadline.setHours(23, 59, 59, 999); // End of Sunday

      // Find all unpaid payouts from last week
      // Only payouts with status "pending" will be considered for blocking
      // Riders who paid within grace period will have status "paid" and won't be blocked
      const unpaidPayouts = await RiderPayout.find({
        weekStart: start,
        status: "pending",
      }).populate("riderId", "fullName email expoPushToken");

      let blockedCount = 0;
      const now = new Date();

      for (const payout of unpaidPayouts) {
        if (!payout.riderId) continue;

        // Double-check: Skip if payout is already paid (extra safety)
        if (payout.status === "paid") {
          console.log(
            `[CRON] Skipping payout ${payout._id} - already marked as paid`
          );
          continue;
        }

        // Check if grace period deadline has passed (Sunday 11:59 PM)
        if (now > graceDeadline) {
          // Get current rider data to check strikes
          const rider = await User.findById(payout.riderId._id);
          if (!rider) continue;

          const currentStrikes = rider.strikes || 0;
          const newStrikeNumber = currentStrikes + 1;
          const willBeDeactivated = newStrikeNumber >= 3;

          // Add strike to history
          const strikeEntry = {
            strikeNumber: newStrikeNumber,
            reason: "Late payment - Commission payment overdue",
            weekStart: start,
            weekEnd: end,
            commissionAmount: payout.totals.commission,
            issuedAt: new Date(),
          };

          // Update rider with strike and blocking
          const updateData = {
            paymentBlocked: true,
            paymentBlockedAt: new Date(),
            paymentBlockedReason: `Overdue commission payment for week ${start.toLocaleDateString()} - ${new Date(
              end.getTime() - 1
            ).toLocaleDateString()}. Payment was due Saturday 11:59 PM (grace period until Sunday 11:59 PM). Amount: ₦${payout.totals.commission.toLocaleString()}`,
            strikes: newStrikeNumber,
            $push: { strikeHistory: strikeEntry },
          };

          // Deactivate account if 3rd strike
          if (willBeDeactivated) {
            updateData.accountDeactivated = true;
            updateData.accountDeactivatedAt = new Date();
            updateData.accountDeactivatedReason = `Account deactivated after 3 strikes for late payment. Final strike issued for week ${start.toLocaleDateString()} - ${new Date(
              end.getTime() - 1
            ).toLocaleDateString()}.`;
          }

          await User.findByIdAndUpdate(payout.riderId._id, updateData);

          // Set rider offline if they're online
          const RiderLocation = (await import("../models/RiderLocation.js"))
            .default;
          await RiderLocation.findOneAndUpdate(
            { riderId: payout.riderId._id },
            { online: false }
          );

          // Notify rider
          try {
            const notificationTitle = willBeDeactivated
              ? "🚫 Account Deactivated - 3 Strikes"
              : `⚠️ Strike ${newStrikeNumber}/3 - Payment Overdue`;
            const notificationMessage = willBeDeactivated
              ? `Your account has been deactivated after receiving 3 strikes for late payment. This is your final strike. Please contact support immediately to resolve this issue.`
              : `You have received strike ${newStrikeNumber} of 3 for overdue commission payment of ₦${payout.totals.commission.toLocaleString()}. Payment was due Saturday 11:59 PM (grace period until Sunday 11:59 PM). ${
                  newStrikeNumber === 2
                    ? "One more strike will result in account deactivation."
                    : "Please contact support immediately."
                }`;

            await createAndSendNotification(payout.riderId._id, {
              type: willBeDeactivated
                ? "account_deactivated"
                : "payment_strike",
              title: notificationTitle,
              message: notificationMessage,
            });
          } catch (e) {
            console.error(
              `[CRON] Failed to notify blocked rider ${payout.riderId._id}:`,
              e.message
            );
          }

          if (willBeDeactivated) {
            console.log(
              `🚫 [CRON] Account deactivated: ${payout.riderId._id} (3 strikes)`
            );
          }

          blockedCount++;
        }
      }

      console.log(
        `🔒 [CRON] Payment blocking completed. Blocked ${blockedCount} rider(s)`
      );
    } catch (error) {
      console.error("[CRON] Payment blocking error:", error);
    }
  });
};

/**
 * Send Sunday payment status notifications
 * Runs every Sunday at 9:00 AM (final reminder - grace period ends today)
 */
export const scheduleSundayPayment = () => {
  // Cron: Every Sunday at 9:00 AM (0 9 * * 0)
  cron.schedule("0 9 * * 0", async () => {
    console.log("📅 [CRON] Sunday payment status job started");

    try {
      const RiderPayout = (await import("../models/RiderPayout.js")).default;
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

        if (earnings.commission > 0) {
          // Check if payment was made
          const payout = await RiderPayout.findOne({
            riderId: rider._id,
            weekStart: start,
          });

          const commissionAmount = earnings.commission.toLocaleString();
          const netAmount = earnings.riderNet.toLocaleString();

          let title, message;
          if (payout && payout.status === "paid") {
            title = "✅ Payment Received";
            message = `Your commission payment of ₦${commissionAmount} was received. Your net earnings of ₦${netAmount} are being processed.`;
          } else {
            title = "⚠️ Final Reminder - Payment Overdue";
            message = `Your commission payment of ₦${commissionAmount} was due yesterday (Saturday 11:59 PM). This is your final reminder - payment must be made by TODAY (Sunday) 11:59 PM to avoid account suspension.`;
          }

          // Check preferences
          const inAppEnabled = isNotificationEnabled(
            rider,
            "payment_status",
            "inApp"
          );
          const pushEnabled = isNotificationEnabled(
            rider,
            "payment_status",
            "push"
          );
          const emailEnabled = isNotificationEnabled(
            rider,
            "payment_status",
            "email"
          );

          // In-app notification (via socket)
          if (inAppEnabled) {
            try {
              await createAndSendNotification(
                rider._id,
                {
                  type: "payment_status",
                  title,
                  message,
                },
                { skipInApp: false, skipPush: true, skipEmail: true }
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
              title,
              message,
            });
          }

          // Email - only if enabled
          if (emailEnabled && rider.email) {
            emails.push({
              rider,
              title,
              message,
              commissionAmount,
              netAmount,
              earnings,
              isPaid: payout && payout.status === "paid",
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
          "💰 Payment Status Update",
          `Payment status update for last week's earnings`,
          { type: "payment_status" }
        );
      }

      // Send emails using dark theme template
      const transporter = getEmailTransporter();
      if (transporter) {
        for (const {
          rider,
          title,
          message,
          commissionAmount,
          netAmount,
          earnings,
          isPaid,
        } of emails) {
          try {
            const statusText = isPaid
              ? "Your commission payment was received."
              : "Your commission payment was due yesterday (Saturday 11:59 PM). This is your final reminder - payment must be made by TODAY (Sunday) 11:59 PM to avoid account suspension.";
            const emailMessage = `Hello ${
              rider.fullName || "Rider"
            },<br><br>${statusText}<br><br><strong>Payment Summary:</strong><br>• Total Deliveries: ${
              earnings.count
            }<br>• Gross Earnings: ₦${earnings.gross.toLocaleString()}<br>• Commission (10%): ₦${commissionAmount}<br>• <strong style="color:#AB8BFF;">Your Net: ₦${netAmount}</strong><br><br>${
              isPaid
                ? "Thank you for your timely payment!"
                : "Please make payment immediately or contact support if payment was already made."
            }<br><br>Best regards,<br>9thWaka Team`;

            await sendEmail({
              to: rider.email,
              subject: title + " - 9thWaka",
              html: buildDarkEmailTemplate(title, emailMessage, null),
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
        `✅ [CRON] Sunday payment status: ${notifications.length} notifications, ${pushTokens.length} push, ${emails.length} emails`
      );
    } catch (error) {
      console.error("❌ [CRON] Sunday payment status error:", error.message);
    }
  });

  console.log(
    "📅 [CRON] Sunday payment status scheduled (Every Sunday 9:00 AM - After Saturday deadline)"
  );
};

/**
 * Generate payouts for all riders at the start of each week
 * Runs every Sunday at 12:00 AM (start of new week)
 * This ensures all riders see a pending payout entry even if they have no deliveries
 */
export const schedulePayoutGeneration = () => {
  // Cron: Every Sunday at 12:00 AM (0 0 * * 0)
  cron.schedule("0 0 * * 0", async () => {
    console.log("💰 [CRON] Weekly payout generation job started");

    try {
      const { generatePayoutsForWeek } = await import(
        "../controllers/payoutController.js"
      );

      // Create a mock request object for generatePayoutsForWeek
      const mockReq = {
        query: {},
        user: { role: "admin" }, // Admin role to bypass auth
      };
      const mockRes = {
        json: (data) => {
          console.log(
            `✅ [CRON] Generated ${
              data.payouts?.length || 0
            } payout(s) for week ${data.weekStart}`
          );
        },
        status: (code) => ({
          json: (data) => {
            console.error(
              `❌ [CRON] Failed to generate payouts: ${
                data.error || "Unknown error"
              }`
            );
          },
        }),
      };

      await generatePayoutsForWeek(mockReq, mockRes);
    } catch (error) {
      console.error("❌ [CRON] Payout generation error:", error.message);
    }
  });

  console.log(
    "📅 [CRON] Weekly payout generation scheduled (Every Sunday 12:00 AM - Start of new week)"
  );
};
