import mongoose from "mongoose";

const RatingSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: null,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Ensure one rating per order (customer can only rate once per order)
RatingSchema.index({ orderId: 1 }, { unique: true });

// Index for efficient queries
RatingSchema.index({ riderId: 1, createdAt: -1 });

const Rating = mongoose.model("Rating", RatingSchema);

export default Rating;
