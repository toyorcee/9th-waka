import express from "express";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  updateProfile,
  updatePushToken,
  uploadProfilePicture,
} from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.post(
  "/profile-picture",
  protect,
  (req, res, next) => {
    console.log("🎯 [ROUTE] POST /api/user/profile-picture hit");
    console.log("📍 Request from:", req.ip || req.connection.remoteAddress);
    console.log("📋 Content-Type:", req.headers["content-type"]);
    console.log("👤 User ID:", req.user?.userId || req.user?._id);
    next();
  },
  upload.single("profilePicture"),
  (err, req, res, next) => {
    if (err) {
      console.error("❌ [MULTER] Error:", err.message);
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ error: "File too large. Maximum size is 5MB." });
      }
      if (err.message.includes("Only image files")) {
        return res.status(400).json({ error: err.message });
      }
      return res
        .status(400)
        .json({ error: "File upload error: " + err.message });
    }
    next();
  },
  uploadProfilePicture
);

export default router;

// PUT /api/user/profile
router.put("/profile", protect, async (req, res, next) => {
  return updateProfile(req, res, next);
});

// POST /api/user/push-token
router.post("/push-token", protect, updatePushToken);

// GET /api/user/notification-preferences
router.get("/notification-preferences", protect, getNotificationPreferences);

// PUT /api/user/notification-preferences
router.put("/notification-preferences", protect, updateNotificationPreferences);
