import RiderLocation from "../models/RiderLocation.js";
import User from "../models/User.js";

/**
 * Get user presence (online/offline and last seen)
 * GET /presence/:userId
 */
export const getUserPresence = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id.toString();

    // Get user info
    const targetUser = await User.findById(userId)
      .select("_id role fullName email")
      .lean();

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    let presence = {
      userId: targetUser._id.toString(),
      online: false,
      lastSeen: new Date(),
    };

    // For riders, check RiderLocation
    if (targetUser.role === "rider") {
      const riderLocation = await RiderLocation.findOne({
        riderId: userId,
      }).lean();

      if (riderLocation) {
        presence.online = riderLocation.online || false;
        presence.lastSeen = riderLocation.lastSeen || new Date();
      } else {
        // If no location record, assume offline
        presence.online = false;
        presence.lastSeen = new Date();
      }
    } else {
      // For customers, we can track via socket connections or use a simple approach
      // For now, we'll use a basic approach - could be enhanced with socket tracking
      presence.online = false; // Could be enhanced with socket room tracking
      presence.lastSeen = new Date();
    }

    res.json({
      success: true,
      presence,
    });
  } catch (error) {
    console.error("[PRESENCE] Error getting user presence:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get user presence",
    });
  }
};
