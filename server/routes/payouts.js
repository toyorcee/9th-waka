import express from "express";
import {
  generatePayoutsForWeek,
  listPayouts,
  markPayoutPaid,
} from "../controllers/payoutController.js";
import { adminOnly, protect } from "../middleware/auth.js";

const router = express.Router();

// Admin: generate weekly payouts (idempotent)
router.post("/generate", protect, adminOnly, generatePayoutsForWeek);

// Admin: list payouts, filter by rider/status/weekStart
router.get("/", protect, adminOnly, listPayouts);

// Admin: mark payout as paid
router.patch("/:id/mark-paid", protect, adminOnly, markPayoutPaid);

export default router;
