import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema(
  {
    // Delivery pricing rates
    pricing: {
      minFare: {
        type: Number,
        default: 800,
        min: 0,
      },
      perKmShort: {
        type: Number,
        default: 100,
        min: 0,
      },
      perKmMedium: {
        type: Number,
        default: 140,
        min: 0,
      },
      perKmLong: {
        type: Number,
        default: 200,
        min: 0,
      },
      shortDistanceMax: {
        type: Number,
        default: 8,
        min: 0,
      },
      mediumDistanceMax: {
        type: Number,
        default: 15,
        min: 0,
      },
      // Vehicle type multipliers
      vehicleMultipliers: {
        bicycle: {
          type: Number,
          default: 0.8,
          min: 0,
        },
        motorbike: {
          type: Number,
          default: 1.0,
          min: 0,
        },
        tricycle: {
          type: Number,
          default: 1.15,
          min: 0,
        },
        car: {
          type: Number,
          default: 1.25,
          min: 0,
        },
        van: {
          type: Number,
          default: 1.5,
          min: 0,
        },
      },
    },
    // Commission rate (percentage)
    commissionRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    // System settings
    system: {
      // Whether to use database rates or env vars
      useDatabaseRates: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists
SettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const Settings = mongoose.model("Settings", SettingsSchema);

export default Settings;

