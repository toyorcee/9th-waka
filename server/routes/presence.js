import express from "express";
import { getUserPresence } from "../controllers/presenceController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user presence
router.get("/:userId", getUserPresence);

export default router;

