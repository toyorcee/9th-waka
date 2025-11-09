import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    delivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
chatMessageSchema.index({ orderId: 1, createdAt: -1 });
chatMessageSchema.index({ senderId: 1, receiverId: 1 });
chatMessageSchema.index({ read: 1, receiverId: 1 });
chatMessageSchema.index({ delivered: 1, receiverId: 1 });

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

export default ChatMessage;
