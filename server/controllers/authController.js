import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import { SocketEvents } from "../constants/socketEvents.js";
import User from "../models/User.js";
import { io } from "../server.js";
import { buildDarkEmailTemplate } from "../services/emailTemplates.js";
import { createAndSendNotification } from "../services/notificationService.js";
import { sendSMS } from "../services/smsService.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

const getEmailTransporter = () => {
  const service = process.env.EMAIL_SERVICE;
  const user = process.env.EMAIL_USER;
  const password = process.env.EMAIL_PASSWORD;

  if (!user || !password) {
    return null;
  }

  if (service) {
    return nodemailer.createTransport({
      service: service.toLowerCase(),
      auth: {
        user: user,
        pass: password,
      },
    });
  }

  // Fallback to SMTP (for custom SMTP servers)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: user,
      pass: password,
    },
  });
};

const sendEmail = async ({ to, subject, html }) => {
  // Skip email in dev mode if SKIP_EMAIL is set
  if (process.env.SKIP_EMAIL === "true") {
    console.log("✉️ [EMAIL] Skipped (SKIP_EMAIL=true)");
    console.log("   To:", to);
    console.log("   Subject:", subject);
    return Promise.resolve();
  }

  const transporter = getEmailTransporter();
  if (!transporter || !process.env.EMAIL_USER) {
    console.log(
      "✉️ [EMAIL] Skipped: EMAIL_* not configured (set EMAIL_SERVICE/EMAIL_USER/EMAIL_PASSWORD)"
    );
    console.log("   To:", to);
    console.log("   Subject:", subject);
    return Promise.resolve();
  }

  // Add timeout to prevent hanging (10 seconds)
  const emailPromise = (async () => {
    try {
      // Skip verification in dev to speed things up
      const skipVerify = process.env.NODE_ENV !== "production";
      if (!skipVerify) {
        try {
          await transporter.verify();
          console.log("✉️ [EMAIL] Transport verified: ready to send");
        } catch (verifyErr) {
          console.warn(
            "⚠️ [EMAIL] Transport verify failed:",
            verifyErr?.message || verifyErr
          );
        }
      }

      const useCid = (process.env.EMAIL_USE_CID || "").toLowerCase() === "true";
      const logoCid = process.env.EMAIL_LOGO_CID || "brandLogo";
      let attachments = [];
      if (useCid) {
        try {
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          const logoPath = path.join(__dirname, "../assets/Night-Waka.png");
          attachments = [
            { filename: "logo.png", path: logoPath, cid: logoCid },
          ];
        } catch (e) {}
      }

      const info = await transporter.sendMail({
        from:
          process.env.EMAIL_FROM ||
          process.env.EMAIL_USER ||
          "9thWaka <no-reply@9thwaka.app>",
        to,
        subject,
        html,
        attachments,
      });
      console.log("✅ [EMAIL] Sent successfully");
      console.log("   To:", to);
      if (info?.messageId) console.log("   MessageID:", info.messageId);
      if (info?.accepted)
        console.log("   Accepted:", JSON.stringify(info.accepted));
      if (info?.rejected && info.rejected.length)
        console.log("   Rejected:", JSON.stringify(info.rejected));
      if (info?.response) console.log("   Response:", info.response);
    } catch (error) {
      console.error("❌ [EMAIL] Failed to send:", error.message);
      throw error;
    }
  })();

  // Add timeout wrapper
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Email sending timeout (10s)"));
    }, 10000);
  });

  try {
    await Promise.race([emailPromise, timeoutPromise]);
  } catch (error) {
    // Don't throw - just log the error and continue
    // Registration should succeed even if email fails
    console.error("❌ [EMAIL] Error (non-blocking):", error.message);
    return Promise.resolve(); // Return resolved promise instead of throwing
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    let { email, password, role, vehicleType } = req.body;

    email = email ? email.trim().toLowerCase() : email;
    password = password ? password.trim() : password;
    role = role ? role.trim().toLowerCase() : "customer";
    vehicleType = vehicleType ? vehicleType.trim().toLowerCase() : null;

    console.log("📝 [REGISTER] New registration attempt");
    console.log("   Email:", email);
    console.log("   Role:", role || "customer (default)");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide email and password",
      });
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email address",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    // Validate role - only allow customer or rider during registration
    // Admin roles must be assigned manually or through admin panel
    const allowedRoles = ["customer", "rider"];
    if (role && !allowedRoles.includes(role)) {
      console.log("❌ [REGISTER] Invalid role attempted:", role);
      return res.status(400).json({
        success: false,
        error: `Invalid role. Allowed roles: ${allowedRoles.join(", ")}`,
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("❌ [REGISTER] User already exists:", email);
      return res.status(400).json({
        success: false,
        error: "User already exists",
      });
    }

    const finalRole = role || "customer";

    // Validate vehicleType if rider
    if (finalRole === "rider" && vehicleType) {
      if (!["motorcycle", "car"].includes(vehicleType)) {
        return res.status(400).json({
          success: false,
          error: "Invalid vehicleType. Must be 'motorcycle' or 'car'",
        });
      }
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000);

    const userData = {
      email,
      password,
      role: finalRole,
      verificationCode,
      verificationExpires,
    };

    if (finalRole === "rider" && vehicleType)
      userData.vehicleType = vehicleType;

    const user = await User.create(userData);

    console.log("✅ [REGISTER] User registered successfully");
    console.log("   User ID:", user._id);
    console.log("   Email:", user.email);
    console.log("   Role:", user.role);
    console.log(
      "   Registered as:",
      user.role === "customer" ? "👤 Customer" : "🏍️ Rider"
    );

    // Log verification code in development mode only
    if (
      process.env.LOG_IN_DEV === "true" ||
      process.env.NODE_ENV !== "production"
    ) {
      console.log("🔑 [DEV] Verification Code:", verificationCode);
      console.log("   Expires at:", verificationExpires.toISOString());
    }

    let emailSent = false;
    try {
      await sendEmail({
        to: user.email,
        subject: "Verify your 9thWaka account",
        html: buildDarkEmailTemplate(
          "Verify your account",
          "Use the verification code below to activate your account.",
          verificationCode
        ),
      });
      emailSent = true;
      console.log("✉️ [EMAIL] Verification code sent to:", user.email);
    } catch (e) {
      console.error(
        "❌ [EMAIL] Failed to send verification email:",
        e?.message || e
      );
      emailSent = false;
    }

    try {
      await createAndSendNotification(user._id, {
        type: "verification",
        title: "Verify your email",
        message:
          "We've sent a 6-digit code to your email. Enter it to activate your account.",
      });
    } catch (e) {
      console.error(
        "❌ [NOTIF] Failed to create/send verification notification:",
        e?.message
      );
    }

    res.status(201).json({
      success: true,
      message: emailSent
        ? "User registered successfully. Verification code sent to email."
        : "User registered successfully. Please check your email for verification code.",
      requiresVerification: true,
      emailSent,
      user: {
        id: user._id,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    let { email, password } = req.body;

    email = email ? email.trim().toLowerCase() : email;

    password = password ? password.trim() : password;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check if account is deactivated
    if (user.accountDeactivated) {
      return res.status(403).json({
        success: false,
        error:
          "Your account has been deactivated after receiving 3 strikes for late payment. Please contact support to resolve this issue.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const token = generateToken(user._id);
    try {
      io.to(`user:${user._id}`).emit(SocketEvents.AUTH_VERIFIED, {
        userId: user._id.toString(),
      });
    } catch {}

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        profilePicture: user.profilePicture,
        role: user.role,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        termsAccepted: user.termsAccepted || false,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        profilePicture: user.profilePicture,
        role: user.role,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
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
        searchRadiusKm: user.searchRadiusKm || 7,
        termsAccepted: user.termsAccepted || false,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email with code
// @route   POST /api/auth/verify
// @access  Public (code-based)
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res
        .status(400)
        .json({ success: false, error: "Email and code are required" });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid email or code" });
    }
    if (user.isVerified) {
      return res
        .status(200)
        .json({ success: true, message: "Account already verified" });
    }
    if (
      !user.verificationCode ||
      !user.verificationExpires ||
      user.verificationExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        error: "Verification code expired. Request a new code.",
      });
    }
    if (user.verificationCode !== code) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid verification code" });
    }
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationExpires = null;
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: "Welcome to 9thWaka",
        html: buildDarkEmailTemplate(
          "Welcome to 9thWaka",
          "Your account is verified. You can now request night deliveries, track orders, and more.",
          null
        ),
      });
      console.log("✉️ [EMAIL] Welcome email sent to:", user.email);
    } catch (e) {
      console.error("❌ [EMAIL] Failed to send welcome email:", e?.message);
    }

    // In-app + persist welcome notification
    try {
      await createAndSendNotification(user._id, {
        type: "auth_verified",
        title: "Welcome to 9thWaka",
        message:
          "Your account is verified. Let's get your first delivery started!",
      });
    } catch (e) {
      console.error(
        "❌ [NOTIF] Failed to create/send welcome notification:",
        e?.message
      );
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        profilePicture: user.profilePicture,
        role: user.role,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        vehicleType: user.vehicleType || null,
        isVerified: user.isVerified,
        termsAccepted: user.termsAccepted || false,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend verification code
// @route   POST /api/auth/resend-verification
// @access  Public (email-based)
export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: "Email is required" });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, error: "Invalid email" });
    }
    if (user.isVerified) {
      return res
        .status(200)
        .json({ success: true, message: "Account already verified" });
    }
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    user.verificationCode = verificationCode;
    user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Log verification code in development mode only
    if (
      process.env.LOG_IN_DEV === "true" ||
      process.env.NODE_ENV !== "production"
    ) {
      console.log("🔑 [DEV] Resent Verification Code:", verificationCode);
      console.log("   Email:", user.email);
      console.log("   Expires at:", user.verificationExpires.toISOString());
    }

    try {
      await sendEmail({
        to: user.email,
        subject: "Your new NightWalker verification code",
        html: buildDarkEmailTemplate(
          "New verification code",
          "Use this code to verify your account.",
          verificationCode
        ),
      });
      console.log("✉️ [EMAIL] Verification code re-sent to:", user.email);
    } catch (e) {
      console.error("❌ [EMAIL] Resend failed:", e?.message);
    }

    return res
      .status(200)
      .json({ success: true, message: "Verification code sent" });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password - Generate reset code
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    let { email, phoneNumber } = req.body;

    // Validate that at least one identifier is provided
    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Please provide either an email address or phone number",
      });
    }

    // Format phone number if provided
    let formattedPhone = null;
    if (phoneNumber) {
      formattedPhone = phoneNumber.trim();
      // Remove + if present, ensure it starts with 234
      formattedPhone = formattedPhone.replace(/^\+/, "");
      if (!formattedPhone.startsWith("234")) {
        formattedPhone = "234" + formattedPhone;
      }
      formattedPhone = "+" + formattedPhone;
    }

    // Format email if provided
    email = email ? email.trim().toLowerCase() : null;

    // Validate email format if provided
    if (email) {
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: "Please provide a valid email address",
        });
      }
    }

    // Find user by email or phone
    let user = null;
    if (email) {
      user = await User.findOne({ email });
    } else if (formattedPhone) {
      user = await User.findOne({ phoneNumber: formattedPhone });
    }

    // Don't reveal if user exists (security best practice)
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with that information, a password reset code has been sent",
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordCode = resetCode;
    user.resetPasswordCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save({ validateBeforeSave: false });

    // Log code in development mode only
    if (
      process.env.LOG_IN_DEV === "true" ||
      process.env.NODE_ENV !== "production"
    ) {
      console.log("🔑 [DEV] Password Reset Code:", resetCode);
      console.log("   Email:", user.email);
      console.log("   Phone:", user.phoneNumber);
      console.log(
        "   Expires at:",
        user.resetPasswordCodeExpires.toISOString()
      );
    }

    // Send code via email or SMS
    try {
      if (email && user.email) {
        await sendEmail({
          to: user.email,
          subject: "9thWaka Password Reset Code",
          html: buildDarkEmailTemplate(
            "Password Reset Request",
            "Use the code below to reset your password. This code will expire in 10 minutes.",
            resetCode
          ),
        });
        console.log("✉️ [EMAIL] Password reset code sent to:", user.email);
      } else if (formattedPhone && user.phoneNumber) {
        const smsMessage = `Your 9thWaka password reset code is: ${resetCode}. This code expires in 10 minutes. If you didn't request this, please ignore this message.`;
        await sendSMS(user.phoneNumber, smsMessage);
        console.log("📱 [SMS] Password reset code sent to:", user.phoneNumber);
      }
    } catch (sendError) {
      console.error(
        "❌ [AUTH] Failed to send reset code:",
        sendError?.message || sendError
      );
      // Still return success to not reveal if user exists
    }

    res.status(200).json({
      success: true,
      message:
        "If an account exists with that information, a password reset code has been sent",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using code
// @route   PUT /api/auth/resetpassword/:code
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    let { password, email, phoneNumber } = req.body;
    const resetCode = req.params.code;

    // Normalize password: trim whitespace
    password = password ? password.trim() : password;

    // Validation
    if (!password) {
      return res.status(400).json({
        success: false,
        error: "Please provide a new password",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    if (!resetCode || resetCode.length !== 6) {
      return res.status(400).json({
        success: false,
        error: "Invalid reset code. Please enter the 6-digit code.",
      });
    }

    // Format identifiers
    email = email ? email.trim().toLowerCase() : null;
    let formattedPhone = null;
    if (phoneNumber) {
      formattedPhone = phoneNumber.trim();
      formattedPhone = formattedPhone.replace(/^\+/, "");
      if (!formattedPhone.startsWith("234")) {
        formattedPhone = "234" + formattedPhone;
      }
      formattedPhone = "+" + formattedPhone;
    }

    // Build query to find user
    const query = {
      resetPasswordCode: resetCode,
      resetPasswordCodeExpires: { $gt: new Date() }, // Code must not be expired
    };

    if (email) {
      query.email = email;
    } else if (formattedPhone) {
      query.phoneNumber = formattedPhone;
    } else {
      return res.status(400).json({
        success: false,
        error: "Please provide either email or phone number",
      });
    }

    // Find user with matching code
    const user = await User.findOne(query);

    if (!user) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid or expired reset code. Please request a new code if needed.",
      });
    }

    // Set new password (pre-save hook will hash it automatically)
    user.password = password;

    // Clear reset code fields
    user.resetPasswordCode = undefined;
    user.resetPasswordCodeExpires = undefined;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Generate new login token
    const token = generateToken(user._id);

    // Send confirmation email/SMS
    try {
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: "9thWaka Password Changed Successfully",
          html: buildDarkEmailTemplate(
            "Password Changed",
            "Your password has been successfully changed. If you didn't make this change, please contact support immediately.",
            null
          ),
        });
      }
      if (user.phoneNumber) {
        await sendSMS(
          user.phoneNumber,
          "Your 9thWaka password has been changed successfully. If you didn't make this change, contact support immediately."
        );
      }
    } catch (notifyError) {
      console.error(
        "❌ [AUTH] Failed to send password change notification:",
        notifyError?.message
      );
    }

    res.status(200).json({
      success: true,
      message: "Password reset successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        profilePicture: user.profilePicture,
        role: user.role,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};
