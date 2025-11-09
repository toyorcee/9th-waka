export const SocketEvents = {
  ORDER_CREATED: "order.created",
  ORDER_ASSIGNED: "order.assigned",
  ORDER_STATUS_UPDATED: "order.status_updated",
  DELIVERY_OTP: "delivery.otp",
  DELIVERY_VERIFIED: "delivery.verified",
  DELIVERY_PROOF_UPDATED: "delivery.proof_updated",
  AUTH_VERIFIED: "auth.verified",
  PROFILE_UPDATED: "profile.updated",
  PAYOUT_GENERATED: "payout.generated",
  PAYOUT_PAID: "payout.paid",
  PRICE_CHANGE_REQUESTED: "price.change_requested",
  PRICE_CHANGE_ACCEPTED: "price.change_accepted",
  PRICE_CHANGE_REJECTED: "price.change_rejected",
  RIDER_LOCATION_UPDATED: "rider.location_updated",
  CHAT_MESSAGE: "chat.message",
  CHAT_MESSAGE_READ: "chat.message_read",
  USER_ONLINE: "user.online",
  USER_OFFLINE: "user.offline",
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];
