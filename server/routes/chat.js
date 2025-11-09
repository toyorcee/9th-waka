import express from "express";
import {
  archiveConversation,
  deleteConversation,
  getAdminSupportChats,
  getMyConversations,
  getOnlineAdmins,
  getOrCreateSupportChat,
  getOrderMessages,
  getSupportChat,
  getSupportMessages,
  markOrderMessagesAsRead,
  markSupportMessagesAsRead,
  sendOrderMessage,
  sendSupportMessage,
} from "../controllers/chatController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/conversations", getMyConversations);

router.delete("/conversations/:orderId", deleteConversation);
router.patch("/conversations/:orderId/archive", archiveConversation);

router.get("/orders/:orderId/messages", getOrderMessages);
router.post("/orders/:orderId/messages", sendOrderMessage);
router.patch("/orders/:orderId/read", markOrderMessagesAsRead);

router.get("/support/online-admins", getOnlineAdmins);
router.get("/support/chat", getOrCreateSupportChat);
router.get("/support/admin/chats", getAdminSupportChats);
router.get("/support/:supportChatId", getSupportChat); // Get specific chat by ID
router.get("/support/:supportChatId/messages", getSupportMessages);
router.post("/support/:supportChatId/messages", sendSupportMessage);
router.patch("/support/:supportChatId/read", markSupportMessagesAsRead);

export default router;
