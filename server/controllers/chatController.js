import { SocketEvents } from "../constants/socketEvents.js";
import ChatMessage from "../models/ChatMessage.js";
import Order from "../models/Order.js";
import { io } from "../server.js";
import { createAndSendNotification } from "../services/notificationService.js";

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

    // Determine receiver
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

    // Create message
    const chatMessage = new ChatMessage({
      orderId,
      senderId: userId,
      receiverId,
      message: message.trim(),
    });

    await chatMessage.save();

    const populatedMessage = await ChatMessage.findById(chatMessage._id)
      .populate("senderId", "fullName email")
      .populate("receiverId", "fullName email")
      .lean();

    // Emit socket event to receiver
    io.to(`user:${receiverId}`).emit(SocketEvents.CHAT_MESSAGE, {
      message: populatedMessage,
    });

    io.to(`user:${userId}`).emit(SocketEvents.CHAT_MESSAGE, {
      message: populatedMessage,
    });

    // Send notification to receiver
    await createAndSendNotification({
      userId: receiverId,
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
        error: "You don't have access to this order's chat",
      });
    }

    // Mark all unread messages as read
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

    // Emit socket event to sender that messages were read
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

    const orders = await Order.find({
      $or: [{ customerId: userId }, { riderId: userId }],
    })
      .select("_id customerId riderId status createdAt updatedAt")
      .lean();

    const conversations = await Promise.all(
      orders.map(async (order) => {
        const lastMessage = await ChatMessage.findOne({ orderId: order._id })
          .sort({ createdAt: -1 })
          .lean();

        const unreadCount = await ChatMessage.countDocuments({
          orderId: order._id,
          receiverId: userId,
          read: false,
        });

        return {
          _id: order._id.toString(),
          orderId: order._id.toString(),
          participants: {
            customerId: order.customerId.toString(),
            riderId: order.riderId?.toString() || null,
          },
          lastMessage: lastMessage || null,
          unreadCount,
          orderStatus: order.status,
          createdAt: order.createdAt || lastMessage?.createdAt || new Date(),
          updatedAt: lastMessage?.updatedAt || order.updatedAt || new Date(),
        };
      })
    );

    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.updatedAt;
      const bTime = b.lastMessage?.createdAt || b.updatedAt;
      return new Date(bTime) - new Date(aTime);
    });

    res.json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error("[CHAT] Error getting conversations:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get conversations",
    });
  }
};
