import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import { buildDarkEmailTemplate } from "../services/emailTemplates.js";
import { createAndSendNotification } from "../services/notificationService.js";

// Generate JWT Token
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

const transporter = getEmailTransporter();

const sendEmail = async ({ to, subject, html }) => {
  if (!transporter || !process.env.EMAIL_USER) {
    console.log(
      "✉️ [EMAIL] Skipped: EMAIL_* not configured (set EMAIL_SERVICE/EMAIL_USER/EMAIL_PASSWORD)"
    );
    console.log("   To:", to);
    console.log("   Subject:", subject);
    return;
  }

  try {
    await transporter.sendMail({
      from:
        process.env.EMAIL_FROM ||
        process.env.EMAIL_USER ||
        "9thWaka <no-reply@9thwaka.app>",
      to,
      subject,
      html,
    });
    console.log("✅ [EMAIL] Sent successfully to:", to);
  } catch (error) {
    console.error("❌ [EMAIL] Failed to send:", error.message);
    throw error;
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    let { email, password, role } = req.body;

    email = email ? email.trim().toLowerCase() : email;
    password = password ? password.trim() : password;
    role = role ? role.trim().toLowerCase() : "customer";

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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const finalRole = role || "customer";
    // Create verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      email,
      password: hashedPassword,
      role: finalRole,
      verificationCode,
      verificationExpires,
    });

    console.log("✅ [REGISTER] User registered successfully");
    console.log("   User ID:", user._id);
    console.log("   Email:", user.email);
    console.log("   Role:", user.role);
    console.log(
      "   Registered as:",
      user.role === "customer" ? "👤 Customer" : "🏍️ Rider"
    );

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
      console.log("✉️ [EMAIL] Verification code sent to:", user.email);
    } catch (e) {
      console.error(
        "❌ [EMAIL] Failed to send verification email:",
        e?.message
      );
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

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "User registered successfully. Verification code sent to email.",
      token,
      user: {
        id: user._id,
        email: user.email,
        profilePicture: user.profilePicture,
        role: user.role,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
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

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user._id);

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
        type: "welcome",
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

    return res
      .status(200)
      .json({ success: true, message: "Email verified successfully" });
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

// @desc    Forgot password - Generate reset token
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    let { email } = req.body;

    // Normalize email: trim whitespace and convert to lowercase
    email = email ? email.trim().toLowerCase() : email;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Please provide an email address",
      });
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email address",
      });
    }

    // Check if user exists (email is already lowercase from normalization)
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      return res.status(200).json({
        success: true,
        message: "If that email exists, a password reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // In production, you would send an email here
    // For now, we'll return the token (remove this in production!)
    // TODO: Send email with reset link containing the resetToken
    // const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/resetpassword/${resetToken}`;
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Password Reset Request',
    //   message: `Click this link to reset your password: ${resetUrl}`
    // });

    res.status(200).json({
      success: true,
      message: "Password reset token generated",
      // Remove this in production! Only for development/testing
      resetToken:
        process.env.NODE_ENV === "development" ? resetToken : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    let { password } = req.body;
    const resetToken = req.params.resettoken;

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

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        error: "Invalid reset token",
      });
    }

    // Hash the reset token to compare with stored token
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Find user with matching token and check if token hasn't expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }, // Token must not be expired
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token",
      });
    }

    // Set new password (pre-save hook will hash it automatically)
    user.password = password;

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Generate new login token
    const token = generateToken(user._id);

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
