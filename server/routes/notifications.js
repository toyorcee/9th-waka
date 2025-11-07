import express from "express";
import { protect } from "../middleware/auth.js";
import {
  getNotification,
  listNotifications,
  markNotificationRead,
} from "../services/notificationService.js";

const router = express.Router();

router.get("/", protect, async (req, res, next) => {
  try {
    const skip = Number(req.query.skip || 0);
    const limit = Math.min(Number(req.query.limit || 50), 100);
    const { items, total } = await listNotifications(req.user._id, {
      skip,
      limit,
    });
    res.json({ success: true, items, total });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/read", protect, async (req, res, next) => {
  try {
    const updated = await markNotificationRead(req.user._id, req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, error: "Not found" });
    }
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", protect, async (req, res, next) => {
  try {
    const notification = await getNotification(req.user._id, req.params.id);
    if (!notification) {
      return res
        .status(404)
        .json({ success: false, error: "Notification not found" });
    }
    res.json({ success: true, notification });
  } catch (e) {
    next(e);
  }
});

export default router;
