import { SocketEvents } from "../constants/socketEvents.js";
import LocationHistory from "../models/LocationHistory.js";
import Order from "../models/Order.js";
import RiderLocation from "../models/RiderLocation.js";
import RiderPayout from "../models/RiderPayout.js";
import { io } from "../server.js";

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
    let locationUpdated = false;
    if (typeof lat === "number" && typeof lng === "number") {
      update.location = { type: "Point", coordinates: [lng, lat] };
      locationUpdated = true;
    }

    const doc = await RiderLocation.findOneAndUpdate(
      { riderId: req.user._id },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (
      locationUpdated &&
      online &&
      typeof lat === "number" &&
      typeof lng === "number"
    ) {
      const activeOrders = await Order.find({
        riderId: req.user._id,
        status: { $in: ["assigned", "picked_up", "delivering"] },
      }).select("_id customerId");

      const locationData = {
        riderId: req.user._id.toString(),
        lat,
        lng,
        timestamp: new Date().toISOString(),
      };

      for (const order of activeOrders) {
        io.to(`user:${order.customerId}`).emit(
          SocketEvents.RIDER_LOCATION_UPDATED,
          {
            orderId: order._id.toString(),
            ...locationData,
          }
        );

        try {
          const lastHistory = await LocationHistory.findOne({
            orderId: order._id,
          })
            .sort({ timestamp: -1 })
            .lean();

          const shouldStore =
            !lastHistory ||
            new Date().getTime() - new Date(lastHistory.timestamp).getTime() >
              120000;

          if (shouldStore) {
            await LocationHistory.create({
              orderId: order._id,
              riderId: req.user._id,
              location: { type: "Point", coordinates: [lng, lat] },
              timestamp: new Date(),
            });
          }
        } catch (err) {
          console.error("❌ [LOCATION] Error saving location history:", err);
          // Don't block the response if history saving fails
        }
      }
    }

    res.json({ success: true, presence: doc });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const hasActiveOrders = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "rider") {
      return res.status(403).json({ success: false, error: "Rider only" });
    }

    const activeOrders = await Order.find({
      riderId: req.user._id,
      status: { $in: ["assigned", "picked_up", "delivering"] },
    })
      .select("_id status")
      .lean();

    res.json({
      success: true,
      hasActiveOrders: activeOrders.length > 0,
      activeOrderCount: activeOrders.length,
      orders: activeOrders,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// Get rider location for a specific order (for customers and admin)
export const getRiderLocationForOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, error: "Order ID required" });
    }

    const order = await Order.findById(orderId).select(
      "riderId customerId status"
    );
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const user = req.user;
    const isOwner = String(order.customerId) === String(user._id);
    const isAdmin = user.role === "admin";
    const isRider = order.riderId && String(order.riderId) === String(user._id);

    if (!isOwner && !isAdmin && !isRider) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    if (!order.riderId) {
      return res.status(404).json({
        success: false,
        error: "No rider assigned to this order",
      });
    }

    // Only return location for active orders
    if (!["assigned", "picked_up", "delivering"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: "Rider location is only available for active orders",
      });
    }

    const riderLocation = await RiderLocation.findOne({
      riderId: order.riderId,
    }).select("location lastSeen online");

    if (!riderLocation || !riderLocation.location?.coordinates) {
      return res.status(404).json({
        success: false,
        error: "Rider location not available",
      });
    }

    const [lng, lat] = riderLocation.location.coordinates;
    res.json({
      success: true,
      location: {
        lat,
        lng,
        lastSeen: riderLocation.lastSeen,
        online: riderLocation.online,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// Get location history for an order (for customers, riders, and admin)
export const getOrderLocationHistory = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, error: "Order ID required" });
    }

    const order = await Order.findById(orderId).select(
      "riderId customerId status"
    );
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const user = req.user;
    const isOwner = String(order.customerId) === String(user._id);
    const isAdmin = user.role === "admin";
    const isRider = order.riderId && String(order.riderId) === String(user._id);

    if (!isOwner && !isAdmin && !isRider) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // Get location history for this order
    const history = await LocationHistory.find({ orderId })
      .select("location timestamp speed heading")
      .sort({ timestamp: 1 }) // Oldest first
      .lean();

    // Format the response
    const formattedHistory = history.map((entry) => {
      const [lng, lat] = entry.location.coordinates;
      return {
        lat,
        lng,
        timestamp: entry.timestamp,
        speed: entry.speed || null,
        heading: entry.heading || null,
      };
    });

    res.json({
      success: true,
      orderId: orderId.toString(),
      history: formattedHistory,
      count: formattedHistory.length,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// Get all active rider locations (admin only)
export const getAllActiveRiderLocations = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin only" });
    }

    const activeRiders = await RiderLocation.find({
      online: true,
      location: { $exists: true },
    })
      .populate("riderId", "fullName phoneNumber email vehicleType")
      .select("riderId location lastSeen online")
      .lean();

    const locations = activeRiders
      .filter((rider) => {
        return (
          rider.location?.coordinates &&
          Array.isArray(rider.location.coordinates) &&
          rider.location.coordinates.length >= 2
        );
      })
      .map((rider) => {
        const [lng, lat] = rider.location.coordinates;
        return {
          riderId: rider.riderId?._id || rider.riderId,
          riderName: rider.riderId?.fullName || "Unknown",
          riderPhone: rider.riderId?.phoneNumber || null,
          riderEmail: rider.riderId?.email || null,
          vehicleType: rider.riderId?.vehicleType || null,
          location: {
            lat,
            lng,
          },
          lastSeen: rider.lastSeen,
          online: rider.online,
        };
      });

    res.json({ success: true, riders: locations });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
