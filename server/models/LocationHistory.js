import mongoose from "mongoose";

const locationHistorySchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    speed: {
      type: Number,
      default: null, 
    },
    heading: {
      type: Number,
      default: null, 
    },
  },
  { timestamps: true }
);

locationHistorySchema.index({ orderId: 1, timestamp: -1 });
locationHistorySchema.index({ riderId: 1, timestamp: -1 });
locationHistorySchema.index({ location: "2dsphere" });

const LocationHistory = mongoose.model("LocationHistory", locationHistorySchema);

export default LocationHistory;

