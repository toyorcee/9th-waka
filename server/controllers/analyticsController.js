/**
 * Analytics Controller
 * Handles tracking user events for analytics
 */

import AnalyticsEvent from "../models/AnalyticsEvent.js";
import User from "../models/User.js";

/**
 * Track an analytics event
 * @route POST /api/analytics/track
 * @access Private
 */
export const trackEvent = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const { event, properties, timestamp, metadata } = req.body;

    if (!event || typeof event !== "string") {
      return res.status(400).json({
        success: false,
        error: "Event name is required",
      });
    }

    let userRole = null;
    try {
      const user = await User.findById(userId).select("role");
      userRole = user?.role || null;
    } catch (err) {}

    const analyticsEvent = await AnalyticsEvent.create({
      userId,
      event,
      properties: properties || {},
      userRole,
      metadata: metadata || {},
    });

    console.log(`📊 [ANALYTICS] Event tracked:`, {
      id: analyticsEvent._id,
      userId,
      event,
      userRole,
      properties: properties || {},
    });

    return res.json({
      success: true,
      message: "Event tracked",
      eventId: analyticsEvent._id,
    });
  } catch (error) {
    console.error("❌ [ANALYTICS] Error tracking event:", error);
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};
