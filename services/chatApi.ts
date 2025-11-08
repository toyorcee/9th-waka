import { apiClient } from "./apiClient";

export interface ChatMessage {
  _id: string;
  id?: string;
  orderId: string;
  senderId: string;
  receiverId: string;
  message: string;
  read: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ChatConversation {
  _id: string;
  orderId: string;
  participants: {
    customerId: string;
    riderId: string | null;
  };
  lastMessage?: ChatMessage;
  unreadCount: number;
  orderStatus?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Get chat messages for a specific order
 */
export async function getOrderMessages(
  orderId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  const response = await apiClient.get(
    `/chat/orders/${orderId}/messages?${params.toString()}`
  );
  return {
    messages: response.data?.messages || [],
    hasMore: response.data?.hasMore || false,
  };
}

/**
 * Send a message in an order chat
 */
export async function sendOrderMessage(
  orderId: string,
  message: string
): Promise<ChatMessage> {
  const response = await apiClient.post(`/chat/orders/${orderId}/messages`, {
    message,
  });
  return response.data?.message || response.data;
}

/**
 * Mark messages as read for an order
 */
export async function markOrderMessagesAsRead(orderId: string): Promise<void> {
  await apiClient.patch(`/chat/orders/${orderId}/read`);
}

/**
 * Get all chat conversations for the current user
 */
export async function getMyConversations(): Promise<ChatConversation[]> {
  const response = await apiClient.get("/chat/conversations");
  return response.data?.conversations || response.data || [];
}
