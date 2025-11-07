import express from "express";
import {
  getAllActiveRiderLocations,
  getEarnings,
  getOrderLocationHistory,
  getRiderLocationForOrder,
  hasActiveOrders,
  updatePresence,
} from "../controllers/riderController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/earnings", protect, getEarnings);
router.post("/presence", protect, updatePresence);
router.get("/active-orders", protect, hasActiveOrders);
router.get("/location/order/:orderId", protect, getRiderLocationForOrder);
router.get("/location/history/:orderId", protect, getOrderLocationHistory);
router.get("/locations/all", protect, getAllActiveRiderLocations);

export default router;
