import express from "express";
import { trackEvent } from "../controllers/analyticsController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/track", protect, trackEvent);

export default router;

