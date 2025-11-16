import mongoose from "mongoose";

const PayoutOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    deliveredAt: { type: Date, required: true },
    grossAmount: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    riderNetAmount: { type: Number, required: true },
  },
  { _id: false }
);

const RiderPayoutSchema = new mongoose.Schema(
  {
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    orders: { type: [PayoutOrderSchema], default: [] },
    totals: {
      gross: { type: Number, default: 0 },
      commission: { type: Number, default: 0 },
      riderNet: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
    paidAt: { type: Date, default: null },
    // Track who marked it as paid (for admin verification)
    markedPaidBy: {
      type: String,
      enum: ["rider", "admin"],
      default: null,
    },
    markedPaidByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Payment proof screenshot (uploaded by rider)
    paymentProofScreenshot: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

RiderPayoutSchema.index({ riderId: 1, weekStart: 1 }, { unique: true });

const RiderPayout = mongoose.model("RiderPayout", RiderPayoutSchema);
export default RiderPayout;
