import { SocketEvents } from "../constants/socketEvents.js";
import Order from "../models/Order.js";
import RiderLocation from "../models/RiderLocation.js";
import RiderPayout from "../models/RiderPayout.js";
import User from "../models/User.js";
import { io } from "../server.js";
import { createAndSendNotification } from "../services/notificationService.js";

// Get current week range (Sunday to Saturday)
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

export const generatePayoutsForWeek = async (req, res) => {
  try {
    const { weekStart } = req.query || {};
    const { start, end } = weekStart
      ? getWeekRange(new Date(weekStart))
      : getWeekRange();

    const delivered = await Order.find({
      status: "delivered",
      "delivery.deliveredAt": { $gte: start, $lt: end },
      riderId: { $ne: null },
    }).select("riderId delivery.deliveredAt financial price");

    const byRider = new Map();
    for (const o of delivered) {
      const key = String(o.riderId);
      const fin = o.financial || {
        grossAmount: o.price || 0,
        commissionAmount: 0,
        riderNetAmount: o.price || 0,
      };
      if (!byRider.has(key)) byRider.set(key, []);
      byRider.get(key).push({
        orderId: o._id,
        deliveredAt: o.delivery?.deliveredAt || new Date(),
        grossAmount: fin.grossAmount || 0,
        commissionAmount: fin.commissionAmount || 0,
        riderNetAmount: fin.riderNetAmount || 0,
      });
    }

    const allRiders = await User.find({
      role: "rider",
      isVerified: true,
    }).select("_id");

    const results = [];
    const riderIdsWithOrders = new Set();

    for (const [riderId, orders] of byRider.entries()) {
      riderIdsWithOrders.add(riderId);
      const totals = orders.reduce(
        (acc, x) => {
          acc.gross += x.grossAmount;
          acc.commission += x.commissionAmount;
          acc.riderNet += x.riderNetAmount;
          acc.count += 1;
          return acc;
        },
        { gross: 0, commission: 0, riderNet: 0, count: 0 }
      );

      const doc = await RiderPayout.findOneAndUpdate(
        { riderId, weekStart: start },
        {
          riderId,
          weekStart: start,
          weekEnd: end,
          orders,
          totals,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push(doc);
    }

    // Create payout records for riders with no orders (so they see pending in the table)
    for (const rider of allRiders) {
      const riderIdStr = String(rider._id);
      if (!riderIdsWithOrders.has(riderIdStr)) {
        const doc = await RiderPayout.findOneAndUpdate(
          { riderId: rider._id, weekStart: start },
          {
            riderId: rider._id,
            weekStart: start,
            weekEnd: end,
            orders: [],
            totals: {
              gross: 0,
              commission: 0,
              riderNet: 0,
              count: 0,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        results.push(doc);
      }
    }

    const response = {
      success: true,
      weekStart: start,
      weekEnd: end,
      payouts: results,
    };
    try {
      for (const p of results) {
        // Notify rider
        try {
          await createAndSendNotification(p.riderId, {
            type: "payout_generated",
            title: "Weekly payout generated",
            message: `Your weekly earnings of ₦${p.totals.riderNet.toLocaleString()} have been calculated and are ready for payment`,
          });
        } catch {}

        io.to(`user:${p.riderId}`).emit(SocketEvents.PAYOUT_GENERATED, {
          payoutId: p._id.toString(),
          weekStart: p.weekStart,
          weekEnd: p.weekEnd,
        });
      }
    } catch {}
    return res.json(response);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const listPayouts = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "User is not defined",
      });
    }

    const { riderId, status, weekStart } = req.query || {};
    const query = {};

    const isAdmin = req.user.role === "admin";
    if (!isAdmin) {
      query.riderId = req.user._id;
    } else if (riderId) {
      query.riderId = riderId;
    }

    if (status) query.status = status;
    if (weekStart) query.weekStart = new Date(weekStart);
    const payouts = await RiderPayout.find(query)
      .sort({ weekStart: -1 })
      .populate("riderId", "fullName email");
    res.json({ success: true, payouts });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Mark payout as paid - Riders can mark their own, Admins can mark any
 * This automatically unblocks riders whether payment is within grace period or overdue.
 * Riders mark their own payment when they make it, reducing admin workload.
 * Admins can verify later and manually block if payment wasn't actually received.
 *
 * IMPORTANT: When payout is marked as paid, the rider will NOT be blocked by the Monday cron job
 * because the blocking job only processes payouts with status "pending".
 */
export const markPayoutPaid = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "User is not defined",
      });
    }

    const payout = await RiderPayout.findById(req.params.id);
    if (!payout)
      return res
        .status(404)
        .json({ success: false, error: "Payout not found" });

    // Check permissions: Rider can only mark their own payout, Admin can mark any
    const isAdmin = req.user.role === "admin";
    const isRiderOwner = String(payout.riderId) === String(req.user._id);

    if (!isAdmin && !isRiderOwner) {
      return res.status(403).json({
        success: false,
        error: "You can only mark your own payout as paid",
      });
    }

    // If already paid, just return success (idempotent)
    if (payout.status === "paid") {
      return res.json({
        success: true,
        message: "Payout already marked as paid",
        payout,
      });
    }

    payout.status = "paid";
    payout.paidAt = new Date();
    payout.markedPaidBy = isAdmin ? "admin" : "rider";
    payout.markedPaidByUserId = req.user._id;

    if (req.file) {
      payout.paymentProofScreenshot = `/api/uploads/${req.file.filename}`;
    }

    await payout.save();

    const User = (await import("../models/User.js")).default;
    await User.findByIdAndUpdate(payout.riderId, {
      paymentBlocked: false,
      paymentBlockedAt: null,
      paymentBlockedReason: null,
    });

    try {
      await createAndSendNotification(payout.riderId, {
        type: "payout_paid",
        title: "Payment received",
        message: `Your weekly earnings of ₦${payout.totals.riderNet.toLocaleString()} have been paid`,
      });
    } catch {}

    try {
      io.to(`user:${payout.riderId}`).emit(SocketEvents.PAYOUT_PAID, {
        payoutId: payout._id.toString(),
      });
    } catch {}
    res.json({ success: true, payout });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Get all blocked riders (admin only)
 * GET /api/admin/riders/blocked
 */
export const getBlockedRiders = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin only" });
    }

    const blockedRiders = await User.find({
      role: "rider",
      paymentBlocked: true,
    })
      .select(
        "fullName email phoneNumber paymentBlockedAt paymentBlockedReason strikes strikeHistory accountDeactivated"
      )
      .sort({ paymentBlockedAt: -1 })
      .lean();

    const { start, end } = getWeekRange();
    const riderIds = blockedRiders.map((r) => r._id);
    const currentPayouts = await RiderPayout.find({
      riderId: { $in: riderIds },
      weekStart: start,
    })
      .select("riderId totals status")
      .lean();

    const payoutMap = new Map();
    currentPayouts.forEach((p) => {
      payoutMap.set(String(p.riderId), p);
    });

    const ridersWithPayouts = blockedRiders.map((rider) => {
      const payout = payoutMap.get(String(rider._id));
      return {
        ...rider,
        currentWeekPayout: payout
          ? {
              commission: payout.totals.commission,
              status: payout.status,
            }
          : null,
      };
    });

    res.json({ success: true, riders: ridersWithPayouts });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Unblock a rider (admin only) - confirms payment for overdue riders (past grace period)
 * This endpoint is ONLY for riders who are blocked after the grace period has passed.
 * Riders who pay within the grace period are automatically unblocked when payout is marked as paid.
 * PATCH /api/admin/riders/:riderId/unblock
 */
export const unblockRider = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin only" });
    }

    const { riderId } = req.params;
    const { markPayoutPaid, payoutId } = req.body || {};

    const rider = await User.findById(riderId);
    if (!rider) {
      return res.status(404).json({ success: false, error: "Rider not found" });
    }

    if (rider.role !== "rider") {
      return res
        .status(400)
        .json({ success: false, error: "User is not a rider" });
    }

    if (!rider.paymentBlocked) {
      return res
        .status(400)
        .json({ success: false, error: "Rider is not blocked" });
    }

    // Check if rider was blocked after grace period (overdue)
    // If paymentBlockedAt exists and is after grace period, this is an overdue case
    if (!rider.paymentBlockedAt) {
      return res.status(400).json({
        success: false,
        error:
          "Cannot determine if rider is overdue. Please use payout mark-paid endpoint for grace period payments.",
      });
    }

    // Unblock the rider
    await User.findByIdAndUpdate(riderId, {
      paymentBlocked: false,
      paymentBlockedAt: null,
      paymentBlockedReason: null,
    });

    // Optionally mark payout as paid if provided
    if (markPayoutPaid && payoutId) {
      const payout = await RiderPayout.findById(payoutId);
      if (payout && payout.riderId.toString() === riderId) {
        payout.status = "paid";
        payout.paidAt = new Date();
        await payout.save();
      }
    }

    // Set rider offline if they're online (they need to go online again after unblocking)
    await RiderLocation.findOneAndUpdate({ riderId }, { online: false });

    // Notify rider
    try {
      await createAndSendNotification(riderId, {
        type: "payment_unblocked",
        title: "✅ Account Unblocked",
        message:
          "Your account has been unblocked. You can now go online and accept orders.",
      });
    } catch {}

    try {
      io.to(`user:${riderId}`).emit(SocketEvents.PAYOUT_PAID, {
        riderId: riderId.toString(),
        unblocked: true,
      });
    } catch {}

    res.json({
      success: true,
      message: "Rider unblocked successfully",
      rider: {
        id: rider._id,
        fullName: rider.fullName,
        email: rider.email,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Manually deactivate a rider account (admin only)
 * PATCH /api/admin/riders/:riderId/deactivate
 */
export const deactivateRiderAccount = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin only" });
    }

    const { riderId } = req.params;
    const { reason } = req.body || {};

    const rider = await User.findById(riderId);
    if (!rider) {
      return res.status(404).json({ success: false, error: "Rider not found" });
    }

    if (rider.role !== "rider") {
      return res
        .status(400)
        .json({ success: false, error: "User is not a rider" });
    }

    if (rider.accountDeactivated) {
      return res
        .status(400)
        .json({ success: false, error: "Account is already deactivated" });
    }

    // Deactivate the account
    await User.findByIdAndUpdate(riderId, {
      accountDeactivated: true,
      accountDeactivatedAt: new Date(),
      accountDeactivatedReason:
        reason ||
        `Account manually deactivated by admin ${
          req.user.email || req.user._id
        }`,
      paymentBlocked: true, // Also block payment
      paymentBlockedAt: new Date(),
    });

    // Set rider offline
    await RiderLocation.findOneAndUpdate({ riderId }, { online: false });

    // Notify rider
    try {
      await createAndSendNotification(riderId, {
        type: "account_deactivated",
        title: "🚫 Account Deactivated",
        message:
          reason ||
          "Your account has been deactivated by an administrator. Please contact support for more information.",
      });
    } catch {}

    res.json({
      success: true,
      message: "Rider account deactivated successfully",
      rider: {
        id: rider._id,
        fullName: rider.fullName,
        email: rider.email,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Reactivate a deactivated rider account (admin only)
 * PATCH /api/admin/riders/:riderId/reactivate
 */
export const reactivateRiderAccount = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin only" });
    }

    const { riderId } = req.params;

    const rider = await User.findById(riderId);
    if (!rider) {
      return res.status(404).json({ success: false, error: "Rider not found" });
    }

    if (rider.role !== "rider") {
      return res
        .status(400)
        .json({ success: false, error: "User is not a rider" });
    }

    if (!rider.accountDeactivated) {
      return res
        .status(400)
        .json({ success: false, error: "Account is not deactivated" });
    }

    // Reactivate the account (but keep payment blocked if it was blocked)
    const updateData = {
      accountDeactivated: false,
      accountDeactivatedAt: null,
      accountDeactivatedReason: null,
    };

    // Only unblock payment if admin explicitly wants to
    const { unblockPayment } = req.body || {};
    if (unblockPayment) {
      updateData.paymentBlocked = false;
      updateData.paymentBlockedAt = null;
      updateData.paymentBlockedReason = null;
    }

    await User.findByIdAndUpdate(riderId, updateData);

    // Notify rider
    try {
      await createAndSendNotification(riderId, {
        type: "account_reactivated",
        title: "✅ Account Reactivated",
        message:
          "Your account has been reactivated. You can now access the platform.",
      });
    } catch {}

    res.json({
      success: true,
      message: "Rider account reactivated successfully",
      rider: {
        id: rider._id,
        fullName: rider.fullName,
        email: rider.email,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
