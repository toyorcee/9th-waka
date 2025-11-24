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
  otherPartyProfilePicture?: string | null;
  otherPartyName?: string | null;
  lastMessage?: ChatMessage;
  unreadCount: number;
  orderStatus?: string;
  archived?: boolean;
  deleted?: boolean;
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

/**
 * Soft delete a conversation (admin can still view for disputes)
 */
export async function deleteConversation(orderId: string): Promise<void> {
  await apiClient.delete(`/chat/conversations/${orderId}`);
}

/**
 * Archive or unarchive a conversation
 */
export async function archiveConversation(
  orderId: string,
  archive: boolean
): Promise<void> {
  await apiClient.patch(`/chat/conversations/${orderId}/archive`, {
    archived: archive,
  });
}

// Support Chat Types
export interface SupportMessage {
  _id: string;
  id?: string;
  supportChatId: string;
  senderId: string;
  receiverId: string;
  message: string;
  delivered: boolean;
  read: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface SupportChat {
  _id: string;
  userId: string;
  adminId: string | null;
  status: "open" | "closed" | "waiting";
  lastMessageAt: string | Date;
  admin?: {
    _id: string;
    fullName: string;
    email: string;
    profilePicture?: string | null;
  };
  user?: {
    _id: string;
    fullName: string;
    email: string;
    profilePicture?: string | null;
    role: string;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface OnlineAdmin {
  _id: string;
  email: string;
  fullName: string;
  profilePicture?: string | null;
}

/**
 * Check for online admins
 */
export async function getOnlineAdmins(): Promise<{
  onlineAdmins: OnlineAdmin[];
  hasOnlineAdmins: boolean;
  totalAdmins: number;
}> {
  const response = await apiClient.get("/chat/support/online-admins");
  return response.data;
}

/**
 * Get or create support chat for current user
 */
export async function getOrCreateSupportChat(): Promise<SupportChat> {
  const response = await apiClient.get("/chat/support/chat");
  return response.data?.supportChat;
}

/**
 * Get a specific support chat by ID (for admins)
 */
export async function getSupportChatById(
  supportChatId: string
): Promise<SupportChat> {
  const response = await apiClient.get(`/chat/support/${supportChatId}`);
  return response.data?.supportChat;
}

/**
 * Get support chat messages
 */
export async function getSupportMessages(
  supportChatId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: SupportMessage[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  const response = await apiClient.get(
    `/chat/support/${supportChatId}/messages?${params.toString()}`
  );
  return {
    messages: response.data?.messages || [],
    hasMore: response.data?.hasMore || false,
  };
}

/**
 * Send a message in support chat
 */
export async function sendSupportMessage(
  supportChatId: string,
  message: string
): Promise<SupportMessage> {
  const response = await apiClient.post(
    `/chat/support/${supportChatId}/messages`,
    { message }
  );
  return response.data?.message || response.data;
}

/**
 * Mark support messages as read
 */
export async function markSupportMessagesAsRead(
  supportChatId: string
): Promise<void> {
  await apiClient.patch(`/chat/support/${supportChatId}/read`);
}

/**
 * Get all support chats assigned to an admin
 */
export async function getAdminSupportChats(): Promise<
  Array<SupportChat & { lastMessage?: SupportMessage | null; unreadCount: number }>
> {
  const response = await apiClient.get("/chat/support/admin/chats");
  return response.data?.chats || [];
}