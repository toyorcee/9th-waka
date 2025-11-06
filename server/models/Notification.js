import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        // Payment
        "payment_reminder",
        "payment_day",
        // Orders
        "order_created",
        "order_assigned",
        "order_status_updated",
        // Delivery
        "delivery_otp",
        "delivery_verified",
        "delivery_proof_updated",
        // Account
        "auth_verified",
        "profile_updated",
        // Legacy (for backward compatibility)
        "verification",
        "welcome",
        "order",
        "system",
        // Payouts
        "payout_generated",
        "payout_paid",
        // Price negotiation
        "price_change_requested",
        "price_change_accepted",
        "price_change_rejected",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: Object, default: {} },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
