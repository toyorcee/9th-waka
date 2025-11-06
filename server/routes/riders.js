import express from "express";
import { getEarnings, updatePresence } from "../controllers/riderController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/earnings", protect, getEarnings);
router.post("/presence", protect, updatePresence);

export default router;
