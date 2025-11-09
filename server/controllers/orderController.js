import { SocketEvents } from "../constants/socketEvents.js";
import Order from "../models/Order.js";
import RiderLocation from "../models/RiderLocation.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import { io } from "../server.js";
import {
  calculateDistance,
  geocodeAddress,
} from "../services/geocodingService.js";
import { createAndSendNotification } from "../services/notificationService.js";
import { calculateRoadDistance } from "../services/routingService.js";

const appendTimeline = (order, status, note) => {
  order.timeline.push({ status, note, at: new Date() });
};

/**
 * Calculate delivery price using tiered distance model
 *
 * Pricing Structure (configurable via .env):
 * - Base fare: PRICE_MIN_FARE (default: ₦800)
 * - 0-8km: PRICE_PER_KM_SHORT (default: ₦100/km)
 * - 9-15km: PRICE_PER_KM_MEDIUM (default: ₦140/km)
 * - 16km+: PRICE_PER_KM_LONG (default: ₦200/km)
 *
 * Distance Calculation:
 * - Uses OpenRouteService API for accurate road distance
 * - Falls back to Haversine distance × multiplier if routing API unavailable
 *
 * Vehicle Multiplier:
 * - Car: base price × PRICE_CAR_MULTIPLIER (1.25 = 25% more)
 * - Motorcycle: base price (no multiplier)
 *
 * Example: 10km straight-line → 13.5km effective → ₦800 + (8×₦100) + (5.5×₦140) = ₦2,370
 */
const calculateDeliveryPrice = (distanceKm, vehicleType = "motorcycle") => {
  // Environment variables with fallbacks
  const MIN_FARE = Number(process.env.PRICE_MIN_FARE) || 800;
  const PER_KM_SHORT = Number(process.env.PRICE_PER_KM_SHORT) || 100; // 0-8km
  const PER_KM_MEDIUM = Number(process.env.PRICE_PER_KM_MEDIUM) || 140; // 9-15km
  const PER_KM_LONG = Number(process.env.PRICE_PER_KM_LONG) || 200; // 16km+
  const SHORT_DISTANCE_MAX = Number(process.env.PRICE_SHORT_DISTANCE_MAX) || 8;
  const MEDIUM_DISTANCE_MAX =
    Number(process.env.PRICE_MEDIUM_DISTANCE_MAX) || 15;
  const CAR_MULTIPLIER = Number(process.env.PRICE_CAR_MULTIPLIER) || 1.25;

  if (!distanceKm || distanceKm <= 0) {
    return MIN_FARE;
  }

  // distanceKm is already road distance from routing API (or adjusted Haversine if fallback)
  const adjustedDistance = distanceKm;

  let price;

  // Calculate price with MIN_FARE as base fare
  if (adjustedDistance <= SHORT_DISTANCE_MAX) {
    // Short distance: 0-8km (or configured max)
    price = MIN_FARE + adjustedDistance * PER_KM_SHORT;
  } else if (adjustedDistance <= MEDIUM_DISTANCE_MAX) {
    // Medium distance: 9-15km (or configured range)
    price =
      MIN_FARE +
      SHORT_DISTANCE_MAX * PER_KM_SHORT +
      (adjustedDistance - SHORT_DISTANCE_MAX) * PER_KM_MEDIUM;
  } else {
    // Long distance: 16km+ (or above configured max)
    price =
      MIN_FARE +
      SHORT_DISTANCE_MAX * PER_KM_SHORT +
      (MEDIUM_DISTANCE_MAX - SHORT_DISTANCE_MAX) * PER_KM_MEDIUM +
      (adjustedDistance - MEDIUM_DISTANCE_MAX) * PER_KM_LONG;
  }

  // Vehicle type multiplier (car is more expensive)
  if (vehicleType === "car") {
    price = Math.round(price * CAR_MULTIPLIER);
  } else {
    price = Math.round(price);
  }

  // Ensure minimum fare
  return Math.max(price, MIN_FARE);
};

// Check if coordinates are within Lagos bounds
const isInsideLagos = (lat, lng) => {
  // Lagos bounds: South-West (6.3930, 2.6917) to North-East (6.6730, 4.3510)
  const LAGOS_SOUTH = 6.393;
  const LAGOS_NORTH = 6.673;
  const LAGOS_WEST = 2.6917;
  const LAGOS_EAST = 4.351;

  return (
    lat >= LAGOS_SOUTH &&
    lat <= LAGOS_NORTH &&
    lng >= LAGOS_WEST &&
    lng <= LAGOS_EAST
  );
};

// Estimate price before creating order
export const estimatePrice = async (req, res) => {
  try {
    const { pickup, dropoff } = req.body || {};

    if (!pickup?.address || !dropoff?.address) {
      console.error("[ESTIMATE] Missing addresses:", {
        hasPickup: !!pickup?.address,
        hasDropoff: !!dropoff?.address,
      });
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
        console.error("[ESTIMATE] Failed to geocode pickup:", err.message, err);
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
        console.error(
          "[ESTIMATE] Failed to geocode dropoff:",
          err.message,
          err
        );
      }
    }

    if (
      pickupData.lat &&
      pickupData.lng &&
      dropoffData.lat &&
      dropoffData.lng
    ) {
      // Validate coordinates are numbers
      if (
        typeof pickupData.lat !== "number" ||
        typeof pickupData.lng !== "number" ||
        typeof dropoffData.lat !== "number" ||
        typeof dropoffData.lng !== "number" ||
        isNaN(pickupData.lat) ||
        isNaN(pickupData.lng) ||
        isNaN(dropoffData.lat) ||
        isNaN(dropoffData.lng)
      ) {
        console.error("[ESTIMATE] Invalid coordinates:", {
          pickup: { lat: pickupData.lat, lng: pickupData.lng },
          dropoff: { lat: dropoffData.lat, lng: dropoffData.lng },
        });
        return res.status(400).json({
          success: false,
          error: "Invalid coordinates provided",
        });
      }

      // Validate both locations are within Lagos
      if (
        !isInsideLagos(pickupData.lat, pickupData.lng) ||
        !isInsideLagos(dropoffData.lat, dropoffData.lng)
      ) {
        console.warn("[ESTIMATE] Location outside Lagos bounds:", {
          pickup: { lat: pickupData.lat, lng: pickupData.lng },
          dropoff: { lat: dropoffData.lat, lng: dropoffData.lng },
        });
        return res.status(400).json({
          success: false,
          error: "We currently only support deliveries within Lagos State.",
        });
      }

      distanceKm = await calculateRoadDistance(
        pickupData.lat,
        pickupData.lng,
        dropoffData.lat,
        dropoffData.lng
      );

      // Calculate for both vehicle types using new pricing model
      const bikePrice = calculateDeliveryPrice(distanceKm, "motorcycle");
      const carPrice = calculateDeliveryPrice(distanceKm, "car");
      estimatedPrice = bikePrice;

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
      console.warn("[ESTIMATE] Missing coordinates, using minimum fare");
      console.warn("[ESTIMATE] Missing coordinates details:", {
        pickup: { lat: pickupData.lat, lng: pickupData.lng },
        dropoff: { lat: dropoffData.lat, lng: dropoffData.lng },
      });
      estimatedPrice = calculateDeliveryPrice(0);
      console.log("[ESTIMATE] Minimum fare calculated:", estimatedPrice);
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
    console.error("[ESTIMATE] ❌ ERROR in price estimation:", e);
    console.error("[ESTIMATE] Error name:", e?.name);
    console.error("[ESTIMATE] Error message:", e?.message);
    console.error("[ESTIMATE] Error stack:", e?.stack);
    console.error(
      "[ESTIMATE] Full error object:",
      JSON.stringify(e, Object.getOwnPropertyNames(e))
    );
    console.error(
      "[ESTIMATE] Request body that caused error:",
      JSON.stringify(req.body, null, 2)
    );
    console.error(
      "[ESTIMATE] Request user:",
      req.user?._id || req.user?.id || "No user"
    );

    // Log specific error types
    if (e instanceof TypeError) {
      console.error(
        "[ESTIMATE] TypeError details - likely a function call issue"
      );
    }
    if (e instanceof ReferenceError) {
      console.error(
        "[ESTIMATE] ReferenceError details - likely a variable/function not found"
      );
    }
    if (e instanceof Error) {
      console.error("[ESTIMATE] Generic Error - check the message above");
    }

    res.status(500).json({
      success: false,
      error: e.message || "Internal server error during price estimation",
      errorType: e?.name || "Unknown",
    });
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
      distanceKm = await calculateRoadDistance(
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
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(10, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const search = req.query.search?.toString().trim() || "";

    const query = { customerId: req.user._id };

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { items: searchRegex },
        { "pickup.address": searchRegex },
        { "dropoff.address": searchRegex },
      ];
    }

    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
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
                const dist = calculateDistance(
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

export const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body || {};
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });

    const user = req.user;
    const isCustomer = String(order.customerId) === String(user._id);
    const isRider = order.riderId && String(order.riderId) === String(user._id);
    const isAdmin = user.role === "admin";

    if (!isCustomer && !isRider && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "You don't have permission to cancel this order",
      });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        error: "Order is already cancelled",
      });
    }

    const cancellableStatuses = ["pending", "assigned"];

    if (!cancellableStatuses.includes(order.status)) {
      const statusMessages = {
        picked_up:
          "Cannot cancel order after pickup. The rider has already collected the items.",
        delivering:
          "Cannot cancel order while in transit. The order is being delivered.",
        delivered:
          "Cannot cancel a completed order. The order has already been delivered.",
      };

      return res.status(400).json({
        success: false,
        error:
          statusMessages[order.status] || "Cannot cancel order at this stage.",
      });
    }

    // Cancel the order
    order.status = "cancelled";
    const cancelNote = reason
      ? `Cancelled by ${
          user.role === "customer"
            ? "customer"
            : user.role === "rider"
            ? "rider"
            : "admin"
        }. Reason: ${reason}`
      : `Cancelled by ${
          user.role === "customer"
            ? "customer"
            : user.role === "rider"
            ? "rider"
            : "admin"
        }`;
    appendTimeline(order, "cancelled", cancelNote);

    const previousRiderId = order.riderId;

    if (order.riderId) {
      order.riderId = null;
    }

    await order.save();

    // Send notifications
    try {
      await createAndSendNotification(order.customerId, {
        type: "order_cancelled",
        title: "Order Cancelled",
        message: `Order #${String(order._id).slice(-6)} has been cancelled`,
        metadata: { orderId: order._id.toString() },
      });
    } catch {}

    // Notify rider if there was one assigned
    if (previousRiderId) {
      try {
        await createAndSendNotification(previousRiderId, {
          type: "order_cancelled",
          title: "Order Cancelled",
          message: `Order #${String(order._id).slice(
            -6
          )} has been cancelled. You can now accept other orders.`,
          metadata: { orderId: order._id.toString() },
        });
      } catch {}
    }

    // Emit socket events
    io.to(`user:${order.customerId}`).emit(SocketEvents.ORDER_STATUS_UPDATED, {
      id: order._id.toString(),
      status: "cancelled",
    });
    if (previousRiderId) {
      io.to(`user:${previousRiderId}`).emit(SocketEvents.ORDER_STATUS_UPDATED, {
        id: order._id.toString(),
        status: "cancelled",
      });
    }

    res.json({
      success: true,
      order,
      message: "Order cancelled successfully",
    });
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
      // Remove cancel from here - use dedicated cancelOrder endpoint instead
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
