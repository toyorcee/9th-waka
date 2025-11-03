import { SocketEvents } from "../constants/socketEvents.js";
import User from "../models/User.js";
import { io } from "../server.js";

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

    const { fullName, phoneNumber } = req.body || {};

    if (typeof fullName !== "undefined") user.fullName = fullName || null;
    if (typeof phoneNumber !== "undefined")
      user.phoneNumber = phoneNumber || null;

    await user.save();

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
      },
    });
    try {
      io.to(`user:${user._id}`).emit(SocketEvents.PROFILE_UPDATED, {
        userId: user._id.toString(),
      });
    } catch {}
  } catch (e) {
    console.error("❌ [PROFILE] Error updating profile:", e);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
