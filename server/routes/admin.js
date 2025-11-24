import express from "express";
import {
  adminCancelOrder,
  getAdminStats,
  getAllCustomers,
  getAllOrders,
  getAllRiders,
} from "../controllers/adminController.js";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { adminOnly, protect } from "../middleware/auth.js";

const router = express.Router();

// Admin Dashboard Stats
router.get("/stats", protect, adminOnly, getAdminStats);

// Admin Orders
router.get("/orders", protect, adminOnly, getAllOrders);
router.patch("/orders/:id/cancel", protect, adminOnly, adminCancelOrder);

// Admin Riders
router.get("/riders", protect, adminOnly, getAllRiders);

// Admin Customers
router.get("/customers", protect, adminOnly, getAllCustomers);

// Admin Settings (Rates)
router.get("/settings", protect, adminOnly, getSettings);
router.put("/settings", protect, adminOnly, updateSettings);

export default router;
