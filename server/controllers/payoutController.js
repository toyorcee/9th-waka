import { SocketEvents } from "../constants/socketEvents.js";
import Order from "../models/Order.js";
import RiderPayout from "../models/RiderPayout.js";
import { io } from "../server.js";

function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMonday)
  );
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
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

    const results = [];
    for (const [riderId, orders] of byRider.entries()) {
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

    const response = {
      success: true,
      weekStart: start,
      weekEnd: end,
      payouts: results,
    };
    try {
      for (const p of results) {
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
    const { riderId, status, weekStart } = req.query || {};
    const query = {};
    if (riderId) query.riderId = riderId;
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

export const markPayoutPaid = async (req, res) => {
  try {
    const payout = await RiderPayout.findById(req.params.id);
    if (!payout)
      return res
        .status(404)
        .json({ success: false, error: "Payout not found" });
    payout.status = "paid";
    payout.paidAt = new Date();
    await payout.save();
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
