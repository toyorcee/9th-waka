import express from "express";
import {
  createRating,
  getRating,
  getRiderRatings,
} from "../controllers/ratingController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/order/:id", protect, createRating);

router.get("/order/:id", protect, getRating);

router.get("/rider/:riderId", protect, getRiderRatings);

export default router;
