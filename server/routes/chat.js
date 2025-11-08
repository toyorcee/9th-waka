import express from "express";
import {
    getMyConversations,
    getOrderMessages,
    markOrderMessagesAsRead,
    sendOrderMessage,
} from "../controllers/chatController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all conversations for current user
router.get("/conversations", getMyConversations);

// Order-specific chat routes
router.get("/orders/:orderId/messages", getOrderMessages);
router.post("/orders/:orderId/messages", sendOrderMessage);
router.patch("/orders/:orderId/read", markOrderMessagesAsRead);

export default router;

