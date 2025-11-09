import RiderLocation from "../models/RiderLocation.js";
import User from "../models/User.js";
import { userConnections } from "../services/socketService.js";

/**
 * Get user presence (online/offline and last seen)
 * Works for both riders and customers using socket connections
 * GET /presence/:userId
 */
export const getUserPresence = async (req, res) => {
  try {
    const { userId } = req.params;

    const targetUser = await User.findById(userId)
      .select("_id role fullName email profilePicture")
      .lean();

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const connections = userConnections.get(userId);
    const isOnline = connections && connections.length > 0;

    let presence = {
      userId: targetUser._id.toString(),
      online: isOnline,
      lastSeen: new Date(),
      profilePicture: targetUser.profilePicture || null,
      fullName: targetUser.fullName || null,
    };

    if (targetUser.role === "rider") {
      const riderLocation = await RiderLocation.findOne({
        riderId: userId,
      }).lean();

      if (riderLocation && riderLocation.lastSeen) {
        presence.lastSeen = riderLocation.lastSeen;
      }
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
