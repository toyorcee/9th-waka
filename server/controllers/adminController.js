import Order from "../models/Order.js";
import RiderLocation from "../models/RiderLocation.js";
import RiderPayout from "../models/RiderPayout.js";
import User from "../models/User.js";
import { getWeekRange } from "../utils/weekUtils.js";

/**
 * Get admin dashboard statistics
 * GET /api/admin/stats
 */
export const getAdminStats = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin only" });
    }

    // Get order statistics
    const [
      totalOrders,
      pendingOrders,
      activeOrders,
      completedOrders,
      cancelledOrders,
      todayOrders,
    ] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ status: "pending" }),
      Order.countDocuments({
        status: { $in: ["assigned", "picked_up", "delivering"] },
      }),
      Order.countDocuments({ status: "delivered" }),
      Order.countDocuments({ status: "cancelled" }),
      Order.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
    ]);

    // Get rider statistics
    const [totalRiders, onlineRiders, blockedRiders, verifiedRiders] =
      await Promise.all([
        User.countDocuments({ role: "rider" }),
        RiderLocation.countDocuments({ online: true }),
        User.countDocuments({ role: "rider", paymentBlocked: true }),
        User.countDocuments({
          role: "rider",
          driverLicenseVerified: true,
        }),
      ]);

    // Get customer statistics
    const totalCustomers = await User.countDocuments({ role: "customer" });

    // Calculate today's revenue
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayRevenue = await Order.aggregate([
      {
        $match: {
          status: "delivered",
          "payment.status": "paid",
          updatedAt: { $gte: todayStart },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$price" },
        },
      },
    ]);

    const revenue = todayRevenue[0]?.total || 0;

    // Get pending payouts count
    const { start, end } = getWeekRange();
    const pendingPayouts = await RiderPayout.countDocuments({
      status: "pending",
      weekStart: start,
    });

    // Get overdue payouts (past grace period)
    const overduePayouts = await RiderPayout.countDocuments({
      status: "pending",
      weekStart: { $lt: start },
    });

    res.json({
      success: true,
      stats: {
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          active: activeOrders,
          completed: completedOrders,
          cancelled: cancelledOrders,
          today: todayOrders,
        },
        riders: {
          total: totalRiders,
          online: onlineRiders,
          blocked: blockedRiders,
          verified: verifiedRiders,
        },
        customers: {
          total: totalCustomers,
        },
        revenue: {
          today: revenue,
        },
        payouts: {
          pending: pendingPayouts,
          overdue: overduePayouts,
        },
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Get all orders (admin only)
 * GET /api/admin/orders
 */
export const getAllOrders = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin only" });
    }

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(10, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const search = req.query.search?.toString().trim() || "";
    const status = req.query.status?.toString().trim() || "";

    const query = {};

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { items: searchRegex },
        { "pickup.address": searchRegex },
        { "dropoff.address": searchRegex },
        { _id: searchRegex },
      ];
    }

    if (status) {
      query.status = status;
    }

    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate("customerId", "fullName email phoneNumber")
      .populate("riderId", "fullName email phoneNumber vehicleType")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Get all riders (admin only)
 * GET /api/admin/riders
 */
export const getAllRiders = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin only" });
    }

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(10, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const search = req.query.search?.toString().trim() || "";
    const online = req.query.online === "true";
    const blocked = req.query.blocked === "true";
    const verified = req.query.verified === "true";

    const query = { role: "rider" };

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex },
      ];
    }

    if (blocked) {
      query.paymentBlocked = true;
    }

    if (verified) {
      query.driverLicenseVerified = true;
    }

    const total = await User.countDocuments(query);

    const riders = await User.find(query)
      .select(
        "fullName email phoneNumber vehicleType driverLicenseVerified paymentBlocked paymentBlockedAt strikes accountDeactivated averageRating totalRatings searchRadiusKm createdAt isVerified"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get online status for each rider
    const riderIds = riders.map((r) => r._id);
    const riderLocations = await RiderLocation.find({
      riderId: { $in: riderIds },
    })
      .select("riderId online")
      .lean();

    const locationMap = new Map();
    riderLocations.forEach((loc) => {
      locationMap.set(String(loc.riderId), loc.online);
    });

    const ridersWithStatus = riders.map((rider) => ({
      ...rider,
      online: locationMap.get(String(rider._id)) || false,
    }));

    // Filter by online status if requested
    let filteredRiders = ridersWithStatus;
    if (online !== undefined) {
      filteredRiders = ridersWithStatus.filter((r) => r.online === online);
    }

    // Get earnings for each rider
    const { start } = getWeekRange();
    const payouts = await RiderPayout.find({
      riderId: { $in: riderIds },
      weekStart: start,
    })
      .select("riderId totals status")
      .lean();

    const payoutMap = new Map();
    payouts.forEach((p) => {
      payoutMap.set(String(p.riderId), {
        earnings: p.totals.riderNet,
        status: p.status,
      });
    });

    const ridersWithEarnings = filteredRiders.map((rider) => ({
      ...rider,
      currentWeekEarnings: payoutMap.get(String(rider._id)) || null,
    }));

    res.json({
      success: true,
      riders: ridersWithEarnings,
      pagination: {
        page,
        limit,
        total: online !== undefined ? filteredRiders.length : total,
        totalPages: Math.ceil(
          (online !== undefined ? filteredRiders.length : total) / limit
        ),
        hasNextPage:
          page <
          Math.ceil(
            (online !== undefined ? filteredRiders.length : total) / limit
          ),
        hasPrevPage: page > 1,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Get all customers (admin only)
 * GET /api/admin/customers
 */
export const getAllCustomers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin only" });
    }

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(10, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const search = req.query.search?.toString().trim() || "";

    const query = { role: "customer" };

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex },
      ];
    }

    const total = await User.countDocuments(query);

    const customers = await User.find(query)
      .select(
        "fullName email phoneNumber defaultAddress createdAt accountDeactivated role isVerified"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get order statistics for each customer
    const customerIds = customers.map((c) => c._id);
    const orderStats = await Order.aggregate([
      {
        $match: {
          customerId: { $in: customerIds },
        },
      },
      {
        $group: {
          _id: "$customerId",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$price" },
          completedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
        },
      },
    ]);

    const statsMap = new Map();
    orderStats.forEach((stat) => {
      statsMap.set(String(stat._id), {
        totalOrders: stat.totalOrders,
        totalSpent: stat.totalSpent,
        completedOrders: stat.completedOrders,
      });
    });

    const customersWithStats = customers.map((customer) => ({
      ...customer,
      stats: statsMap.get(String(customer._id)) || {
        totalOrders: 0,
        totalSpent: 0,
        completedOrders: 0,
      },
    }));

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      customers: customersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Admin: Cancel any order
 * PATCH /api/admin/orders/:id/cancel
 */
export const adminCancelOrder = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin only" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    if (order.status === "cancelled") {
      return res
        .status(400)
        .json({ success: false, error: "Order already cancelled" });
    }

    if (order.status === "delivered") {
      return res
        .status(400)
        .json({ success: false, error: "Cannot cancel delivered order" });
    }

    order.status = "cancelled";
    appendTimeline(order, "cancelled", "Cancelled by admin");

    await order.save();

    res.json({
      success: true,
      order,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

const appendTimeline = (order, status, note) => {
  order.timeline.push({ status, note, at: new Date() });
};
