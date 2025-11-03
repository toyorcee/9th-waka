import mongoose from "mongoose";

const PointSchema = new mongoose.Schema(
  {
    address: { type: String, required: true },
    lat: { type: Number, required: false },
    lng: { type: Number, required: false },
  },
  { _id: false }
);

const TimelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "picked_up",
        "delivering",
        "delivered",
        "cancelled",
      ],
    },
    note: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    pickup: { type: PointSchema, required: true },
    dropoff: { type: PointSchema, required: true },
    items: { type: String, default: "" },
    price: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "picked_up",
        "delivering",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },
    timeline: { type: [TimelineSchema], default: [] },
    financial: {
      grossAmount: { type: Number, default: 0 },
      commissionRatePct: { type: Number, default: 10 },
      commissionAmount: { type: Number, default: 0 },
      riderNetAmount: { type: Number, default: 0 },
    },
    delivery: {
      photoUrl: { type: String, default: null },
      recipientName: { type: String, default: null },
      recipientPhone: { type: String, default: null },
      otpCode: { type: String, default: null },
      otpExpiresAt: { type: Date, default: null },
      otpVerifiedAt: { type: Date, default: null },
      deliveredAt: { type: Date, default: null },
      note: { type: String, default: null },
    },
    meta: {
      distanceKm: Number,
      etaMin: Number,
      notes: String,
    },
    payment: {
      method: { type: String, default: "cash" },
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
      },
      ref: { type: String, default: null },
    },
  },
  { timestamps: true }
);

OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ riderId: 1, status: 1 });

const Order = mongoose.model("Order", OrderSchema);

export default Order;
