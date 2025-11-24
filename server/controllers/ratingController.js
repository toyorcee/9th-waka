import { SocketEvents } from "../constants/socketEvents.js";
import Order from "../models/Order.js";
import Rating from "../models/Rating.js";
import User from "../models/User.js";
import { io } from "../server.js";
import { createAndSendNotification } from "../services/notificationService.js";

/**
 * Create or update rating for a rider
 * POST /api/ratings/order/:id
 *
 * Mathematics for rating aggregation:
 * - When a NEW rating is added:
 *   averageRating = (oldSum + newRating) / (oldCount + 1)
 *   totalRatings = oldCount + 1
 *
 * - When an EXISTING rating is UPDATED:
 *   averageRating = (oldSum - oldRating + newRating) / oldCount
 *   totalRatings remains the same
 *
 * - General formula: averageRating = Σ(all ratings) / count
 *
 * Example:
 * - Rider has 3 ratings: [5, 4, 5] → average = 14/3 = 4.67
 * - New rating of 3 added: average = (14 + 3) / 4 = 4.25
 * - Rating 5 updated to 4: average = (14 - 5 + 4) / 3 = 13/3 = 4.33
 */
export const createRating = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "User is not defined",
      });
    }

    if (req.user.role !== "customer") {
      return res
        .status(403)
        .json({ success: false, error: "Only customers can rate riders" });
    }

    const { rating, comment } = req.body || {};
    const orderId = req.params.id;

    // Validate rating
    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: "Rating must be a number between 1 and 5",
      });
    }

    // Find order
    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });

    // Check if customer owns the order
    if (String(order.customerId) !== String(req.user._id))
      return res
        .status(403)
        .json({ success: false, error: "You can only rate your own orders" });

    // Check if order is delivered
    if (order.status !== "delivered")
      return res.status(400).json({
        success: false,
        error: "You can only rate delivered orders",
      });

    // Check if rider exists
    if (!order.riderId)
      return res.status(400).json({
        success: false,
        error: "Order has no assigned rider",
      });

    // Check if rating already exists
    const existingRating = await Rating.findOne({ orderId });
    const isUpdate = !!existingRating;
    let oldRatingValue = 0;

    if (existingRating) {
      // Store old rating value for recalculation
      oldRatingValue = existingRating.rating;

      // Update existing rating
      existingRating.rating = rating;
      if (comment !== undefined) existingRating.comment = comment || null;
      await existingRating.save();
    } else {
      // Create new rating
      await Rating.create({
        orderId,
        customerId: order.customerId,
        riderId: order.riderId,
        rating,
        comment: comment || null,
      });
    }

    // Get current rider stats
    const rider = await User.findById(order.riderId).select(
      "averageRating totalRatings"
    );
    const currentAverage = rider.averageRating || 0;
    const currentCount = rider.totalRatings || 0;

    // Calculate new average rating using proper mathematics
    let newAverage;
    let newCount;

    if (isUpdate) {
      // UPDATE: Recalculate average by replacing old rating
      // Formula: newAverage = (oldSum - oldRating + newRating) / count
      // Where oldSum = currentAverage * currentCount
      const oldSum = currentAverage * currentCount;
      const newSum = oldSum - oldRatingValue + rating;
      newAverage = currentCount > 0 ? newSum / currentCount : rating;
      newCount = currentCount; // Count stays the same
    } else {
      // NEW RATING: Add new rating to average
      // Formula: newAverage = (oldSum + newRating) / (oldCount + 1)
      // Where oldSum = currentAverage * currentCount
      const oldSum = currentAverage * currentCount;
      const newSum = oldSum + rating;
      newCount = currentCount + 1;
      newAverage = newSum / newCount;
    }

    // Update rider's average rating (rounded to 1 decimal place)
    await User.findByIdAndUpdate(order.riderId, {
      averageRating: Math.round(newAverage * 10) / 10,
      totalRatings: newCount,
    });

    // Notify rider
    try {
      await createAndSendNotification(order.riderId, {
        type: isUpdate ? "rating_updated" : "rating_received",
        title: isUpdate ? "Rating Updated" : "New Rating Received",
        message: `You received a ${rating}-star rating${
          isUpdate ? " (updated)" : ""
        } for order #${String(order._id).slice(-8)}`,
        metadata: { orderId: order._id.toString() },
      });
    } catch {}

    // Emit socket event
    try {
      io.to(`user:${order.riderId}`).emit(SocketEvents.RATING_RECEIVED, {
        orderId: order._id.toString(),
        rating: rating,
        averageRating: Math.round(newAverage * 10) / 10,
        totalRatings: newCount,
      });
    } catch {}

    // Get the rating document to return
    const ratingDoc = existingRating || (await Rating.findOne({ orderId }));

    res.json({ success: true, rating: ratingDoc });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Get rating for an order
 * GET /api/ratings/order/:id
 */
export const getRating = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "User is not defined",
      });
    }

    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });

    // Check permissions
    const isOwner = String(order.customerId) === String(req.user._id);
    const isRider =
      order.riderId && String(order.riderId) === String(req.user._id);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isRider && !isAdmin)
      return res.status(403).json({ success: false, error: "Forbidden" });

    const rating = await Rating.findOne({ orderId }).populate(
      "customerId",
      "fullName profilePicture"
    );

    res.json({ success: true, rating: rating || null });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Get all ratings for a rider
 * GET /api/ratings/rider/:riderId
 *
 * Returns paginated list of all ratings for a specific rider
 */
export const getRiderRatings = async (req, res) => {
  try {
    const riderId = req.params.riderId;
    const { limit = 20, skip = 0 } = req.query || {};

    const rider = await User.findById(riderId);
    if (!rider || rider.role !== "rider")
      return res.status(404).json({ success: false, error: "Rider not found" });

    const ratings = await Rating.find({ riderId })
      .populate("customerId", "fullName profilePicture")
      .populate("orderId", "items pickup dropoff createdAt")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean();

    const total = await Rating.countDocuments({ riderId });

    const riderStats = await User.findById(riderId).select(
      "averageRating totalRatings"
    );

    res.json({
      success: true,
      ratings,
      total,
      riderStats: {
        averageRating: riderStats?.averageRating || 0,
        totalRatings: riderStats?.totalRatings || 0,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
