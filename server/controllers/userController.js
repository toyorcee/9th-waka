import { SocketEvents } from "../constants/socketEvents.js";
import User from "../models/User.js";
import { io } from "../server.js";
import { createAndSendNotification } from "../services/notificationService.js";

export const uploadProfilePicture = async (req, res) => {
  console.log("📥 [PROFILE] Upload profile picture request received");

  console.log("📍 Request from:", req.ip || req.connection.remoteAddress);

  console.log("👤 User ID:", req.user?.userId);

  console.log("📦 Request body keys:", Object.keys(req.body || {}));

  console.log(
    "📁 Request file:",
    req.file
      ? {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          filename: req.file.filename,
        }
      : "No file"
  );

  try {
    if (!req.file) {
      console.log("❌ [PROFILE] No file uploaded");
      console.log("📋 Request headers:", req.headers);
      console.log("📋 Request body:", req.body);
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("📸 [PROFILE] File uploaded:", req.file.filename);

    const user = await User.findById(req.user.userId || req.user._id);

    if (!user) {
      console.log("❌ [PROFILE] User not found");
      return res.status(404).json({ error: "User not found" });
    }

    if (user.profilePicture) {
      const fs = await import("fs");
      const path = await import("path");
      const { fileURLToPath } = await import("url");

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      const oldImagePath = path.join(
        __dirname,
        "..",
        "uploads",
        "profiles",
        path.basename(user.profilePicture)
      );

      try {
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log("🗑️ [PROFILE] Old profile picture deleted");
        }
      } catch (err) {
        console.log("⚠️ [PROFILE] Could not delete old picture:", err.message);
      }
    }

    const profilePictureUrl = `/api/uploads/profiles/${req.file.filename}`;

    user.profilePicture = profilePictureUrl;

    await user.save();

    console.log(
      `✅ [PROFILE] Profile picture updated successfully: ${profilePictureUrl}`
    );

    // Notify user
    try {
      await createAndSendNotification(user._id, {
        type: "profile_updated",
        title: "Profile updated",
        message: "Your profile picture has been updated",
      });
    } catch {}

    res.json({
      message: "Profile picture uploaded successfully",
      profilePicture: profilePictureUrl,
      user: {
        id: user._id,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
    try {
      io.to(`user:${user._id}`).emit(SocketEvents.PROFILE_UPDATED, {
        userId: user._id.toString(),
      });
    } catch {}
  } catch (error) {
    console.error("❌ [PROFILE] Error uploading profile picture:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const {
      fullName,
      phoneNumber,
      vehicleType,
      nin,
      bvn,
      defaultAddress,
      address,
    } = req.body || {};

    if (typeof fullName !== "undefined") user.fullName = fullName || null;
    if (typeof phoneNumber !== "undefined")
      user.phoneNumber = phoneNumber || null;
    // Only riders can update vehicleType
    if (typeof vehicleType !== "undefined" && user.role === "rider") {
      if (
        vehicleType === null ||
        vehicleType === "motorcycle" ||
        vehicleType === "car"
      ) {
        user.vehicleType = vehicleType;
      }
    }

    // KYC fields - role-specific
    if (user.role === "rider") {
      if (typeof nin !== "undefined") user.nin = nin || null;
      if (typeof bvn !== "undefined") user.bvn = bvn || null;
      if (typeof address !== "undefined") user.address = address || null;
    } else if (user.role === "customer") {
      if (typeof defaultAddress !== "undefined")
        user.defaultAddress = defaultAddress || null;
    }

    await user.save();

    try {
      await createAndSendNotification(user._id, {
        type: "profile_updated",
        title: "Profile updated",
        message: "Your profile information has been updated",
      });
    } catch {}

          return res.json({
            success: true,
            message: "Profile updated",
            user: {
              id: user._id,
              email: user.email,
              fullName: user.fullName,
              phoneNumber: user.phoneNumber,
              profilePicture: user.profilePicture,
              role: user.role,
              vehicleType: user.vehicleType || null,
              nin: user.nin || null,
              bvn: user.bvn || null,
              defaultAddress: user.defaultAddress || null,
              address: user.address || null,
            },
          });
  } catch (e) {
    console.error("❌ [PROFILE] Error updating profile:", e);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

export const updatePushToken = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const { expoPushToken } = req.body || {};

    if (!expoPushToken || typeof expoPushToken !== "string") {
      return res.status(400).json({
        success: false,
        error: "expoPushToken (string) is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    user.expoPushToken = expoPushToken;
    await user.save();

    console.log(`📱 [PUSH] Token saved for user ${userId}`);

    return res.json({
      success: true,
      message: "Push token updated",
    });
  } catch (e) {
    console.error("❌ [PUSH] Error updating push token:", e);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

export const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const user = await User.findById(userId).select("notificationPreferences");

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.json({
      success: true,
      preferences: user.notificationPreferences || {},
    });
  } catch (e) {
    console.error("❌ [PREFERENCES] Error fetching preferences:", e);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

export const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const { preferences } = req.body || {};

    if (!preferences || typeof preferences !== "object") {
      return res.status(400).json({
        success: false,
        error: "preferences (object) is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Merge preferences
    if (!user.notificationPreferences) {
      user.notificationPreferences = {};
    }

    for (const [key, value] of Object.entries(preferences)) {
      if (value && typeof value === "object") {
        if (!user.notificationPreferences[key]) {
          user.notificationPreferences[key] = {};
        }
        if (typeof value.inApp === "boolean") {
          user.notificationPreferences[key].inApp = value.inApp;
        }
        if (typeof value.push === "boolean") {
          user.notificationPreferences[key].push = value.push;
        }
        if (typeof value.email === "boolean") {
          user.notificationPreferences[key].email = value.email;
        }
      }
    }

    await user.save();

    return res.json({
      success: true,
      message: "Notification preferences updated",
      preferences: user.notificationPreferences,
    });
  } catch (e) {
    console.error("❌ [PREFERENCES] Error updating preferences:", e);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
