import Order from "../models/Order.js";
import RiderLocation from "../models/RiderLocation.js";
import RiderPayout from "../models/RiderPayout.js";

// Get current week range (Sunday to Saturday)
function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday
  const diff = d.getDate() - day; // Go back to Sunday
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7); // Saturday (end of week, exclusive)
  return { start, end };
}

export const getEarnings = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "rider") {
      return res.status(403).json({ success: false, error: "Rider only" });
    }

    const { start, end } = getWeekRange();

    const weekOrders = await Order.find({
      riderId: req.user._id,
      status: "delivered",
      "delivery.deliveredAt": { $gte: start, $lt: end },
    })
      .select(
        "_id price financial delivery.deliveredAt pickup dropoff items createdAt"
      )
      .sort({ "delivery.deliveredAt": -1 });

    const weeklyTotals = weekOrders.reduce(
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

    // Get all-time totals (for history)
    const allTimeOrders = await Order.find({
      riderId: req.user._id,
      status: "delivered",
    }).select("financial price");

    const allTimeTotals = allTimeOrders.reduce(
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

    // Get current week payout (if generated)
    const currentPayout = await RiderPayout.findOne({
      riderId: req.user._id,
      weekStart: start,
    });

    // Format trip earnings
    const trips = weekOrders.map((order) => {
      const fin = order.financial || {
        grossAmount: order.price || 0,
        commissionAmount: 0,
        riderNetAmount: order.price || 0,
      };
      return {
        orderId: order._id.toString(),
        deliveredAt: order.delivery?.deliveredAt || order.createdAt,
        pickup: order.pickup?.address || "",
        dropoff: order.dropoff?.address || "",
        items: order.items || "",
        grossAmount: fin.grossAmount || 0,
        commissionAmount: fin.commissionAmount || 0,
        riderNetAmount: fin.riderNetAmount || 0,
        price: order.price || 0,
      };
    });

    res.json({
      success: true,
      currentWeek: {
        weekStart: start,
        weekEnd: end,
        totals: weeklyTotals,
        trips,
        payout: currentPayout
          ? {
              id: currentPayout._id.toString(),
              status: currentPayout.status,
              paidAt: currentPayout.paidAt,
            }
          : null,
      },
      allTime: {
        totals: allTimeTotals,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const updatePresence = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "rider") {
      return res.status(403).json({ success: false, error: "Rider only" });
    }
    const { online, lat, lng } = req.body || {};
    if (typeof online !== "boolean") {
      return res
        .status(400)
        .json({ success: false, error: "online must be boolean" });
    }

    const update = {
      riderId: req.user._id,
      online,
      lastSeen: new Date(),
    };
    if (typeof lat === "number" && typeof lng === "number") {
      update.location = { type: "Point", coordinates: [lng, lat] };
    }

    const doc = await RiderLocation.findOneAndUpdate(
      { riderId: req.user._id },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, presence: doc });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
