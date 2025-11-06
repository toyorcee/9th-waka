import mongoose from "mongoose";

const riderLocationSchema = new mongoose.Schema(
  {
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
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
    online: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// 2dsphere index for geospatial queries
riderLocationSchema.index({ location: "2dsphere" });
riderLocationSchema.index({ riderId: 1 }, { unique: true });

const RiderLocation = mongoose.model("RiderLocation", riderLocationSchema);

export default RiderLocation;

