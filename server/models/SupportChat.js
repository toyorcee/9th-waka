import mongoose from "mongoose";

const supportChatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "closed", "waiting"],
      default: "waiting",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

supportChatSchema.index({ userId: 1, status: 1 });
supportChatSchema.index({ adminId: 1, status: 1 });
supportChatSchema.index({ lastMessageAt: -1 });

const SupportChat = mongoose.model("SupportChat", supportChatSchema);

export default SupportChat;
