import { IconNames, Icons } from "@/constants/icons";
import { SocketEvents } from "@/constants/socketEvents";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChatMessage,
  getOrderMessages,
  markOrderMessagesAsRead,
  sendOrderMessage,
} from "@/services/chatApi";
import { getOrder, Order } from "@/services/orderApi";
import { getUserPresence, UserPresence } from "@/services/presenceApi";
import { socketClient } from "@/services/socketClient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

interface OrderChatProps {
  orderId: string;
  visible: boolean;
  onClose: () => void;
}

export default function OrderChat({
  orderId,
  visible,
  onClose,
}: OrderChatProps) {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(1);
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [loadingPresence, setLoadingPresence] = useState(false);

  // Determine the other party (customer or rider)
  const otherPartyId =
    user?.role === "customer" ? order?.riderId : order?.customerId;
  const otherPartyName =
    user?.role === "customer"
      ? order?.riderId
        ? "Rider"
        : "No rider assigned"
      : "Customer";

  useEffect(() => {
    if (visible && orderId) {
      loadOrder();
      loadMessages();
      markAsRead();
      setupSocketListeners();
    }

    return () => {
      // Cleanup socket listeners
      const socket = socketClient.socketInstance;
      if (socket) {
        socket.off(SocketEvents.CHAT_MESSAGE);
      }
    };
  }, [visible, orderId]);

  useEffect(() => {
    if (visible && otherPartyId) {
      loadPresence();
      // Refresh presence every 30 seconds
      const interval = setInterval(loadPresence, 30000);
      return () => clearInterval(interval);
    }
  }, [visible, otherPartyId]);

  const loadOrder = async () => {
    try {
      const orderData = await getOrder(orderId);
      setOrder(orderData);
    } catch (error) {
      console.error("Failed to load order:", error);
    }
  };

  const loadPresence = async () => {
    if (!otherPartyId) return;
    setLoadingPresence(true);
    try {
      const presenceData = await getUserPresence(otherPartyId);
      setPresence(presenceData);
    } catch (error) {
      console.error("Failed to load presence:", error);
    } finally {
      setLoadingPresence(false);
    }
  };

  const loadMessages = async (pageNum: number = 1, append: boolean = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await getOrderMessages(orderId, pageNum, 50);
      if (append) {
        setMessages((prev) => [...response.messages, ...prev]);
      } else {
        setMessages(response.messages);
      }
      setHasMore(response.hasMore);
      setPage(pageNum);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load messages",
        text2: error?.message || "Please try again",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const markAsRead = async () => {
    try {
      await markOrderMessagesAsRead(orderId);
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  const setupSocketListeners = () => {
    const socket = socketClient.socketInstance;
    if (!socket) return;

    socket.on(SocketEvents.CHAT_MESSAGE, (data: any) => {
      const message = data?.message || data;
      if (message && message.orderId === orderId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id || m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
        if (message.receiverId === user?.id) {
          markAsRead();
        }
      }
    });

    socket.on(SocketEvents.CHAT_MESSAGE_READ, (data: any) => {
      if (data?.orderId === orderId && data?.readBy === otherPartyId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.senderId === user?.id && msg.receiverId === otherPartyId
              ? { ...msg, read: true }
              : msg
          )
        );
      }
    });
  };

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || sending || !otherPartyId) return;

    setSending(true);
    try {
      const newMessage = await sendOrderMessage(orderId, text);
      setMessages((prev) => [...prev, newMessage]);
      setMessageText("");
      // Auto-scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to send message",
        text2: error?.message || "Please try again",
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatLastSeen = (lastSeen: string | Date) => {
    const d = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-primary"
        style={{ paddingTop: insets.top }}
      >
        {/* Header */}
        <View
          className="bg-secondary border-b border-neutral-100 px-5 py-4 flex-row items-center justify-between"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={onClose}
              className="mr-4 p-2"
              activeOpacity={0.7}
            >
              <Icons.navigation
                name={IconNames.arrowBack as any}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-light-100 text-lg font-bold">
                {otherPartyName}
              </Text>
              {presence ? (
                presence.online ? (
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-success mr-1.5" />
                    <Text className="text-success text-xs font-medium">
                      Online
                    </Text>
                  </View>
                ) : (
                  <Text className="text-light-400 text-xs">
                    Last seen {formatLastSeen(presence.lastSeen)}
                  </Text>
                )
              ) : loadingPresence ? (
                <Text className="text-light-400 text-xs">Loading...</Text>
              ) : (
                <Text className="text-light-400 text-xs">
                  Order #{orderId.slice(-6)}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push(`/orders/${orderId}` as any)}
            className="p-2"
            activeOpacity={0.7}
          >
            <Icons.info
              name={IconNames.informationOutline as any}
              size={22}
              color="#AB8BFF"
            />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {loading && messages.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#AB8BFF" />
            <Text className="text-light-400 mt-4 text-sm">
              Loading messages...
            </Text>
          </View>
        ) : !otherPartyId ? (
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-warning/20 rounded-full p-6 mb-4">
              <Icons.communication
                name={IconNames.chatbubbleOutline as any}
                size={48}
                color="#FF9500"
              />
            </View>
            <Text className="text-light-100 text-xl font-bold mb-2 text-center">
              No chat available
            </Text>
            <Text className="text-light-400 text-sm text-center leading-5">
              {user?.role === "customer"
                ? "A rider hasn't been assigned to this order yet."
                : "This order doesn't have a customer assigned."}
            </Text>
          </View>
        ) : (
          <>
            {loadingMore && (
              <View className="py-2 items-center">
                <ActivityIndicator size="small" color="#AB8BFF" />
              </View>
            )}
            <ScrollView
              ref={scrollViewRef}
              className="flex-1 px-4 py-3"
              contentContainerStyle={{ paddingBottom: 20 }}
              onContentSizeChange={() => {
                scrollViewRef.current?.scrollToEnd({ animated: false });
              }}
            >
              {messages.length === 0 ? (
                <View className="flex-1 items-center justify-center py-12">
                  <View className="bg-accent/20 rounded-full p-6 mb-4">
                    <Icons.communication
                      name={IconNames.chatbubbleOutline as any}
                      size={48}
                      color="#AB8BFF"
                    />
                  </View>
                  <Text className="text-light-300 text-base font-semibold mb-2">
                    No messages yet
                  </Text>
                  <Text className="text-light-400 text-sm text-center">
                    Start the conversation!
                  </Text>
                </View>
              ) : (
                messages.map((message, index) => {
                  const isMe = message.senderId === user?.id;
                  const prevMessage = index > 0 ? messages[index - 1] : null;
                  const showDateSeparator =
                    !prevMessage ||
                    new Date(message.createdAt).toDateString() !==
                      new Date(prevMessage.createdAt).toDateString();

                  // Group messages sent within 5 minutes
                  const isGrouped =
                    prevMessage &&
                    prevMessage.senderId === message.senderId &&
                    new Date(message.createdAt).getTime() -
                      new Date(prevMessage.createdAt).getTime() <
                      300000; // 5 minutes

                  return (
                    <React.Fragment key={message._id || message.id}>
                      {showDateSeparator && (
                        <View className="items-center my-4">
                          <View className="bg-dark-100/50 rounded-full px-4 py-1.5">
                            <Text className="text-light-400 text-xs">
                              {new Date(message.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "long",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </Text>
                          </View>
                        </View>
                      )}
                      <View
                        className={`mb-1 ${
                          isMe ? "items-end" : "items-start"
                        } ${isGrouped ? "mt-0" : "mt-2"}`}
                      >
                        <View
                          className={`rounded-2xl px-4 py-2.5 max-w-[75%] ${
                            isMe
                              ? "bg-accent rounded-br-sm"
                              : "bg-secondary border border-neutral-100 rounded-bl-sm"
                          }`}
                          style={{
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.1,
                            shadowRadius: 2,
                            elevation: 2,
                          }}
                        >
                          <Text
                            className={`text-sm leading-5 ${
                              isMe ? "text-primary" : "text-light-100"
                            }`}
                          >
                            {message.message}
                          </Text>
                          <View className="flex-row items-center justify-end mt-1">
                            <Text
                              className={`text-[10px] mr-1.5 ${
                                isMe ? "text-primary/60" : "text-light-400"
                              }`}
                            >
                              {new Date(message.createdAt).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "numeric",
                                  minute: "2-digit",
                                }
                              )}
                            </Text>
                            {isMe && (
                              <View>
                                {message.read ? (
                                  <Icons.communication
                                    name={IconNames.checkmarkDone as any}
                                    size={14}
                                    color="#5AC8FA"
                                  />
                                ) : (
                                  <Icons.communication
                                    name={IconNames.checkmark as any}
                                    size={14}
                                    color="#9CA4AB"
                                  />
                                )}
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </React.Fragment>
                  );
                })
              )}
            </ScrollView>
          </>
        )}

        {/* Input */}
        {otherPartyId && (
          <View
            className="bg-secondary border-t border-neutral-100 px-5 py-3"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="flex-row items-end">
              <TextInput
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Type a message..."
                placeholderTextColor="#9CA4AB"
                multiline
                maxLength={500}
                className="flex-1 bg-dark-100 rounded-2xl px-4 py-3 text-light-100 text-base mr-3 border border-neutral-100"
                style={{ maxHeight: 100 }}
                onSubmitEditing={handleSend}
                editable={!sending}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!messageText.trim() || sending}
                className={`rounded-full p-3 ${
                  messageText.trim() && !sending ? "bg-accent" : "bg-dark-100"
                }`}
                style={{
                  shadowColor: "#AB8BFF",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: messageText.trim() ? 0.3 : 0,
                  shadowRadius: 4,
                  elevation: messageText.trim() ? 4 : 0,
                }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#030014" />
                ) : (
                  <Icons.communication
                    name={IconNames.sendOutline as any}
                    size={22}
                    color={messageText.trim() ? "#030014" : "#9CA4AB"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
