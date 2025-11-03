import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { errorHandler } from "./middleware/index.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import {
  authenticateSocket,
  handleDisconnect,
  joinUserRoom,
} from "./services/socketService.js";
// Add more routes as you build them
// import deliveryRoutes from "./routes/delivery.js";
// import riderRoutes from "./routes/rider.js";

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

  joinUserRoom(socket);

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
// Add more routes as you build them
// app.use("/api/delivery", deliveryRoutes);
// app.use("/api/rider", riderRoutes);

// Health check endpoint
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
});
