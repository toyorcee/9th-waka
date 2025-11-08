import express from "express";
import {
  calculateAddressDistance,
  geocodeSingleAddress,
  getSuggestions,
} from "../controllers/geocodingController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get address suggestions
router.get("/suggestions", getSuggestions);

// Geocode single address
router.post("/geocode", geocodeSingleAddress);

// Calculate distance
router.post("/distance", calculateAddressDistance);

export default router;

