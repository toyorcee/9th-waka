import Settings from "../models/Settings.js";

/**
 * Get current system settings (including rates)
 * GET /api/admin/settings
 */
export const getSettings = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin only" });
    }

    const settings = await Settings.getSettings();

    res.json({
      success: true,
      settings,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Update system settings (admin only)
 * PUT /api/admin/settings
 */
export const updateSettings = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin only" });
    }

    const settings = await Settings.getSettings();

    // Update pricing rates
    if (req.body.pricing) {
      if (req.body.pricing.minFare !== undefined) {
        settings.pricing.minFare = Number(req.body.pricing.minFare);
      }
      if (req.body.pricing.perKmShort !== undefined) {
        settings.pricing.perKmShort = Number(req.body.pricing.perKmShort);
      }
      if (req.body.pricing.perKmMedium !== undefined) {
        settings.pricing.perKmMedium = Number(req.body.pricing.perKmMedium);
      }
      if (req.body.pricing.perKmLong !== undefined) {
        settings.pricing.perKmLong = Number(req.body.pricing.perKmLong);
      }
      if (req.body.pricing.shortDistanceMax !== undefined) {
        settings.pricing.shortDistanceMax = Number(
          req.body.pricing.shortDistanceMax
        );
      }
      if (req.body.pricing.mediumDistanceMax !== undefined) {
        settings.pricing.mediumDistanceMax = Number(
          req.body.pricing.mediumDistanceMax
        );
      }
      if (req.body.pricing.vehicleMultipliers) {
        Object.keys(req.body.pricing.vehicleMultipliers).forEach((vehicle) => {
          if (
            settings.pricing.vehicleMultipliers[vehicle] !== undefined &&
            req.body.pricing.vehicleMultipliers[vehicle] !== undefined
          ) {
            settings.pricing.vehicleMultipliers[vehicle] = Number(
              req.body.pricing.vehicleMultipliers[vehicle]
            );
          }
        });
      }
    }

    // Update commission rate
    if (req.body.commissionRate !== undefined) {
      settings.commissionRate = Number(req.body.commissionRate);
    }

    // Update system settings
    if (req.body.system) {
      if (req.body.system.useDatabaseRates !== undefined) {
        settings.system.useDatabaseRates =
          req.body.system.useDatabaseRates === true;
      }
    }

    await settings.save();

    res.json({
      success: true,
      settings,
      message: "Settings updated successfully",
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

