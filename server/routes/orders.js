import express from "express";
import {
  acceptOrder,
  cancelOrder,
  createOrder,
  estimatePrice,
  generateDeliveryOtp,
  getAvailableOrders,
  getMyOrders,
  getOrder,
  getRiderOrders,
  requestPriceChange,
  respondToPriceRequest,
  updateDeliveryProof,
  updateStatus,
  uploadDeliveryProofPhoto,
  verifyDeliveryOtp,
} from "../controllers/orderController.js";
import { protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Customer
router.post("/estimate", protect, estimatePrice);
router.post("/", protect, createOrder);
router.get("/mine", protect, getMyOrders);
router.post("/:id/price/respond", protect, respondToPriceRequest);
router.patch("/:id/cancel", protect, cancelOrder);

// Rider
router.get("/available", protect, getAvailableOrders);
router.get("/rider", protect, getRiderOrders);
router.patch("/:id/accept", protect, acceptOrder);
router.patch("/:id/status", protect, updateStatus);
router.post("/:id/price/request", protect, requestPriceChange);
router.post("/:id/delivery/otp", protect, generateDeliveryOtp);
router.post("/:id/delivery/verify", protect, verifyDeliveryOtp);
router.post(
  "/:id/delivery/photo",
  protect,
  upload.single("photo"),
  uploadDeliveryProofPhoto
);
router.patch("/:id/delivery", protect, updateDeliveryProof);

// Common
router.get("/:id", protect, getOrder);

export default router;
