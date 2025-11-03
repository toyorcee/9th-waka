import { SocketEvents } from "../constants/socketEvents.js";
import Order from "../models/Order.js";
import { io } from "../server.js";
import { createAndSendNotification } from "../services/notificationService.js";

const appendTimeline = (order, status, note) => {
  order.timeline.push({ status, note, at: new Date() });
};

export const createOrder = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "customer") {
      return res
        .status(403)
        .json({ success: false, error: "Only customers can create orders" });
    }
    const { pickup, dropoff, items, price } = req.body || {};
    if (!pickup?.address || !dropoff?.address) {
      return res.status(400).json({
        success: false,
        error: "Pickup and dropoff addresses are required",
      });
    }
    const order = await Order.create({
      customerId: user._id,
      pickup,
      dropoff,
      items: items || "",
      price: Number(price) || 0,
      status: "pending",
      timeline: [],
    });
    appendTimeline(order, "pending", "Order created");
    await order.save();

    try {
      await createAndSendNotification(user._id, {
        type: "order",
        title: "Order created",
        message: `Order #${order._id} created, awaiting assignment`,
      });
    } catch {}
    io.to(`user:${user._id}`).emit(SocketEvents.ORDER_CREATED, {
      id: order._id.toString(),
    });
    res.status(201).json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, orders });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const getAvailableOrders = async (req, res) => {
  try {
    if (req.user.role !== "rider")
      return res.status(403).json({ success: false, error: "Only riders" });
    const orders = await Order.find({ status: "pending", riderId: null })
      .sort({ createdAt: 1 })
      .limit(50);
    res.json({ success: true, orders });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const acceptOrder = async (req, res) => {
  try {
    if (req.user.role !== "rider")
      return res.status(403).json({ success: false, error: "Only riders" });
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });
    if (order.status !== "pending" || order.riderId) {
      return res
        .status(400)
        .json({ success: false, error: "Order already assigned" });
    }
    order.riderId = req.user._id;
    order.status = "assigned";
    appendTimeline(order, "assigned", `Rider ${req.user._id} accepted`);
    await order.save();
    io.to(`user:${order.customerId}`).emit(SocketEvents.ORDER_ASSIGNED, {
      id: order._id.toString(),
      riderId: req.user._id.toString(),
    });
    io.to(`user:${req.user._id}`).emit(SocketEvents.ORDER_ASSIGNED, {
      id: order._id.toString(),
    });
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { action } = req.body || {};
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });
    if (req.user.role !== "rider" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    if (
      req.user.role === "rider" &&
      String(order.riderId) !== String(req.user._id)
    ) {
      return res.status(403).json({ success: false, error: "Not your order" });
    }
    const transitions = {
      pickup: "picked_up",
      deliver: "delivered",
      start: "delivering",
      cancel: "cancelled",
    };
    const next = transitions[action];
    if (!next)
      return res.status(400).json({ success: false, error: "Invalid action" });
    order.status = next;
    appendTimeline(order, next, `Status set to ${next}`);
    await order.save();
    io.to(`user:${order.customerId}`).emit(SocketEvents.ORDER_STATUS_UPDATED, {
      id: order._id.toString(),
      status: next,
    });
    if (order.riderId) {
      io.to(`user:${order.riderId}`).emit(SocketEvents.ORDER_STATUS_UPDATED, {
        id: order._id.toString(),
        status: next,
      });
    }
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });
    const user = req.user;
    const isOwner = String(order.customerId) === String(user._id);
    const isRider = order.riderId && String(order.riderId) === String(user._id);
    const isAdmin = user.role === "admin";
    if (!isOwner && !isRider && !isAdmin)
      return res.status(403).json({ success: false, error: "Forbidden" });
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const generateDeliveryOtp = async (req, res) => {
  try {
    if (req.user.role !== "rider")
      return res.status(403).json({ success: false, error: "Only riders" });
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });
    if (String(order.riderId) !== String(req.user._id))
      return res.status(403).json({ success: false, error: "Not your order" });
    if (!["assigned", "picked_up", "delivering"].includes(order.status)) {
      return res
        .status(400)
        .json({ success: false, error: "Order not in deliverable state" });
    }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const ttlMinutes = Number(process.env.DELIVERY_OTP_TTL_MIN || 15);
    order.delivery.otpCode = code;
    order.delivery.otpExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    order.status = order.status === "assigned" ? "delivering" : order.status;
    appendTimeline(order, "delivering", "Delivery OTP generated");
    await order.save();
    try {
      await createAndSendNotification(order.customerId, {
        type: "order",
        title: "Delivery code",
        message: `Your delivery code is ${code}. Share only with the rider.`,
      });
    } catch {}
    io.to(`user:${order.customerId}`).emit(SocketEvents.ORDER_STATUS_UPDATED, {
      id: order._id.toString(),
      status: order.status,
    });
    io.to(`user:${order.customerId}`).emit(SocketEvents.DELIVERY_OTP, {
      id: order._id.toString(),
      otpExpiresAt: order.delivery.otpExpiresAt,
    });
    res.json({
      success: true,
      otp: code,
      expiresAt: order.delivery.otpExpiresAt,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const verifyDeliveryOtp = async (req, res) => {
  try {
    if (req.user.role !== "rider")
      return res.status(403).json({ success: false, error: "Only riders" });
    const { code } = req.body || {};
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });
    if (String(order.riderId) !== String(req.user._id))
      return res.status(403).json({ success: false, error: "Not your order" });
    if (!order.delivery?.otpCode || !order.delivery?.otpExpiresAt) {
      return res
        .status(400)
        .json({ success: false, error: "No OTP to verify" });
    }
    if (new Date(order.delivery.otpExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ success: false, error: "OTP expired" });
    }
    if (String(code) !== String(order.delivery.otpCode)) {
      return res.status(400).json({ success: false, error: "Invalid code" });
    }
    order.delivery.otpVerifiedAt = new Date();
    order.delivery.deliveredAt = new Date();
    order.status = "delivered";
    const commissionRate = Number(process.env.COMMISSION_RATE_PERCENT || 10);
    const gross = Number(order.price) || 0;
    const commission =
      Math.round(gross * commissionRate * 100) / 100 / 100
        ? Math.round(gross * commissionRate * 100) / 100 / 100
        : +(gross * (commissionRate / 100)).toFixed(2);
    const riderNet = +(gross - commission).toFixed(2);
    order.financial = {
      grossAmount: gross,
      commissionRatePct: commissionRate,
      commissionAmount: commission,
      riderNetAmount: riderNet,
    };
    appendTimeline(order, "delivered", "OTP verified and order delivered");
    await order.save();
    io.to(`user:${order.customerId}`).emit(SocketEvents.ORDER_STATUS_UPDATED, {
      id: order._id.toString(),
      status: order.status,
    });
    io.to(`user:${order.customerId}`).emit(SocketEvents.DELIVERY_VERIFIED, {
      id: order._id.toString(),
    });
    io.to(`user:${req.user._id}`).emit(SocketEvents.DELIVERY_VERIFIED, {
      id: order._id.toString(),
    });
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const updateDeliveryProof = async (req, res) => {
  try {
    if (req.user.role !== "rider")
      return res.status(403).json({ success: false, error: "Only riders" });
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });
    if (String(order.riderId) !== String(req.user._id))
      return res.status(403).json({ success: false, error: "Not your order" });
    const { photoUrl, recipientName, recipientPhone, note } = req.body || {};
    if (photoUrl) order.delivery.photoUrl = photoUrl;
    if (recipientName) order.delivery.recipientName = recipientName;
    if (recipientPhone) order.delivery.recipientPhone = recipientPhone;
    if (note) order.delivery.note = note;
    appendTimeline(order, order.status, "Delivery proof updated");
    await order.save();
    io.to(`user:${order.customerId}`).emit(
      SocketEvents.DELIVERY_PROOF_UPDATED,
      {
        id: order._id.toString(),
      }
    );
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
