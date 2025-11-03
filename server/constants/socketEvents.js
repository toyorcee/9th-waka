export const SocketEvents = {
  // Order lifecycle
  ORDER_CREATED: "order.created",
  ORDER_ASSIGNED: "order.assigned",
  ORDER_STATUS_UPDATED: "order.status_updated",

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
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];


