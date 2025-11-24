import express from "express";
import {
  forgotPassword,
  getCurrentUser,
  login,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
  verifyResetCode,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/verify", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/forgotpassword", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.put("/resetpassword/:resettoken", resetPassword);

// Protected routes (require authentication)
router.get("/me", protect, getCurrentUser);

export default router;
