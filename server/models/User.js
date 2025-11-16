import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 6,
      select: false,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["customer", "rider", "admin"],
      default: "customer",
    },
    phoneNumber: {
      type: String,
      default: null,
    },
    fullName: {
      type: String,
      default: null,
    },
    // Default address for customers (KYC)
    defaultAddress: {
      type: String,
      default: null,
    },
    // Address for riders
    address: {
      type: String,
      default: null,
    },
    vehicleType: {
      type: String,
      enum: ["bicycle", "motorbike", "tricycle", "car", "van", null],
      default: null,
    },
    vehiclePicture: {
      type: String,
      default: null,
    },
    searchRadiusKm: {
      type: Number,
      default: 7,
      min: 1,
      max: 20,
    },
    // KYC fields for riders
    nin: {
      type: String,
      default: null,
    },
    bvn: {
      type: String,
      default: null,
    },
    driverLicenseNumber: {
      type: String,
      default: null,
    },
    driverLicensePicture: {
      type: String,
      default: null,
    },
    driverLicenseVerified: {
      type: Boolean,
      default: false,
    },
    ninVerified: {
      type: Boolean,
      default: false,
    },
    bvnVerified: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Email verification fields
    verificationCode: {
      type: String,
      default: null,
    },
    verificationExpires: {
      type: Date,
      default: null,
    },
    // Password reset fields
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpire: {
      type: Date,
      default: null,
    },
    resetPasswordCode: {
      type: String,
      default: null,
    },
    resetPasswordCodeExpires: {
      type: Date,
      default: null,
    },
    // Expo push notification token
    expoPushToken: {
      type: String,
      default: null,
    },
    // Terms acceptance
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    termsAcceptedAt: {
      type: Date,
      default: null,
    },
    // Notification preferences
    notificationPreferences: {
      type: {
        // Payment notifications
        payment_reminder: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
        payment_day: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
        // Order notifications
        order_created: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
        order_assigned: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
        order_status_updated: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
        // Delivery notifications
        delivery_otp: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
        delivery_verified: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
        delivery_proof_updated: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
        // Account notifications
        auth_verified: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
        profile_updated: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
        // Payout notifications
        payout_generated: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
        payout_paid: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
        // Price negotiation
        price_change_requested: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
        price_change_accepted: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
        price_change_rejected: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
      },
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

export default User;
