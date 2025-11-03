import express from "express";
import {
  acceptOrder,
  createOrder,
  generateDeliveryOtp,
  getAvailableOrders,
  getMyOrders,
  getOrder,
  updateDeliveryProof,
  updateStatus,
  verifyDeliveryOtp,
} from "../controllers/orderController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Customer
router.post("/", protect, createOrder);
router.get("/mine", protect, getMyOrders);

// Rider
router.get("/available", protect, getAvailableOrders);
router.patch("/:id/accept", protect, acceptOrder);
router.patch("/:id/status", protect, updateStatus);
router.post("/:id/delivery/otp", protect, generateDeliveryOtp);
router.post("/:id/delivery/verify", protect, verifyDeliveryOtp);
router.patch("/:id/delivery", protect, updateDeliveryProof);

// Common
router.get("/:id", protect, getOrder);

export default router;
