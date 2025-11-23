export const SocketEvents = {
  // Order lifecycle
  ORDER_CREATED: "order.created",
  ORDER_ASSIGNED: "order.assigned",
  ORDER_STATUS_UPDATED: "order.status_updated",
  NEW_ORDER_AVAILABLE: "order.new_available",

  // Delivery specifics
  DELIVERY_OTP: "delivery.otp",
  DELIVERY_VERIFIED: "delivery.verified",
  DELIVERY_PROOF_UPDATED: "delivery.proof_updated",

  // Auth/user
  AUTH_VERIFIED: "auth.verified",
  PROFILE_UPDATED: "profile.updated",

  // Finance/payouts
  PAYOUT_GENERATED: "payout.generated",
  PAYOUT_PAID: "payout.paid",
  PAYMENT_CONFIRMED: "payment.confirmed",

  // Price negotiation
  PRICE_CHANGE_REQUESTED: "price.change_requested",
  PRICE_CHANGE_ACCEPTED: "price.change_accepted",
  PRICE_CHANGE_REJECTED: "price.change_rejected",

  // Location tracking
  RIDER_LOCATION_UPDATED: "rider.location_updated",

  // Chat
  CHAT_MESSAGE: "chat.message",
  CHAT_MESSAGE_DELIVERED: "chat.message_delivered",
  CHAT_MESSAGE_READ: "chat.message_read",

  // User Presence
  USER_ONLINE: "user.online",
  USER_OFFLINE: "user.offline",

  // Ratings
  RATING_RECEIVED: "rating.received",
};
