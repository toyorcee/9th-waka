import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";

dotenv.config();

const resetAdminPassword = async () => {
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/9thwaka",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("✅ Connected to MongoDB");

    // Find admin user by email
    const adminEmail = process.env.ADMIN_EMAIL || "techxtroverts@gmail.com";
    const newPassword = process.env.ADMIN_NEW_PASSWORD || "Sbpdojddme4*";

    console.log(`🔍 Searching for admin with email: ${adminEmail}`);
    const admin = await User.findOne({
      email: adminEmail.toLowerCase(),
      role: "admin",
    });

    if (!admin) {
      console.log("❌ Admin user not found!");
      console.log("   Looking for email:", adminEmail);
      console.log("   Role: admin");

      // Try to find any user with that email
      const anyUser = await User.findOne({ email: adminEmail.toLowerCase() });
      if (anyUser) {
        console.log("   Found user with that email but role is:", anyUser.role);
        console.log("   Updating role to admin and resetting password...");
        anyUser.role = "admin";
        const salt = await bcrypt.genSalt(10);
        anyUser.password = await bcrypt.hash(newPassword, salt);
        await anyUser.save();
        console.log("✅ User updated to admin and password reset!");
        console.log("   Email:", anyUser.email);
        console.log("   New password:", newPassword);
      } else {
        console.log("   No user found with that email. Creating new admin...");
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        const newAdmin = await User.create({
          email: adminEmail.toLowerCase(),
          password: hashedPassword,
          role: "admin",
          fullName: "Admin User",
          isVerified: true,
          termsAccepted: true,
        });
        console.log("✅ New admin user created!");
        console.log("   Email:", newAdmin.email);
        console.log("   Password:", newPassword);
      }
    } else {
      // Reset password
      console.log("✅ Admin found!");
      console.log("   Email:", admin.email);
      console.log("   Current role:", admin.role);

      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(newPassword, salt);
      await admin.save();

      console.log("✅ Admin password reset successfully!");
      console.log("   Email:", admin.email);
      console.log("   New password:", newPassword);
    }

    // Close connection
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting admin password:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
resetAdminPassword();
