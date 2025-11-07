import { SocketEvents } from "../constants/socketEvents.js";
import Order from "../models/Order.js";
import RiderLocation from "../models/RiderLocation.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import { io } from "../server.js";
import { geocodeAddress } from "../services/geocodingService.js";
import { createAndSendNotification } from "../services/notificationService.js";

const appendTimeline = (order, status, note) => {
  order.timeline.push({ status, note, at: new Date() });
};

// Calculate price based on tiered distance (Sunday to Saturday week)
// Base fare + tiered per-km rates
const calculateDeliveryPrice = (distanceKm, vehicleType = "motorcycle") => {
  const baseFare = Number(process.env.PRICE_BASE_FARE || 700);
  const minFare = Number(process.env.PRICE_MIN_FARE || 1500);

  // Tiered per-km rates
  const shortRate = Number(process.env.PRICE_PER_KM_SHORT || 130); // 0-8km
  const mediumRate = Number(process.env.PRICE_PER_KM_MEDIUM || 160); // 9-20km
  const longRate = Number(process.env.PRICE_PER_KM_LONG || 200); // 21km+

  // Vehicle type multiplier (car is more expensive)
  const vehicleMultiplier = vehicleType === "car" ? 1.25 : 1.0; // Car is 25% more

  if (!distanceKm || distanceKm <= 0) {
    return minFare;
  }

  let calculatedPrice = baseFare;

  // Tiered calculation
  if (distanceKm <= 8) {
    // Short distance: 0-8km
    calculatedPrice += distanceKm * shortRate;
  } else if (distanceKm <= 20) {
    // Medium distance: 9-20km
    calculatedPrice += 8 * shortRate; // First 8km
    calculatedPrice += (distanceKm - 8) * mediumRate; // Remaining km
  } else {
    // Long distance: 21km+
    calculatedPrice += 8 * shortRate; // First 8km (0-8)
    calculatedPrice += 12 * mediumRate; // Next 12km (9-20)
    calculatedPrice += (distanceKm - 20) * longRate; // Remaining km (21+)
  }

  // Apply vehicle multiplier
  calculatedPrice = calculatedPrice * vehicleMultiplier;

  // Ensure minimum fare
  return Math.max(Math.round(calculatedPrice), minFare);
};

// Estimate price before creating order
export const estimatePrice = async (req, res) => {
  try {
    const { pickup, dropoff } = req.body || {};
    if (!pickup?.address || !dropoff?.address) {
      return res.status(400).json({
        success: false,
        error: "Pickup and dropoff addresses are required",
      });
    }

    let distanceKm = null;
    let estimatedPrice = 0;

    // Try to geocode if coordinates not provided
    const pickupData = { ...pickup };
    const dropoffData = { ...dropoff };

    if ((!pickupData.lat || !pickupData.lng) && process.env.OPENCAGE_API_KEY) {
      try {
        const geo = await geocodeAddress(pickupData.address);
        if (geo) {
          pickupData.lat = geo.lat;
          pickupData.lng = geo.lng;
        }
      } catch (err) {
        console.warn("[ESTIMATE] Failed to geocode pickup:", err.message);
      }
    }

    if (
      (!dropoffData.lat || !dropoffData.lng) &&
      process.env.OPENCAGE_API_KEY
    ) {
      try {
        const geo = await geocodeAddress(dropoffData.address);
        if (geo) {
          dropoffData.lat = geo.lat;
          dropoffData.lng = geo.lng;
        }
      } catch (err) {
        console.warn("[ESTIMATE] Failed to geocode dropoff:", err.message);
      }
    }

    if (
      pickupData.lat &&
      pickupData.lng &&
      dropoffData.lat &&
      dropoffData.lng
    ) {
      distanceKm = haversineKm(
        pickupData.lat,
        pickupData.lng,
        dropoffData.lat,
        dropoffData.lng
      );
      // Calculate for both vehicle types
      const bikePrice = calculateDeliveryPrice(distanceKm, "motorcycle");
      const carPrice = calculateDeliveryPrice(distanceKm, "car");
      estimatedPrice = bikePrice; // Default to bike
      res.json({
        success: true,
        estimatedPrice: Math.round(estimatedPrice),
        bikePrice: Math.round(bikePrice),
        carPrice: Math.round(carPrice),
        distanceKm: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
        currency: "NGN",
      });
    } else {
      // Use minimum fare if can't calculate distance
      estimatedPrice = calculateDeliveryPrice(0);
      res.json({
        success: true,
        estimatedPrice: Math.round(estimatedPrice),
        bikePrice: Math.round(estimatedPrice),
        carPrice: Math.round(estimatedPrice * 1.25),
        distanceKm: null,
        currency: "NGN",
      });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "customer") {
      return res
        .status(403)
        .json({ success: false, error: "Only customers can create orders" });
    }
    const { pickup, dropoff, items, price, preferredVehicleType } =
      req.body || {};
    if (!pickup?.address || !dropoff?.address) {
      return res.status(400).json({
        success: false,
        error: "Pickup and dropoff addresses are required",
      });
    }

    const pickupData = { ...pickup };
    const dropoffData = { ...dropoff };

    if ((!pickupData.lat || !pickupData.lng) && process.env.OPENCAGE_API_KEY) {
      try {
        const geo = await geocodeAddress(pickupData.address);
        if (geo) {
          pickupData.lat = geo.lat;
          pickupData.lng = geo.lng;
          if (geo.formatted && !pickupData.address.includes(geo.formatted)) {
            pickupData.formattedAddress = geo.formatted;
          }
        }
      } catch (err) {
        console.warn("[ORDER] Failed to geocode pickup:", err.message);
      }
    }

    if (
      (!dropoffData.lat || !dropoffData.lng) &&
      process.env.OPENCAGE_API_KEY
    ) {
      try {
        const geo = await geocodeAddress(dropoffData.address);
        if (geo) {
          dropoffData.lat = geo.lat;
          dropoffData.lng = geo.lng;
          if (geo.formatted && !dropoffData.address.includes(geo.formatted)) {
            dropoffData.formattedAddress = geo.formatted;
          }
        }
      } catch (err) {
        console.warn("[ORDER] Failed to geocode dropoff:", err.message);
      }
    }

    let distanceKm = null;
    let calculatedPrice = Number(price) || 0;

    if (
      pickupData.lat &&
      pickupData.lng &&
      dropoffData.lat &&
      dropoffData.lng
    ) {
      distanceKm = haversineKm(
        pickupData.lat,
        pickupData.lng,
        dropoffData.lat,
        dropoffData.lng
      );
      if (!price || process.env.PRICE_AUTO === "true") {
        const vehicleType = preferredVehicleType || "motorcycle";
        calculatedPrice = calculateDeliveryPrice(distanceKm, vehicleType);
      }
    } else if (!price) {
      const vehicleType = preferredVehicleType || "motorcycle";
      calculatedPrice = calculateDeliveryPrice(0, vehicleType);
    }

    const finalPrice = Math.round(calculatedPrice);
    const order = await Order.create({
      customerId: user._id,
      pickup: pickupData,
      dropoff: dropoffData,
      items: items || "",
      preferredVehicleType: preferredVehicleType || null,
      price: finalPrice,
      originalPrice: finalPrice,
      status: "pending",
      timeline: [],
      meta: {
        distanceKm: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
      },
    });
    appendTimeline(order, "pending", "Order created");
    await order.save();

    try {
      await createAndSendNotification(user._id, {
        type: "order_created",
        title: "Order created",
        message: `Order #${order._id} created, awaiting assignment`,
        metadata: { orderId: order._id.toString() },
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

// Haversine distance in km
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getAvailableOrders = async (req, res) => {
  try {
    if (req.user.role !== "rider")
      return res.status(403).json({ success: false, error: "Only riders" });

    const rider = await User.findById(req.user._id).select("searchRadiusKm");
    const defaultRadius = Number(process.env.RIDER_ORDER_RADIUS_KM || 7);
    const maxRadiusKm = rider?.searchRadiusKm || defaultRadius;

    const MAX_ALLOWED_RADIUS = 20;
    const effectiveRadius = Math.min(maxRadiusKm, MAX_ALLOWED_RADIUS);

    let riderLoc = null;
    try {
      riderLoc = await RiderLocation.findOne({
        riderId: req.user._id,
        online: true,
      });
    } catch (error) {
      console.error("❌ [ORDERS] Error fetching rider location:", error);
    }

    let orders = [];
    try {
      orders = await Order.find({ status: "pending", riderId: null })
        .sort({ createdAt: 1 })
        .limit(100)
        .lean();
    } catch (error) {
      console.error("❌ [ORDERS] Error fetching orders:", error);
      return res.json({ success: true, orders: [] });
    }

    if (!orders || orders.length === 0) {
      return res.json({ success: true, orders: [] });
    }

    if (
      riderLoc?.location?.coordinates &&
      Array.isArray(riderLoc.location.coordinates) &&
      riderLoc.location.coordinates.length >= 2
    ) {
      try {
        const [riderLng, riderLat] = riderLoc.location.coordinates;

        if (
          typeof riderLat !== "number" ||
          typeof riderLng !== "number" ||
          isNaN(riderLat) ||
          isNaN(riderLng)
        ) {
          console.warn("⚠️ [ORDERS] Invalid rider coordinates");
          return res.json({ success: true, orders: [] });
        }

        const withDistance = orders
          .map((order) => {
            try {
              if (
                order?.pickup &&
                typeof order.pickup.lat === "number" &&
                typeof order.pickup.lng === "number" &&
                !isNaN(order.pickup.lat) &&
                !isNaN(order.pickup.lng)
              ) {
                const dist = haversineKm(
                  riderLat,
                  riderLng,
                  order.pickup.lat,
                  order.pickup.lng
                );
                return { order, distanceKm: dist };
              }
              return { order, distanceKm: null };
            } catch (error) {
              console.warn(
                "⚠️ [ORDERS] Error calculating distance for order:",
                order._id,
                error
              );
              return { order, distanceKm: null };
            }
          })
          .filter(
            (item) =>
              item.distanceKm !== null &&
              !isNaN(item.distanceKm) &&
              item.distanceKm <= effectiveRadius
          )
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .map((item) => ({
            ...item.order,
            distanceKm: Math.round(item.distanceKm * 10) / 10,
          }));

        return res.json({ success: true, orders: withDistance });
      } catch (error) {
        console.error(
          "❌ [ORDERS] Error processing orders with location:",
          error
        );
        // Fall through to return empty array
      }
    }

    // No location or error: return empty (rider must be online with location)
    return res.json({ success: true, orders: [] });
  } catch (e) {
    console.error("❌ [ORDERS] Error in getAvailableOrders:", e);
    // Return empty array instead of 500 error when there are no orders
    return res.json({ success: true, orders: [] });
  }
};

export const acceptOrder = async (req, res) => {
  try {
    if (req.user.role !== "rider")
      return res.status(403).json({ success: false, error: "Only riders" });

    const rider = await User.findById(req.user._id).select(
      "nin bvn ninVerified bvnVerified address driverLicenseNumber driverLicensePicture driverLicenseVerified vehiclePicture"
    );
    if (!rider) {
      return res.status(404).json({ success: false, error: "Rider not found" });
    }

    const hasVerifiedIdentity =
      rider.ninVerified === true || rider.bvnVerified === true;

    if (!hasVerifiedIdentity) {
      return res.status(400).json({
        success: false,
        error:
          "KYC verification required. Please verify your identity by completing either your NIN (National Identification Number) or BVN (Bank Verification Number) before accepting orders.",
        kycRequired: true,
      });
    }

    const hasAddress = rider.address && rider.address.trim().length > 0;
    if (!hasAddress) {
      return res.status(400).json({
        success: false,
        error:
          "Please complete your KYC by adding your address before accepting orders.",
        kycRequired: true,
      });
    }

    const hasDriverLicenseNumber =
      rider.driverLicenseNumber && rider.driverLicenseNumber.trim().length > 0;
    const hasDriverLicensePicture =
      rider.driverLicensePicture &&
      rider.driverLicensePicture.trim().length > 0;
    const isDriverLicenseVerified = rider.driverLicenseVerified === true;

    if (
      !hasDriverLicenseNumber ||
      !hasDriverLicensePicture ||
      !isDriverLicenseVerified
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Please complete your KYC by adding your driver license number and selfie, and ensure it's verified before accepting orders.",
        kycRequired: true,
      });
    }

    const hasVehiclePicture =
      rider.vehiclePicture && rider.vehiclePicture.trim().length > 0;
    if (!hasVehiclePicture) {
      return res.status(400).json({
        success: false,
        error:
          "Please complete your KYC by uploading your vehicle picture before accepting orders.",
        kycRequired: true,
      });
    }

    const riderLocation = await RiderLocation.findOne({
      riderId: req.user._id,
      online: true,
    });
    if (
      !riderLocation ||
      !riderLocation.location ||
      !riderLocation.location.coordinates ||
      riderLocation.location.coordinates.length < 2
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Location services must be enabled and you must be online to accept orders. Please turn on your location in the Deliveries tab.",
        locationRequired: true,
      });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, status: "pending", riderId: null },
      {
        $set: { riderId: req.user._id, status: "assigned" },
        $push: {
          timeline: {
            status: "assigned",
            note: `Rider ${req.user._id} accepted`,
            at: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!order) {
      return res
        .status(409)
        .json({ success: false, error: "Order already assigned" });
    }

    try {
      await createAndSendNotification(order.customerId, {
        type: "order_assigned",
        title: "Order assigned",
        message: `A rider has been assigned to your order #${order._id}`,
        metadata: { orderId: order._id.toString() },
      });
    } catch {}

    try {
      await createAndSendNotification(req.user._id, {
        type: "order_assigned",
        title: "Order assigned",
        message: `You've been assigned to order #${order._id}`,
        metadata: { orderId: order._id.toString() },
      });
    } catch {}

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

export const requestPriceChange = async (req, res) => {
  try {
    if (req.user.role !== "rider")
      return res.status(403).json({ success: false, error: "Only riders" });

    const { requestedPrice, reason } = req.body || {};
    if (
      !requestedPrice ||
      typeof requestedPrice !== "number" ||
      requestedPrice <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: "Valid requested price is required",
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });
    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        error:
          "Price can only be changed before order acceptance. Once accepted, price is locked.",
      });
    }

    if (order.priceNegotiation?.status === "requested") {
      return res
        .status(400)
        .json({ success: false, error: "Price request already pending" });
    }

    const roundedPrice = Math.round(requestedPrice);
    order.riderRequestedPrice = roundedPrice;
    order.priceNegotiation = {
      status: "requested",
      requestedAt: new Date(),
      reason: reason || null,
      respondedAt: null,
    };
    appendTimeline(
      order,
      order.status,
      `Rider requested price change: ₦${roundedPrice.toLocaleString()}${
        reason ? ` (${reason})` : ""
      }`
    );
    await order.save();

    try {
      await createAndSendNotification(order.customerId, {
        type: "price_change_requested",
        title: "Price change requested",
        message: `Rider requested ₦${roundedPrice.toLocaleString()}${
          reason ? ` - ${reason}` : ""
        }`,
        metadata: { orderId: order._id.toString() },
      });
    } catch {}

    io.to(`user:${order.customerId}`).emit(
      SocketEvents.PRICE_CHANGE_REQUESTED,
      {
        id: order._id.toString(),
        requestedPrice: roundedPrice,
        originalPrice: order.originalPrice,
        reason: reason || null,
      }
    );

    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// Customer accepts/rejects price change
export const respondToPriceRequest = async (req, res) => {
  try {
    if (req.user.role !== "customer")
      return res.status(403).json({ success: false, error: "Only customers" });

    const { accept } = req.body || {};
    if (typeof accept !== "boolean") {
      return res.status(400).json({
        success: false,
        error: "accept (boolean) is required",
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });
    if (String(order.customerId) !== String(req.user._id))
      return res.status(403).json({ success: false, error: "Not your order" });
    if (order.priceNegotiation?.status !== "requested") {
      return res
        .status(400)
        .json({ success: false, error: "No pending price request" });
    }

    if (accept) {
      // Accept: Update final price
      order.price = order.riderRequestedPrice;
      order.priceNegotiation.status = "accepted";
      order.priceNegotiation.respondedAt = new Date();
      appendTimeline(
        order,
        order.status,
        `Customer accepted price change: ₦${order.riderRequestedPrice.toLocaleString()}`
      );

      // Notify rider
      try {
        await createAndSendNotification(order.riderId, {
          type: "price_change_accepted",
          title: "Price change accepted",
          message: `Customer accepted your requested price of ₦${order.riderRequestedPrice.toLocaleString()}`,
          metadata: { orderId: order._id.toString() },
        });
      } catch {}

      io.to(`user:${order.riderId}`).emit(SocketEvents.PRICE_CHANGE_ACCEPTED, {
        id: order._id.toString(),
        finalPrice: order.riderRequestedPrice,
      });
    } else {
      // Reject: Keep original price
      order.priceNegotiation.status = "rejected";
      order.priceNegotiation.respondedAt = new Date();
      order.riderRequestedPrice = null;
      appendTimeline(order, order.status, "Customer rejected price change");

      // Notify rider
      try {
        await createAndSendNotification(order.riderId, {
          type: "price_change_rejected",
          title: "Price change rejected",
          message: "Customer rejected your price change request",
          metadata: { orderId: order._id.toString() },
        });
      } catch {}

      io.to(`user:${order.riderId}`).emit(SocketEvents.PRICE_CHANGE_REJECTED, {
        id: order._id.toString(),
      });
    }

    await order.save();
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

    if (action === "pickup" && order.status !== "assigned") {
      return res.status(400).json({
        success: false,
        error:
          "Order must be in 'assigned' status (after price agreement) to mark as picked up",
      });
    }

    order.status = next;
    appendTimeline(order, next, `Status set to ${next}`);
    await order.save();

    // Create user-friendly status messages
    const statusMessages = {
      picked_up: {
        customer: "Order picked up",
        customerMsg: "Your order has been picked up by the rider",
        rider: "Order picked up",
        riderMsg: "You've marked the order as picked up",
      },
      delivering: {
        customer: "Out for delivery",
        customerMsg: "Your order is on the way to the dropoff location",
        rider: "Delivery started",
        riderMsg: "You've started the delivery",
      },
      delivered: {
        customer: "Order delivered",
        customerMsg: "Your order has been successfully delivered",
        rider: "Order delivered",
        riderMsg: "Order has been marked as delivered",
      },
      cancelled: {
        customer: "Order cancelled",
        customerMsg: "This order has been cancelled",
        rider: "Order cancelled",
        riderMsg: "This order has been cancelled",
      },
    };

    const statusInfo = statusMessages[next] || {
      customer: "Order updated",
      customerMsg: `Order status changed to ${next}`,
      rider: "Order updated",
      riderMsg: `Order status changed to ${next}`,
    };

    try {
      await createAndSendNotification(order.customerId, {
        type: "order_status_updated",
        title: statusInfo.customer,
        message: statusInfo.customerMsg,
        metadata: { orderId: order._id.toString() },
      });
    } catch {}

    if (order.riderId) {
      try {
        await createAndSendNotification(order.riderId, {
          type: "order_status_updated",
          title: statusInfo.rider,
          message: statusInfo.riderMsg,
          metadata: { orderId: order._id.toString() },
        });
      } catch {}
    }

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

    // Include rider location if order is active (assigned, picked_up, or delivering)
    // and user is customer, admin, or the assigned rider
    const orderObj = order.toObject();
    if (
      order.riderId &&
      ["assigned", "picked_up", "delivering"].includes(order.status)
    ) {
      try {
        const riderLocation = await RiderLocation.findOne({
          riderId: order.riderId,
        }).select("location lastSeen online");
        if (riderLocation && riderLocation.location?.coordinates) {
          const [lng, lat] = riderLocation.location.coordinates;
          orderObj.riderLocation = {
            lat,
            lng,
            lastSeen: riderLocation.lastSeen,
            online: riderLocation.online,
          };
        }
      } catch (error) {
        console.error("❌ [ORDERS] Error fetching rider location:", error);
        // Continue without rider location
      }
    }

    res.json({ success: true, order: orderObj });
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
    // OTP generation only allowed when order is "delivering" (rider has reached destination)
    if (order.status !== "delivering") {
      return res.status(400).json({
        success: false,
        error:
          "Order must be in 'delivering' status (rider must have started delivery and reached destination) to generate delivery OTP",
      });
    }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const ttlMinutes = Number(process.env.DELIVERY_OTP_TTL_MIN || 15);
    order.delivery.otpCode = code;
    order.delivery.otpExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    // Status remains "delivering" - no status change when OTP is generated
    appendTimeline(order, "delivering", "Delivery OTP generated");
    await order.save();
    try {
      await createAndSendNotification(order.customerId, {
        type: "delivery_otp",
        title: "Delivery code",
        message: `Your delivery code is ${code}. Share this code with the recipient at the dropoff location.`,
        metadata: { orderId: order._id.toString() },
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
    if (order.riderId) {
      io.to(`user:${order.riderId}`).emit(SocketEvents.DELIVERY_OTP, {
        id: order._id.toString(),
        otpExpiresAt: order.delivery.otpExpiresAt,
      });
    }
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
    const commission = Math.round(((gross * commissionRate) / 100) * 100) / 100; // Round to 2 decimals
    const riderNet = Math.round((gross - commission) * 100) / 100;
    order.financial = {
      grossAmount: gross,
      commissionRatePct: commissionRate,
      commissionAmount: commission,
      riderNetAmount: riderNet,
    };
    appendTimeline(order, "delivered", "OTP verified and order delivered");
    await order.save();

    // Create transactions for financial tracking
    try {
      // 1. Customer payment transaction
      await Transaction.create({
        orderId: order._id,
        customerId: order.customerId,
        riderId: order.riderId,
        type: "order_payment",
        amount: gross,
        currency: "NGN",
        status: "completed",
        description: `Order #${order._id} payment`,
        processedAt: new Date(),
      });

      // 2. Commission transaction (10% to platform)
      await Transaction.create({
        orderId: order._id,
        customerId: order.customerId,
        riderId: order.riderId,
        type: "commission",
        amount: commission,
        currency: "NGN",
        status: "completed",
        description: `Commission from order #${order._id}`,
        commissionRate: commissionRate,
        processedAt: new Date(),
      });

      // 3. Rider earnings transaction (will be included in weekly payout)
      await Transaction.create({
        orderId: order._id,
        customerId: order.customerId,
        riderId: order.riderId,
        type: "rider_payout",
        amount: riderNet,
        currency: "NGN",
        status: "pending", // Will be marked completed when payout is processed
        description: `Rider earnings from order #${order._id}`,
        processedAt: null, // Will be set when payout is processed
      });
    } catch (txError) {
      console.error("[ORDER] Failed to create transactions:", txError.message);
      // Don't fail the delivery if transaction creation fails
    }

    // Notify customer
    try {
      await createAndSendNotification(order.customerId, {
        type: "delivery_verified",
        title: "Delivery verified",
        message: `Order #${order._id} has been delivered and verified`,
        metadata: { orderId: order._id.toString() },
      });
    } catch {}

    // Notify rider
    try {
      await createAndSendNotification(req.user._id, {
        type: "delivery_verified",
        title: "Delivery verified",
        message: `Order #${order._id} delivery has been verified`,
        metadata: { orderId: order._id.toString() },
      });
    } catch {}

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

export const uploadDeliveryProofPhoto = async (req, res) => {
  try {
    if (req.user.role !== "rider")
      return res.status(403).json({ success: false, error: "Only riders" });
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });

    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });
    if (String(order.riderId) !== String(req.user._id))
      return res.status(403).json({ success: false, error: "Not your order" });

    const photoUrl = `/api/uploads/profiles/${req.file.filename}`;
    order.delivery.photoUrl = photoUrl;
    await order.save();

    // Emit socket event for photo upload
    io.to(`user:${order.customerId}`).emit(
      SocketEvents.DELIVERY_PROOF_UPDATED,
      {
        id: order._id.toString(),
      }
    );
    if (order.riderId) {
      io.to(`user:${order.riderId}`).emit(SocketEvents.DELIVERY_PROOF_UPDATED, {
        id: order._id.toString(),
      });
    }

    res.json({ success: true, photoUrl });
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

    try {
      await createAndSendNotification(order.customerId, {
        type: "delivery_proof_updated",
        title: "Delivery proof updated",
        message: `Delivery proof for order #${order._id} has been updated`,
        metadata: { orderId: order._id.toString() },
      });
    } catch {}

    io.to(`user:${order.customerId}`).emit(
      SocketEvents.DELIVERY_PROOF_UPDATED,
      {
        id: order._id.toString(),
      }
    );
    // Also emit to rider
    if (order.riderId) {
      io.to(`user:${order.riderId}`).emit(SocketEvents.DELIVERY_PROOF_UPDATED, {
        id: order._id.toString(),
      });
    }
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
