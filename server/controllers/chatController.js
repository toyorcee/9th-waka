import { SocketEvents } from "../constants/socketEvents.js";
import ChatMessage from "../models/ChatMessage.js";
import Conversation from "../models/Conversation.js";
import Order from "../models/Order.js";
import SupportChat from "../models/SupportChat.js";
import SupportMessage from "../models/SupportMessage.js";
import User from "../models/User.js";
import { io } from "../server.js";
import { createAndSendNotification } from "../services/notificationService.js";
import { userConnections } from "../services/socketService.js";

/**
 * Get messages for a specific order
 * GET /chat/orders/:orderId/messages
 */
export const getOrderMessages = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id.toString();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(10, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;

    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    const isCustomer = order.customerId.toString() === userId;
    const isRider = order.riderId && order.riderId.toString() === userId;

    if (!isCustomer && !isRider) {
      return res.status(403).json({
        success: false,
        error: "You don't have access to this order's chat",
      });
    }

    const messages = await ChatMessage.find({ orderId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const reversedMessages = messages.reverse();

    const total = await ChatMessage.countDocuments({ orderId });
    const hasMore = skip + limit < total;

    res.json({
      success: true,
      messages: reversedMessages,
      hasMore,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[CHAT] Error getting messages:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get messages",
    });
  }
};

/**
 * Send a message in an order chat
 * POST /chat/orders/:orderId/messages
 */
export const sendOrderMessage = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { message } = req.body;
    const userId = req.user._id.toString();

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        error: "Message must be 500 characters or less",
      });
    }

    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    const isCustomer = order.customerId.toString() === userId;
    const isRider = order.riderId && order.riderId.toString() === userId;

    if (!isCustomer && !isRider) {
      return res.status(403).json({
        success: false,
        error: "You don't have access to this order's chat",
      });
    }

    let receiverId;
    if (isCustomer) {
      if (!order.riderId) {
        return res.status(400).json({
          success: false,
          error: "No rider assigned to this order yet",
        });
      }
      receiverId = order.riderId.toString();
    } else {
      receiverId = order.customerId.toString();
    }

    const chatMessage = new ChatMessage({
      orderId,
      senderId: userId,
      receiverId,
      message: message.trim(),
    });

    const receiverConnections = userConnections.get(receiverId);
    const isReceiverOnline =
      receiverConnections && receiverConnections.length > 0;

    if (isReceiverOnline) {
      chatMessage.delivered = true;
      chatMessage.deliveredAt = new Date();
    }

    await chatMessage.save();

    const populatedMessage = await ChatMessage.findById(chatMessage._id)
      .populate("senderId", "fullName email")
      .populate("receiverId", "fullName email")
      .lean();

    io.to(`user:${receiverId}`).emit(SocketEvents.CHAT_MESSAGE, {
      message: populatedMessage,
    });

    io.to(`user:${userId}`).emit(SocketEvents.CHAT_MESSAGE, {
      message: populatedMessage,
    });

    if (isReceiverOnline) {
      io.to(`user:${userId}`).emit(SocketEvents.CHAT_MESSAGE_DELIVERED, {
        messageId: chatMessage._id.toString(),
        orderId,
        deliveredAt: chatMessage.deliveredAt,
      });
    }

    // Send notification (don't fail message send if notification fails)
    try {
      await createAndSendNotification(receiverId, {
        type: "order_status_updated",
        title: "New message",
        message: `You have a new message for order #${String(orderId)
          .slice(-6)
          .toUpperCase()}`,
        metadata: {
          orderId: orderId.toString(),
          chatMessageId: chatMessage._id.toString(),
          type: "chat",
        },
      });
    } catch (notificationError) {
      console.error("[CHAT] Error sending notification:", notificationError);
      // Continue even if notification fails
    }

    res.json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    console.error("[CHAT] Error sending message:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to send message",
    });
  }
};

/**
 * Mark messages as read for an order
 * PATCH /chat/orders/:orderId/read
 */
export const markOrderMessagesAsRead = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id.toString();

    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    const isCustomer = order.customerId.toString() === userId;
    const isRider = order.riderId && order.riderId.toString() === userId;

    if (!isCustomer && !isRider) {
      return res.status(403).json({
        success: false,
        error: "You don't have access to this order's chat",
      });
    }

    await ChatMessage.updateMany(
      {
        orderId,
        receiverId: userId,
        delivered: false,
      },
      {
        $set: {
          delivered: true,
          deliveredAt: new Date(),
        },
      }
    );

    const result = await ChatMessage.updateMany(
      {
        orderId,
        receiverId: userId,
        read: false,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

    const senderId = isCustomer
      ? order.riderId?.toString()
      : order.customerId.toString();

    if (senderId) {
      io.to(`user:${senderId}`).emit(SocketEvents.CHAT_MESSAGE_READ, {
        orderId,
        readBy: userId,
        count: result.modifiedCount,
      });
    }

    res.json({
      success: true,
      readCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("[CHAT] Error marking messages as read:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to mark messages as read",
    });
  }
};

/**
 * Get all conversations for the current user
 * GET /chat/conversations
 */
export const getMyConversations = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { archived, search } = req.query; // Optional filters

    const orders = await Order.find({
      $or: [{ customerId: userId }, { riderId: userId }],
    })
      .select("_id customerId riderId status createdAt updatedAt")
      .lean();

    // Get conversation metadata for all orders
    const conversationMetas = await Conversation.find({
      userId,
      orderId: { $in: orders.map((o) => o._id) },
    }).lean();

    const metaMap = {};
    conversationMetas.forEach((meta) => {
      metaMap[meta.orderId.toString()] = meta;
    });

    const conversations = await Promise.all(
      orders.map(async (order) => {
        const meta = metaMap[order._id.toString()];

        if (meta?.deleted) return null;
        if (archived === "true" && !meta?.archived) return null;
        if (archived === "false" && meta?.archived) return null;

        const lastMessage = await ChatMessage.findOne({ orderId: order._id })
          .sort({ createdAt: -1 })
          .lean();

        const unreadCount = await ChatMessage.countDocuments({
          orderId: order._id,
          receiverId: userId,
          read: false,
        });

        const otherPartyId =
          order.customerId.toString() === userId
            ? order.riderId?.toString()
            : order.customerId.toString();
        let otherPartyProfilePicture = null;
        let otherPartyName = null;
        if (otherPartyId) {
          const otherUser = await User.findById(otherPartyId)
            .select("profilePicture fullName")
            .lean();
          if (otherUser) {
            otherPartyProfilePicture = otherUser.profilePicture || null;
            otherPartyName = otherUser.fullName || null;
          }
        }

        return {
          _id: order._id.toString(),
          orderId: order._id.toString(),
          participants: {
            customerId: order.customerId.toString(),
            riderId: order.riderId?.toString() || null,
          },
          otherPartyProfilePicture,
          otherPartyName,
          lastMessage: lastMessage || null,
          unreadCount,
          orderStatus: order.status,
          archived: meta?.archived || false,
          deleted: meta?.deleted || false,
          createdAt: order.createdAt || lastMessage?.createdAt || new Date(),
          updatedAt: lastMessage?.updatedAt || order.updatedAt || new Date(),
        };
      })
    );

    // Filter out nulls
    let filteredConversations = conversations.filter((c) => c !== null);

    // Apply search filter if provided (backend search)
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      const searchUpper = search.toUpperCase().trim();
      filteredConversations = filteredConversations.filter((conv) => {
        // Search by order ID
        const orderId = conv.orderId.slice(-6).toUpperCase();
        if (orderId.includes(searchUpper)) return true;

        // Search by order status
        if (conv.orderStatus?.toLowerCase().includes(searchLower)) return true;

        // Search by last message content
        if (conv.lastMessage?.message?.toLowerCase().includes(searchLower))
          return true;

        return false;
      });
    }

    // Sort by most recent
    filteredConversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.updatedAt;
      const bTime = b.lastMessage?.createdAt || b.updatedAt;
      return new Date(bTime) - new Date(aTime);
    });

    res.json({
      success: true,
      conversations: filteredConversations,
    });
  } catch (error) {
    console.error("[CHAT] Error getting conversations:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get conversations",
    });
  }
};

/**
 * Soft delete a conversation (admin can still view for disputes)
 * DELETE /chat/conversations/:orderId
 */
export const deleteConversation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id.toString();

    // Verify user has access to this order
    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    const isCustomer = order.customerId.toString() === userId;
    const isRider = order.riderId && order.riderId.toString() === userId;

    if (!isCustomer && !isRider) {
      return res.status(403).json({
        success: false,
        error: "You don't have access to this conversation",
      });
    }

    // Create or update conversation metadata
    await Conversation.findOneAndUpdate(
      { userId, orderId },
      {
        $set: {
          deleted: true,
          deletedAt: new Date(),
          deletedByUser: true,
          archived: false, // Unarchive if archived
        },
      },
      { upsert: true, new: true }
    );

    console.log(
      `✅ [CHAT] Conversation deleted (soft) by user ${userId} for order ${orderId}`
    );

    res.json({
      success: true,
      message: "Conversation deleted",
    });
  } catch (error) {
    console.error("[CHAT] Error deleting conversation:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete conversation",
    });
  }
};

/**
 * Archive or unarchive a conversation
 * PATCH /chat/conversations/:orderId/archive
 */
export const archiveConversation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { archived } = req.body;
    const userId = req.user._id.toString();

    if (typeof archived !== "boolean") {
      return res.status(400).json({
        success: false,
        error: "archived field must be a boolean",
      });
    }

    // Verify user has access to this order
    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    const isCustomer = order.customerId.toString() === userId;
    const isRider = order.riderId && order.riderId.toString() === userId;

    if (!isCustomer && !isRider) {
      return res.status(403).json({
        success: false,
        error: "You don't have access to this conversation",
      });
    }

    // Create or update conversation metadata
    await Conversation.findOneAndUpdate(
      { userId, orderId },
      {
        $set: {
          archived: archived,
          archivedAt: archived ? new Date() : null,
        },
      },
      { upsert: true, new: true }
    );

    console.log(
      `✅ [CHAT] Conversation ${
        archived ? "archived" : "unarchived"
      } by user ${userId} for order ${orderId}`
    );

    res.json({
      success: true,
      message: archived ? "Conversation archived" : "Conversation unarchived",
    });
  } catch (error) {
    console.error("[CHAT] Error archiving conversation:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to archive conversation",
    });
  }
};

/**
 * Mark undelivered messages as delivered when user comes online
 * This is called automatically when a user connects via socket
 * @param {string} userId - The user ID who came online
 */
export const markMessagesAsDeliveredOnOnline = async (userId) => {
  try {
    const undeliveredMessages = await ChatMessage.find({
      receiverId: userId,
      delivered: false,
    }).lean();

    if (undeliveredMessages.length === 0) return;

    const messageIds = undeliveredMessages.map((msg) => msg._id);
    const now = new Date();

    // Mark all as delivered
    await ChatMessage.updateMany(
      { _id: { $in: messageIds } },
      {
        $set: {
          delivered: true,
          deliveredAt: now,
        },
      }
    );

    // Group messages by sender and order to emit delivery confirmations
    const messagesBySender = {};
    undeliveredMessages.forEach((msg) => {
      const senderId = msg.senderId.toString();
      if (!messagesBySender[senderId]) {
        messagesBySender[senderId] = [];
      }
      messagesBySender[senderId].push({
        messageId: msg._id.toString(),
        orderId: msg.orderId.toString(),
      });
    });

    // Emit delivery confirmations to all senders
    Object.keys(messagesBySender).forEach((senderId) => {
      messagesBySender[senderId].forEach((msgInfo) => {
        io.to(`user:${senderId}`).emit(SocketEvents.CHAT_MESSAGE_DELIVERED, {
          messageId: msgInfo.messageId,
          orderId: msgInfo.orderId,
          deliveredAt: now,
        });
      });
    });

    console.log(
      `✅ [CHAT] Marked ${undeliveredMessages.length} messages as delivered for user ${userId}`
    );
  } catch (error) {
    console.error(
      "[CHAT] Error marking messages as delivered on online:",
      error
    );
  }
};

/**
 * Check for online admins
 * GET /chat/support/online-admins
 */
export const getOnlineAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" })
      .select("_id email fullName profilePicture")
      .lean();

    const onlineAdmins = admins.filter((admin) => {
      const connections = userConnections.get(admin._id.toString());
      return connections && connections.length > 0;
    });

    res.json({
      success: true,
      onlineAdmins,
      hasOnlineAdmins: onlineAdmins.length > 0,
      totalAdmins: admins.length,
    });
  } catch (error) {
    console.error("[SUPPORT] Error getting online admins:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get online admins",
    });
  }
};

/**
 * Get all support chats assigned to an admin
 * GET /chat/support/admin/chats
 */
export const getAdminSupportChats = async (req, res) => {
  try {
    const adminId = req.user._id.toString();

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin role required.",
      });
    }

    const supportChats = await SupportChat.find({
      adminId,
      status: { $in: ["open", "waiting"] },
    })
      .populate("userId", "fullName email profilePicture role")
      .sort({ lastMessageAt: -1 })
      .lean();

    // Get unread counts and last messages for each chat
    const chatsWithDetails = await Promise.all(
      supportChats.map(async (chat) => {
        const lastMessage = await SupportMessage.findOne({
          supportChatId: chat._id,
        })
          .sort({ createdAt: -1 })
          .lean();

        const unreadCount = await SupportMessage.countDocuments({
          supportChatId: chat._id,
          receiverId: adminId,
          read: false,
        });

        return {
          ...chat,
          lastMessage: lastMessage || null,
          unreadCount,
        };
      })
    );

    res.json({
      success: true,
      chats: chatsWithDetails,
    });
  } catch (error) {
    console.error("[SUPPORT] Error getting admin support chats:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get support chats",
    });
  }
};

/**
 * Get or create support chat for user
 * GET /chat/support/chat
 */
export const getOrCreateSupportChat = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    let supportChat = await SupportChat.findOne({
      userId,
      status: { $in: ["open", "waiting"] },
    })
      .populate("adminId", "fullName email profilePicture")
      .populate("userId", "fullName email profilePicture role")
      .lean();

    if (!supportChat) {
      const admins = await User.find({ role: "admin" }).select("_id").lean();
      const onlineAdmins = admins.filter((admin) => {
        const connections = userConnections.get(admin._id.toString());
        return connections && connections.length > 0;
      });

      let adminId = null;
      if (onlineAdmins.length > 0) {
        adminId = onlineAdmins[0]._id;
      }

      supportChat = new SupportChat({
        userId,
        adminId,
        status: adminId ? "open" : "waiting",
      });

      await supportChat.save();

      supportChat = await SupportChat.findById(supportChat._id)
        .populate("adminId", "fullName email profilePicture")
        .populate("userId", "fullName email profilePicture role")
        .lean();
    }

    res.json({
      success: true,
      supportChat,
    });
  } catch (error) {
    console.error("[SUPPORT] Error getting/creating support chat:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get support chat",
    });
  }
};

/**
 * Get a specific support chat by ID
 * GET /chat/support/:supportChatId
 */
export const getSupportChat = async (req, res) => {
  try {
    const { supportChatId } = req.params;
    const userId = req.user._id.toString();

    const supportChat = await SupportChat.findById(supportChatId)
      .populate("adminId", "fullName email profilePicture")
      .populate("userId", "fullName email profilePicture role")
      .lean();

    if (!supportChat) {
      return res.status(404).json({
        success: false,
        error: "Support chat not found",
      });
    }

    // Check if user has access (must be the user or assigned admin)
    const isUser = supportChat.userId.toString() === userId;
    const isAdmin =
      supportChat.adminId &&
      supportChat.adminId.toString() === userId &&
      req.user.role === "admin";

    if (!isUser && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "You don't have access to this support chat",
      });
    }

    res.json({
      success: true,
      supportChat,
    });
  } catch (error) {
    console.error("[SUPPORT] Error getting support chat:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get support chat",
    });
  }
};

/**
 * Get messages for support chat
 * GET /chat/support/:supportChatId/messages
 */
export const getSupportMessages = async (req, res) => {
  try {
    const { supportChatId } = req.params;
    const userId = req.user._id.toString();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(10, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;

    const supportChat = await SupportChat.findById(supportChatId).lean();
    if (!supportChat) {
      return res.status(404).json({
        success: false,
        error: "Support chat not found",
      });
    }

    // Check if user has access (must be the user or assigned admin)
    const isUser = supportChat.userId.toString() === userId;
    const isAdmin =
      supportChat.adminId &&
      supportChat.adminId.toString() === userId &&
      req.user.role === "admin";

    if (!isUser && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "You don't have access to this support chat",
      });
    }

    const messages = await SupportMessage.find({ supportChatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const reversedMessages = messages.reverse();

    const total = await SupportMessage.countDocuments({ supportChatId });
    const hasMore = skip + limit < total;

    res.json({
      success: true,
      messages: reversedMessages,
      hasMore,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[SUPPORT] Error getting messages:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get messages",
    });
  }
};

/**
 * Send a message in support chat
 * POST /chat/support/:supportChatId/messages
 */
export const sendSupportMessage = async (req, res) => {
  try {
    const { supportChatId } = req.params;
    const { message } = req.body;
    const userId = req.user._id.toString();

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        error: "Message must be 500 characters or less",
      });
    }

    const supportChat = await SupportChat.findById(supportChatId).lean();
    if (!supportChat) {
      return res.status(404).json({
        success: false,
        error: "Support chat not found",
      });
    }

    const isUser = supportChat.userId.toString() === userId;
    const isAdmin =
      supportChat.adminId &&
      supportChat.adminId.toString() === userId &&
      req.user.role === "admin";

    if (!isUser && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "You don't have access to this support chat",
      });
    }

    // Determine receiver
    let receiverId;
    let adminAssigned = false;
    if (isUser) {
      if (!supportChat.adminId) {
        const admins = await User.find({ role: "admin" }).select("_id").lean();
        const onlineAdmins = admins.filter((admin) => {
          const connections = userConnections.get(admin._id.toString());
          return connections && connections.length > 0;
        });

        if (onlineAdmins.length > 0) {
          receiverId = onlineAdmins[0]._id.toString();
          adminAssigned = true;
          await SupportChat.findByIdAndUpdate(supportChatId, {
            adminId: receiverId,
            status: "open",
          });
        } else {
          receiverId = null;
        }
      } else {
        receiverId = supportChat.adminId.toString();
      }
    } else {
      receiverId = supportChat.userId.toString();
    }

    if (adminAssigned && isUser) {
      receiverId = supportChat.adminId.toString();
    }

    const supportMessage = new SupportMessage({
      supportChatId,
      senderId: userId,
      receiverId: receiverId,
      message: message.trim(),
    });

    let isReceiverOnline = false;
    if (supportChat.adminId || adminAssigned) {
      const actualReceiverId = adminAssigned
        ? receiverId
        : supportChat.adminId?.toString();
      if (actualReceiverId) {
        const receiverConnections = userConnections.get(actualReceiverId);
        isReceiverOnline =
          receiverConnections && receiverConnections.length > 0;

        if (isReceiverOnline) {
          supportMessage.delivered = true;
          supportMessage.deliveredAt = new Date();
        }
      }
    }

    // Always save the message, even if no admin is online
    await supportMessage.save();

    if (adminAssigned && isUser) {
      await SupportMessage.updateMany(
        {
          supportChatId,
          senderId: userId,
          receiverId: null,
        },
        {
          $set: {
            receiverId: receiverId,
          },
        }
      );
    }

    await SupportChat.findByIdAndUpdate(supportChatId, {
      lastMessageAt: new Date(),
    });

    const updatedChat = await SupportChat.findById(supportChatId)
      .populate("adminId", "fullName email profilePicture")
      .populate("userId", "fullName email profilePicture role")
      .lean();

    const populatedMessage = await SupportMessage.findById(supportMessage._id)
      .populate("senderId", "fullName email profilePicture role")
      .populate("receiverId", "fullName email profilePicture role")
      .lean();

    const socketEvent = SocketEvents.CHAT_MESSAGE || "chat.message";
    io.emit(socketEvent, {
      message: populatedMessage,
      supportChatId,
      type: "support",
      supportChat: updatedChat,
    });

    if (receiverId && !isReceiverOnline) {
      const receiver = await User.findById(receiverId).select("expoPushToken");
      if (receiver?.expoPushToken) {
        await createAndSendNotification({
          userId: receiverId,
          title: "New Support Message",
          body: `${req.user.fullName || "Someone"}: ${message.substring(
            0,
            50
          )}...`,
          data: {
            type: "support_message",
            supportChatId: supportChatId.toString(),
          },
        });
      }
    }

    res.json({
      success: true,
      message: populatedMessage,
      supportChat: updatedChat, // Include updated chat info in response
    });
  } catch (error) {
    console.error("[SUPPORT] Error sending message:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to send message",
    });
  }
};

/**
 * Mark support messages as read
 * PATCH /chat/support/:supportChatId/read
 */
export const markSupportMessagesAsRead = async (req, res) => {
  try {
    const { supportChatId } = req.params;
    const userId = req.user._id.toString();

    const supportChat = await SupportChat.findById(supportChatId).lean();
    if (!supportChat) {
      return res.status(404).json({
        success: false,
        error: "Support chat not found",
      });
    }

    // Check access
    const isUser = supportChat.userId.toString() === userId;
    const isAdmin =
      supportChat.adminId &&
      supportChat.adminId.toString() === userId &&
      req.user.role === "admin";

    if (!isUser && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "You don't have access to this support chat",
      });
    }

    // Mark all undelivered messages as delivered first
    await SupportMessage.updateMany(
      {
        supportChatId,
        receiverId: userId,
        delivered: false,
      },
      {
        $set: {
          delivered: true,
          deliveredAt: new Date(),
        },
      }
    );

    // Mark all unread messages as read
    const result = await SupportMessage.updateMany(
      {
        supportChatId,
        receiverId: userId,
        read: false,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

    // Emit read receipt
    const senderId = isUser
      ? supportChat.adminId?.toString()
      : supportChat.userId.toString();
    if (senderId) {
      io.emit(SocketEvents.CHAT_MESSAGE_READ || "chat.message_read", {
        supportChatId,
        readBy: userId,
        type: "support",
      });
    }

    res.json({
      success: true,
      markedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("[SUPPORT] Error marking messages as read:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to mark messages as read",
    });
  }
};
