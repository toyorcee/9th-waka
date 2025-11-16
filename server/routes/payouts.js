import express from "express";
import {
  deactivateRiderAccount,
  generatePayoutsForWeek,
  getBlockedRiders,
  listPayouts,
  markPayoutPaid,
  reactivateRiderAccount,
  unblockRider,
} from "../controllers/payoutController.js";
import { adminOnly, protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Admin: generate weekly payouts (idempotent)
router.post("/generate", protect, adminOnly, generatePayoutsForWeek);

// Riders can list their own payouts, Admins can list all
router.get("/", protect, listPayouts);

router.patch(
  "/:id/mark-paid",
  protect,
  upload.single("paymentProof"),
  (err, req, res, next) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error: "File too large. Maximum size is 5MB.",
        });
      }
      if (err.message.includes("Only image files")) {
        return res.status(400).json({ success: false, error: err.message });
      }
      return res
        .status(400)
        .json({ success: false, error: "File upload error: " + err.message });
    }
    next();
  },
  markPayoutPaid
);

// Admin: Get all blocked riders
router.get("/admin/riders/blocked", protect, adminOnly, getBlockedRiders);

// Admin: Unblock a rider (confirm payment manually)
router.patch(
  "/admin/riders/:riderId/unblock",
  protect,
  adminOnly,
  unblockRider
);

// Admin: Manually deactivate a rider account
router.patch(
  "/admin/riders/:riderId/deactivate",
  protect,
  adminOnly,
  deactivateRiderAccount
);

// Admin: Reactivate a deactivated rider account
router.patch(
  "/admin/riders/:riderId/reactivate",
  protect,
  adminOnly,
  reactivateRiderAccount
);

export default router;
