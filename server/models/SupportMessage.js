import mongoose from "mongoose";

const supportMessageSchema = new mongoose.Schema(
  {
    supportChatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportChat",
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
      required: false,
      default: null,
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

supportMessageSchema.index({ supportChatId: 1, createdAt: -1 });
supportMessageSchema.index({ senderId: 1, receiverId: 1 });
supportMessageSchema.index({ read: 1, receiverId: 1 });
supportMessageSchema.index({ delivered: 1, receiverId: 1 });

const SupportMessage = mongoose.model("SupportMessage", supportMessageSchema);

export default SupportMessage;
