import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
      index: true,
    },
    properties: {
      type: Object,
      default: {},
    },

    userRole: {
      type: String,
      enum: ["customer", "rider"],
      index: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

analyticsEventSchema.index({ userId: 1, event: 1, createdAt: -1 });

analyticsEventSchema.index({ event: 1, createdAt: -1 });

const AnalyticsEvent = mongoose.model("AnalyticsEvent", analyticsEventSchema);
export default AnalyticsEvent;
