import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import path from "path";
import { Server as SocketIOServer } from "socket.io";
import { fileURLToPath } from "url";
import { errorHandler } from "./middleware/index.js";
import adminRoutes from "./routes/admin.js";
import analyticsRoutes from "./routes/analytics.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import geocodingRoutes from "./routes/geocoding.js";
import notificationRoutes from "./routes/notifications.js";
import orderRoutes from "./routes/orders.js";
import payoutRoutes from "./routes/payouts.js";
import presenceRoutes from "./routes/presence.js";
import ratingRoutes from "./routes/ratings.js";
import riderRoutes from "./routes/riders.js";
import userRoutes from "./routes/user.js";
import {
  scheduleFridayReminder,
  schedulePaymentBlocking,
  schedulePayoutGeneration,
  scheduleSaturdayReminder,
  scheduleSundayPayment,
} from "./services/scheduledNotifications.js";
import {
  authenticateSocket,
  handleDisconnect,
  joinUserRoom,
} from "./services/socketService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);
export const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" },
});

io.use(authenticateSocket);

io.on("connection", (socket) => {
  console.log("🔌 [SOCKET] Client connected:", socket.id);
  console.log("👤 [SOCKET] User ID:", socket.userId);

  joinUserRoom(socket, io);

  socket.on("disconnect", () => {
    handleDisconnect(socket);
    console.log("🔌 [SOCKET] Client disconnected:", socket.id);
  });

  socket.on("ping", () => {
    socket.emit("pong", { timestamp: new Date().toISOString() });
  });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    exposedHeaders: ["Content-Length", "Content-Type"],
  })
);

app.use((req, res, next) => {
  console.log("📥 [SERVER] Incoming:", req.method, req.path);
  console.log(
    "📋 [SERVER] Content-Type:",
    req.headers["content-type"] || "none"
  );
  next();
});

app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("application/json")) {
    express.json()(req, res, next);
  } else {
    next();
  }
});

app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  "/api/uploads/profiles",
  express.static(path.join(__dirname, "uploads", "profiles"))
);
app.use("/assets", express.static(path.join(__dirname, "assets")));

mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/9thwaka",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

mongoose.connection.on("connected", () => {
  console.log("✅ Connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/riders", riderRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/presence", presenceRoutes);
app.use("/api/geocoding", geocodingRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "9th Waka API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
  });
});

app.use(errorHandler);

httpServer.listen(PORT, "0.0.0.0", () => {
  const publicBase =
    process.env.SERVER_PUBLIC_URL || `http://localhost:${PORT}`;
  console.log(`🚀 9th Waka Server running on port ${PORT}`);
  console.log(`📊 Health check: ${publicBase}/api/health`);
  console.log(`🔐 Auth API: ${publicBase}/api/auth`);

  // Initialize scheduled notifications (cron jobs)
  schedulePayoutGeneration(); // Generate payouts for all riders on Sunday 12 AM (start of new week)
  scheduleFridayReminder(); // Reminder on Friday 9 AM (payment due tomorrow)
  scheduleSaturdayReminder(); // Reminder on Saturday 9 AM (payment due TODAY)
  scheduleSundayPayment(); // Final reminder on Sunday 9 AM (grace period ends today)
  schedulePaymentBlocking(); // Block overdue riders on Monday 12 AM (after grace period)

  // SMTP transport startup verification
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASSWORD;
  const emailService = process.env.EMAIL_SERVICE;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  if (!emailUser || !emailPass) {
    console.log(
      "✉️ [EMAIL] Startup: Skipped SMTP verify (EMAIL_* not configured)"
    );
  } else {
    const transport = emailService
      ? nodemailer.createTransport({
          service: emailService.toLowerCase(),
          auth: { user: emailUser, pass: emailPass },
        })
      : nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: false,
          auth: { user: emailUser, pass: emailPass },
        });

    transport
      .verify()
      .then(() => {
        console.log("✉️ [EMAIL] Startup: SMTP verified and ready to send");
        console.log("   User:", emailUser);
        if (!emailService) {
          console.log("   Host:", smtpHost);
          console.log("   Port:", smtpPort);
        } else {
          console.log("   Service:", emailService.toLowerCase());
        }
      })
      .catch((err) => {
        console.warn(
          "⚠️ [EMAIL] Startup: SMTP verify failed:",
          err?.message || err
        );
      });
  }
});
