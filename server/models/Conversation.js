import mongoose from "mongoose";

/**
 * Conversation metadata model
 * Tracks user-specific conversation preferences (archived, deleted)
 * while keeping messages accessible for admin/dispute resolution
 */
const conversationSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    // Soft delete - admin can still view for disputes
    deletedByUser: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
conversationSchema.index({ userId: 1, orderId: 1 }, { unique: true });
conversationSchema.index({ userId: 1, archived: 1, deleted: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;

