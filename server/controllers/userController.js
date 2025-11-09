import { SocketEvents } from "../constants/socketEvents.js";
import User from "../models/User.js";
import { io } from "../server.js";
// TODO: Uncomment when Dojah API keys are ready
// import { verifyIdentity } from "../services/dojahService.js";
import { createAndSendNotification } from "../services/notificationService.js";

export const uploadProfilePicture = async (req, res) => {
  console.log("📥 [PROFILE] Upload profile picture request received");

  console.log("📍 Request from:", req.ip || req.connection.remoteAddress);

  console.log("👤 User ID:", req.user?.userId);

  console.log("📦 Request body keys:", Object.keys(req.body || {}));

  console.log(
    "📁 Request file:",
    req.file
      ? {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          filename: req.file.filename,
        }
      : "No file"
  );

  try {
    if (!req.file) {
      console.log("❌ [PROFILE] No file uploaded");
      console.log("📋 Request headers:", req.headers);
      console.log("📋 Request body:", req.body);
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("📸 [PROFILE] File uploaded:", req.file.filename);

    const user = await User.findById(req.user.userId || req.user._id);

    if (!user) {
      console.log("❌ [PROFILE] User not found");
      return res.status(404).json({ error: "User not found" });
    }

    if (user.profilePicture) {
      const fs = await import("fs");
      const path = await import("path");
      const { fileURLToPath } = await import("url");

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      const oldImagePath = path.join(
        __dirname,
        "..",
        "uploads",
        "profiles",
        path.basename(user.profilePicture)
      );

      try {
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log("🗑️ [PROFILE] Old profile picture deleted");
        }
      } catch (err) {
        console.log("⚠️ [PROFILE] Could not delete old picture:", err.message);
      }
    }

    const profilePictureUrl = `/api/uploads/profiles/${req.file.filename}`;

    user.profilePicture = profilePictureUrl;

    await user.save();

    console.log(
      `✅ [PROFILE] Profile picture updated successfully: ${profilePictureUrl}`
    );

    // Notify user
    try {
      await createAndSendNotification(user._id, {
        type: "profile_updated",
        title: "Profile updated",
        message: "Your profile picture has been updated",
      });
    } catch {}

    res.json({
      message: "Profile picture uploaded successfully",
      profilePicture: profilePictureUrl,
      user: {
        id: user._id,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
    try {
      io.to(`user:${user._id}`).emit(SocketEvents.PROFILE_UPDATED, {
        userId: user._id.toString(),
      });
    } catch {}
  } catch (error) {
    console.error("❌ [PROFILE] Error uploading profile picture:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const uploadDriverLicense = async (req, res) => {
  console.log("📥 [LICENSE] Upload driver license selfie request received");

  try {
    if (!req.file) {
      console.log("❌ [LICENSE] No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("📸 [LICENSE] File uploaded:", req.file.filename);

    const user = await User.findById(req.user.userId || req.user._id);

    if (!user) {
      console.log("❌ [LICENSE] User not found");
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "rider") {
      return res.status(403).json({ error: "Only riders can upload license" });
    }

    if (user.driverLicensePicture) {
      const fs = await import("fs");
      const path = await import("path");
      const { fileURLToPath } = await import("url");

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      const oldImagePath = path.join(
        __dirname,
        "..",
        "uploads",
        "profiles",
        path.basename(user.driverLicensePicture)
      );

      try {
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log("🗑️ [LICENSE] Old license picture deleted");
        }
      } catch (err) {
        console.log("⚠️ [LICENSE] Could not delete old picture:", err.message);
      }
    }

    const licensePictureUrl = `/api/uploads/profiles/${req.file.filename}`;

    user.driverLicensePicture = licensePictureUrl;

    // Auto-verify driver license when both number and picture are present
    const hasLicenseNumber =
      user.driverLicenseNumber && user.driverLicenseNumber.trim().length > 0;
    const hasLicensePicture =
      user.driverLicensePicture && user.driverLicensePicture.trim().length > 0;

    if (hasLicenseNumber && hasLicensePicture) {
      // TEMPORARY: Auto-verify for testing (remove when Dojah is ready)
      console.log(
        "🧪 [KYC] TEST MODE: Auto-verifying driver license after picture upload"
      );
      user.driverLicenseVerified = true;
    } else {
      user.driverLicenseVerified = false;
    }

    await user.save();

    console.log(
      `✅ [LICENSE] License picture updated successfully: ${licensePictureUrl}`
    );

    // Notify user
    try {
      await createAndSendNotification(user._id, {
        type: "profile_updated",
        title: "License selfie uploaded",
        message: "Your driver license selfie has been uploaded",
      });
    } catch {}

    res.json({
      message: "Driver license selfie uploaded successfully",
      driverLicensePicture: licensePictureUrl,
      user: {
        id: user._id,
        email: user.email,
        driverLicensePicture: user.driverLicensePicture,
        driverLicenseNumber: user.driverLicenseNumber || null,
        driverLicenseVerified: user.driverLicenseVerified || false,
      },
    });
    try {
      io.to(`user:${user._id}`).emit(SocketEvents.PROFILE_UPDATED, {
        userId: user._id.toString(),
      });
    } catch {}
  } catch (error) {
    console.error("❌ [LICENSE] Error uploading license picture:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const uploadVehiclePicture = async (req, res) => {
  console.log("📥 [VEHICLE] Upload vehicle picture request received");

  try {
    if (!req.file) {
      console.log("❌ [VEHICLE] No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("📸 [VEHICLE] File uploaded:", req.file.filename);

    const user = await User.findById(req.user.userId || req.user._id);

    if (!user) {
      console.log("❌ [VEHICLE] User not found");
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "rider") {
      return res
        .status(403)
        .json({ error: "Only riders can upload vehicle picture" });
    }

    if (user.vehiclePicture) {
      const fs = await import("fs");
      const path = await import("path");
      const { fileURLToPath } = await import("url");

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      const oldImagePath = path.join(
        __dirname,
        "..",
        "uploads",
        "profiles",
        path.basename(user.vehiclePicture)
      );

      try {
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log("🗑️ [VEHICLE] Old vehicle picture deleted");
        }
      } catch (err) {
        console.log("⚠️ [VEHICLE] Could not delete old picture:", err.message);
      }
    }

    const vehiclePictureUrl = `/api/uploads/profiles/${req.file.filename}`;

    user.vehiclePicture = vehiclePictureUrl;

    await user.save();

    console.log(
      `✅ [VEHICLE] Vehicle picture updated successfully: ${vehiclePictureUrl}`
    );

    // Notify user
    try {
      await createAndSendNotification(user._id, {
        type: "profile_updated",
        title: "Vehicle picture uploaded",
        message: "Your vehicle picture has been uploaded",
      });
    } catch {}

    res.json({
      message: "Vehicle picture uploaded successfully",
      vehiclePicture: vehiclePictureUrl,
      user: {
        id: user._id,
        email: user.email,
        vehiclePicture: user.vehiclePicture,
      },
    });
    try {
      io.to(`user:${user._id}`).emit(SocketEvents.PROFILE_UPDATED, {
        userId: user._id.toString(),
      });
    } catch {}
  } catch (error) {
    console.error("❌ [VEHICLE] Error uploading vehicle picture:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateSearchRadius = async (req, res) => {
  try {
    if (req.user.role !== "rider") {
      return res
        .status(403)
        .json({
          success: false,
          error: "Only riders can update search radius",
        });
    }

    const { searchRadiusKm } = req.body;

    if (typeof searchRadiusKm !== "number") {
      return res.status(400).json({
        success: false,
        error: "searchRadiusKm must be a number",
      });
    }

    if (searchRadiusKm < 1 || searchRadiusKm > 20) {
      return res.status(400).json({
        success: false,
        error: "Search radius must be between 1km and 20km",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { searchRadiusKm },
      { new: true }
    ).select("searchRadiusKm");

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({
      success: true,
      searchRadiusKm: user.searchRadiusKm,
      message: "Search radius updated successfully",
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const {
      fullName,
      phoneNumber,
      email,
      vehicleType,
      nin,
      bvn,
      defaultAddress,
      address,
      driverLicenseNumber,
    } = req.body || {};

    if (typeof fullName !== "undefined") user.fullName = fullName || null;
    if (typeof phoneNumber !== "undefined")
      user.phoneNumber = phoneNumber || null;

    // Handle email change with uniqueness check
    if (typeof email !== "undefined" && email !== user.email) {
      const newEmail = email.trim().toLowerCase();
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({
          success: false,
          error: "Please provide a valid email address",
        });
      }

      // Check if email is already taken by another user (any role)
      const existingUser = await User.findOne({
        email: newEmail,
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "This email is already taken by another user",
        });
      }

      user.email = newEmail;
      // Reset verification status when email changes
      user.isVerified = false;
      // Generate new verification code
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      user.verificationCode = verificationCode;
      user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000);

      // TODO: Send verification email to new email address
      console.log(
        "📧 [EMAIL] Email changed, verification code:",
        verificationCode
      );
    }
    // Only riders can update vehicleType
    if (typeof vehicleType !== "undefined" && user.role === "rider") {
      if (
        vehicleType === null ||
        vehicleType === "motorcycle" ||
        vehicleType === "car"
      ) {
        user.vehicleType = vehicleType;
      }
    }

    // KYC fields - role-specific
    if (user.role === "rider") {
      // Verify NIN/BVN if provided and changed
      if (typeof nin !== "undefined") {
        const newNin = nin || null;
        const ninChanged = user.nin !== newNin;
        user.nin = newNin;

        // Verify NIN if it's new or changed
        if (newNin && ninChanged) {
          // TODO: Uncomment when Dojah API keys are ready
          // try {
          //   console.log("🔍 [KYC] Verifying NIN for user:", user._id);
          //   const verification = await verifyIdentity(
          //     newNin,
          //     null,
          //     user.fullName?.split(" ")[0] || null,
          //     user.fullName?.split(" ").slice(1).join(" ") || null
          //   );
          //   user.ninVerified =
          //     verification.success && verification.verified === true;
          //
          //   if (user.ninVerified) {
          //     console.log("✅ [KYC] NIN verified successfully");
          //   } else {
          //     console.log("⚠️ [KYC] NIN verification failed:", verification.error);
          //   }
          // } catch (error) {
          //   console.error("❌ [KYC] Error during NIN verification:", error);
          //   user.ninVerified = false;
          // }

          // TEMPORARY: Auto-verify for testing (remove when Dojah is ready)
          console.log(
            "🧪 [KYC] TEST MODE: Auto-verifying NIN for user:",
            user._id
          );
          user.ninVerified = true;
        } else if (!newNin) {
          user.ninVerified = false;
        }
      }

      if (typeof bvn !== "undefined") {
        const newBvn = bvn || null;
        const bvnChanged = user.bvn !== newBvn;
        user.bvn = newBvn;

        // Verify BVN if it's new or changed
        if (newBvn && bvnChanged) {
          // TODO: Uncomment when Dojah API keys are ready
          // try {
          //   console.log("🔍 [KYC] Verifying BVN for user:", user._id);
          //   const firstName = user.fullName?.split(" ")[0] || null;
          //   const lastName = user.fullName?.split(" ").slice(1).join(" ") || null;
          //   const verification = await verifyIdentity(null, newBvn, firstName, lastName);
          //   user.bvnVerified = verification.success && verification.verified === true;
          //
          //   if (user.bvnVerified) {
          //     console.log("✅ [KYC] BVN verified successfully");
          //   } else {
          //     console.log("⚠️ [KYC] BVN verification failed:", verification.error);
          //   }
          // } catch (error) {
          //   console.error("❌ [KYC] Error during BVN verification:", error);
          //   user.bvnVerified = false;
          // }

          // TEMPORARY: Auto-verify for testing (remove when Dojah is ready)
          console.log(
            "🧪 [KYC] TEST MODE: Auto-verifying BVN for user:",
            user._id
          );
          user.bvnVerified = true;
        } else if (!newBvn) {
          user.bvnVerified = false;
        }
      }

      if (typeof address !== "undefined") user.address = address || null;

      // Driver License verification - requires both number and picture
      if (typeof driverLicenseNumber !== "undefined") {
        user.driverLicenseNumber = driverLicenseNumber || null;
      }

      // Auto-verify driver license when both number and picture are present
      const hasLicenseNumber =
        user.driverLicenseNumber && user.driverLicenseNumber.trim().length > 0;
      const hasLicensePicture =
        user.driverLicensePicture &&
        user.driverLicensePicture.trim().length > 0;

      if (hasLicenseNumber && hasLicensePicture) {
        // TODO: Uncomment when Dojah driver license verification is ready
        // try {
        //   console.log("🔍 [KYC] Verifying driver license for user:", user._id);
        //   const verification = await verifyDriverLicense(user.driverLicenseNumber, user.driverLicensePicture);
        //   user.driverLicenseVerified = verification.success && verification.verified === true;
        //
        //   if (user.driverLicenseVerified) {
        //     console.log("✅ [KYC] Driver license verified successfully");
        //   } else {
        //     console.log("⚠️ [KYC] Driver license verification failed:", verification.error);
        //   }
        // } catch (error) {
        //   console.error("❌ [KYC] Error during driver license verification:", error);
        //   user.driverLicenseVerified = false;
        // }

        // TEMPORARY: Auto-verify for testing (remove when Dojah is ready)
        console.log(
          "🧪 [KYC] TEST MODE: Auto-verifying driver license for user:",
          user._id
        );
        user.driverLicenseVerified = true;
      } else {
        user.driverLicenseVerified = false;
      }
    } else if (user.role === "customer") {
      if (typeof defaultAddress !== "undefined")
        user.defaultAddress = defaultAddress || null;

      if (typeof nin !== "undefined") {
        const newNin = nin || null;
        const ninChanged = user.nin !== newNin;
        user.nin = newNin;

        if (newNin && ninChanged) {
          console.log(
            "🧪 [KYC] TEST MODE: Auto-verifying NIN for customer:",
            user._id
          );
          user.ninVerified = true;
        } else if (!newNin) {
          user.ninVerified = false;
        }
      }

      if (typeof bvn !== "undefined") {
        const newBvn = bvn || null;
        const bvnChanged = user.bvn !== newBvn;
        user.bvn = newBvn;

        if (newBvn && bvnChanged) {
          console.log(
            "🧪 [KYC] TEST MODE: Auto-verifying BVN for customer:",
            user._id
          );
          user.bvnVerified = true;
        } else if (!newBvn) {
          user.bvnVerified = false;
        }
      }
    }

    await user.save();

    try {
      await createAndSendNotification(user._id, {
        type: "profile_updated",
        title: "Profile updated",
        message: "Your profile information has been updated",
      });
    } catch {}

    return res.json({
      success: true,
      message: "Profile updated",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        role: user.role,
        vehicleType: user.vehicleType || null,
        nin: user.nin || null,
        bvn: user.bvn || null,
        ninVerified: user.ninVerified || false,
        bvnVerified: user.bvnVerified || false,
        defaultAddress: user.defaultAddress || null,
        address: user.address || null,
        driverLicenseNumber: user.driverLicenseNumber || null,
        driverLicensePicture: user.driverLicensePicture || null,
        driverLicenseVerified: user.driverLicenseVerified || false,
        vehiclePicture: user.vehiclePicture || null,
        termsAccepted: user.termsAccepted || false,
      },
    });
  } catch (e) {
    console.error("❌ [PROFILE] Error updating profile:", e);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

export const checkEmailAvailability = async (req, res) => {
  try {
    const { email } = req.query;
    const userId = req.user?.userId || req.user?._id;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      return res.json({
        success: true,
        available: false,
        valid: false,
        message: "Invalid email format",
      });
    }

    const existingUser = await User.findOne({
      email: email.trim().toLowerCase(),
      _id: { $ne: userId },
    });

    if (existingUser) {
      return res.json({
        success: true,
        available: false,
        valid: true,
        message: "This email is already taken by another user",
      });
    }

    return res.json({
      success: true,
      available: true,
      valid: true,
      message: "Email is available",
    });
  } catch (e) {
    console.error("❌ [EMAIL] Error checking email availability:", e);
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

export const acceptTerms = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    user.termsAccepted = true;
    user.termsAcceptedAt = new Date();
    await user.save();

    console.log("✅ [TERMS] User accepted terms:", user.email);

    return res.json({
      success: true,
      message: "Terms and conditions accepted",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        role: user.role,
        vehicleType: user.vehicleType || null,
        nin: user.nin || null,
        bvn: user.bvn || null,
        ninVerified: user.ninVerified || false,
        bvnVerified: user.bvnVerified || false,
        defaultAddress: user.defaultAddress || null,
        address: user.address || null,
        driverLicenseNumber: user.driverLicenseNumber || null,
        driverLicensePicture: user.driverLicensePicture || null,
        driverLicenseVerified: user.driverLicenseVerified || false,
        vehiclePicture: user.vehiclePicture || null,
        termsAccepted: user.termsAccepted,
      },
    });
  } catch (e) {
    console.error("❌ [TERMS] Error accepting terms:", e);
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

export const updatePushToken = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const { expoPushToken } = req.body || {};

    if (!expoPushToken || typeof expoPushToken !== "string") {
      return res.status(400).json({
        success: false,
        error: "expoPushToken (string) is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    user.expoPushToken = expoPushToken;
    await user.save();

    console.log(`📱 [PUSH] Token saved for user ${userId}`);

    return res.json({
      success: true,
      message: "Push token updated",
    });
  } catch (e) {
    console.error("❌ [PUSH] Error updating push token:", e);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

export const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const user = await User.findById(userId).select("notificationPreferences");

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.json({
      success: true,
      preferences: user.notificationPreferences || {},
    });
  } catch (e) {
    console.error("❌ [PREFERENCES] Error fetching preferences:", e);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

export const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const { preferences } = req.body || {};

    if (!preferences || typeof preferences !== "object") {
      return res.status(400).json({
        success: false,
        error: "preferences (object) is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Merge preferences
    if (!user.notificationPreferences) {
      user.notificationPreferences = {};
    }

    for (const [key, value] of Object.entries(preferences)) {
      if (value && typeof value === "object") {
        if (!user.notificationPreferences[key]) {
          user.notificationPreferences[key] = {};
        }
        if (typeof value.inApp === "boolean") {
          user.notificationPreferences[key].inApp = value.inApp;
        }
        if (typeof value.push === "boolean") {
          user.notificationPreferences[key].push = value.push;
        }
        if (typeof value.email === "boolean") {
          user.notificationPreferences[key].email = value.email;
        }
      }
    }

    await user.save();

    return res.json({
      success: true,
      message: "Notification preferences updated",
      preferences: user.notificationPreferences,
    });
  } catch (e) {
    console.error("❌ [PREFERENCES] Error updating preferences:", e);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
