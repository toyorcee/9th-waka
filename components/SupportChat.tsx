import { IconNames, Icons } from "@/constants/icons";
import { SocketEvents } from "@/constants/socketEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getOrCreateSupportChat,
  getSupportChatById,
  getSupportMessages,
  markSupportMessagesAsRead,
  sendSupportMessage,
  SupportChat as SupportChatType,
  SupportMessage,
} from "@/services/chatApi";
import { getUserPresence, UserPresence } from "@/services/presenceApi";
import { socketClient } from "@/services/socketClient";
import { toAbsoluteUrl } from "@/services/url";
import { Image } from "expo-image";
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

interface SupportChatProps {
  visible: boolean;
  onClose: () => void;
  supportChatId?: string;
}

export default function SupportChat({
  visible,
  onClose,
  supportChatId: propSupportChatId,
}: SupportChatProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const [supportChat, setSupportChat] = useState<SupportChatType | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(1);
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [loadingPresence, setLoadingPresence] = useState(false);

  const isAdmin = user?.role === "admin";
  const otherPartyId = isAdmin ? supportChat?.userId : supportChat?.adminId;
  const otherPartyName = isAdmin
    ? supportChat?.user?.fullName || "Customer"
    : supportChat?.admin?.fullName || "Customer Support";
  const otherPartyProfilePicture = isAdmin
    ? supportChat?.user?.profilePicture
    : supportChat?.admin?.profilePicture;

  useEffect(() => {
    if (visible) {
      loadSupportChat(false);
      setupSocketListeners();
    }

    return () => {
      const socket = socketClient.socketInstance;
      if (socket) {
        socket.off(SocketEvents.CHAT_MESSAGE);
      }
    };
  }, [visible]);

  useEffect(() => {
    if (visible && supportChat?._id) {
      loadMessages();
      markAsRead();
    }
  }, [visible, supportChat?._id]);

  useEffect(() => {
    if (visible && otherPartyId) {
      loadPresence();
      // Refresh presence every 30 seconds
      const interval = setInterval(loadPresence, 30000);
      return () => clearInterval(interval);
    }
  }, [visible, otherPartyId]);

  const loadSupportChat = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);

      let chat;
      if (propSupportChatId) {
        chat = await getSupportChatById(propSupportChatId);
      } else {
        chat = await getOrCreateSupportChat();
      }

      setSupportChat(chat);
      return chat;
    } catch (error: any) {
      console.error("Error loading support chat:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error?.message || "Failed to load support chat",
      });
      return null;
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!supportChat?._id) return;
    try {
      const data = await getSupportMessages(supportChat._id, page, 50);
      if (page === 1) {
        setMessages(data.messages);
      } else {
        setMessages((prev) => [...data.messages, ...prev]);
      }
      setHasMore(data.hasMore);
    } catch (error: any) {
      console.error("Error loading messages:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error?.message || "Failed to load messages",
      });
    }
  };

  const markAsRead = async () => {
    if (!supportChat?._id) return;
    try {
      await markSupportMessagesAsRead(supportChat._id);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const setupSocketListeners = () => {
    const socket = socketClient.socketInstance;
    if (!socket) return;

    socket.on(SocketEvents.CHAT_MESSAGE, (data: any) => {
      const message = data?.message || data;
      if (
        message &&
        message.supportChatId === supportChat?._id &&
        data?.type === "support"
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id || m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });

        if (data?.supportChat) {
          setSupportChat(data.supportChat);
        }

        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
        if (String(message.receiverId) === String(user?.id)) {
          markAsRead();
        }
      }
    });

    socket.on(SocketEvents.CHAT_MESSAGE_READ, (data: any) => {
      if (
        data?.supportChatId === supportChat?._id &&
        data?.readBy === otherPartyId &&
        data?.type === "support"
      ) {
        setMessages((prev) =>
          prev.map((msg) =>
            String(msg.senderId) === String(user?.id) &&
            String(msg.receiverId) === String(otherPartyId)
              ? { ...msg, read: true }
              : msg
          )
        );
      }
    });
  };

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || sending) return;

    // If no chat exists yet, create one first
    let chatId = supportChat?._id;
    if (!chatId) {
      const newChat = await loadSupportChat(false);
      chatId = newChat?._id;
      if (!chatId) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to initialize chat. Please try again.",
        });
        return;
      }
    }

    setSending(true);
    setMessageText("");

    try {
      const newMessage = await sendSupportMessage(chatId, text);
      setMessages((prev) => [...prev, newMessage]);

      const hasAdmin = supportChat?.adminId;
      Toast.show({
        type: "success",
        text1: "Message sent!",
        text2: hasAdmin
          ? "Your message has been delivered"
          : "A live agent will be in touch to reply soon",
        visibilityTime: 3000,
      });

      const currentAdminId = supportChat?.adminId;
      loadSupportChat(false).then((updatedChat) => {
        if (updatedChat?.adminId && !currentAdminId) {
          setSupportChat(updatedChat);
          Toast.show({
            type: "info",
            text1: "Agent connected",
            text2: "A support agent is now available to help you",
            visibilityTime: 3000,
          });
        }
      });

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      setMessageText(text);
      Toast.show({
        type: "error",
        text1: "Failed to send message",
        text2: error?.message || "Please try again",
      });
    } finally {
      setSending(false);
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || !supportChat?._id) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await getSupportMessages(supportChat._id, nextPage, 50);
      if (data.messages.length > 0) {
        setMessages((prev) => [...data.messages, ...prev]);
        setPage(nextPage);
        setHasMore(data.hasMore);
      }
    } catch (error: any) {
      console.error("Error loading more messages:", error);
    } finally {
      setLoadingMore(false);
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

  const loadPresence = async () => {
    if (!otherPartyId) return;
    setLoadingPresence(true);
    try {
      const presenceData = await getUserPresence(otherPartyId);
      setPresence(presenceData);
    } catch (error) {
      console.error("Error loading presence:", error);
    } finally {
      setLoadingPresence(false);
    }
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
        className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
        style={{ paddingTop: insets.top }}
      >
        {/* Header */}
        <View
          className={`border-b px-5 py-4 flex-row items-center justify-between ${
            isDark
              ? "bg-secondary border-neutral-100"
              : "bg-white border-gray-200"
          }`}
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
              className="mr-3 p-2"
              activeOpacity={0.7}
            >
              <Icons.navigation
                name={IconNames.arrowBack as any}
                size={24}
                color={isDark ? "#FFFFFF" : "#000000"}
              />
            </TouchableOpacity>
            {/* Profile Picture */}
            <View className="relative mr-3">
              {otherPartyProfilePicture ? (
                <Image
                  source={{
                    uri: String(
                      toAbsoluteUrl(String(otherPartyProfilePicture))
                    ),
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                  }}
                  contentFit="cover"
                />
              ) : (
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    isDark ? "bg-dark-100" : "bg-gray-100"
                  }`}
                >
                  <Icons.user
                    name={IconNames.personCircle as any}
                    size={24}
                    color={isDark ? "#9CA4AB" : "#6E6E73"}
                  />
                </View>
              )}
              {/* Online Status Dot */}
              {presence?.online && (
                <View className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-white" />
              )}
            </View>
            <View className="flex-1">
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
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
                  <Text
                    className={`text-xs ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Last seen {formatLastSeen(presence.lastSeen)}
                  </Text>
                )
              ) : loadingPresence ? (
                <Text
                  className={`text-xs ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Loading...
                </Text>
              ) : isAdmin ? (
                <Text
                  className={`text-xs ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Customer
                </Text>
              ) : supportChat?.status === "waiting" ? (
                <Text
                  className={`text-xs ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Waiting for admin...
                </Text>
              ) : (
                <Text
                  className={`text-xs ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Customer Support
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Messages */}
        {!supportChat?._id && loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#AB8BFF" />
            <Text
              className={`mt-4 text-sm ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              Initializing chat...
            </Text>
          </View>
        ) : !supportChat?.adminId &&
          supportChat?.status === "waiting" &&
          messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-info/20 rounded-full p-6 mb-4">
              <Icons.communication
                name={IconNames.chatbubbleOutline as any}
                size={48}
                color="#5AC8FA"
              />
            </View>
            <Text
              className={`text-xl font-bold mb-2 text-center ${
                isDark ? "text-light-100" : "text-black"
              }`}
            >
              Waiting for Support
            </Text>
            <Text
              className={`text-sm text-center leading-5 ${
                isDark ? "text-light-400" : "text-gray-600"
              }`}
            >
              Send a message below and an available admin will be assigned to
              help you. Your message will be delivered as soon as an admin comes
              online.
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            contentContainerStyle={{ padding: 16 }}
            onContentSizeChange={() => {
              if (messages.length > 0 && page === 1) {
                scrollViewRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onScrollBeginDrag={(e) => {
              const { contentOffset } = e.nativeEvent;
              if (contentOffset.y < 100 && hasMore && !loadingMore) {
                handleLoadMore();
              }
            }}
            scrollEventThrottle={400}
          >
            {messages.map((msg, index) => {
              const isMe = String(msg.senderId) === String(user?.id);
              const showAvatar =
                index === 0 || messages[index - 1].senderId !== msg.senderId;
              const showTime =
                index === messages.length - 1 ||
                new Date(msg.createdAt).getTime() -
                  new Date(messages[index + 1].createdAt).getTime() >
                  300000;

              return (
                <View
                  key={msg._id || msg.id || index}
                  className={`mb-2 flex-row ${
                    isMe ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isMe && showAvatar && (
                    <View className="mr-2">
                      {otherPartyProfilePicture ? (
                        <Image
                          source={{
                            uri: String(
                              toAbsoluteUrl(String(otherPartyProfilePicture))
                            ),
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                          }}
                          contentFit="cover"
                        />
                      ) : (
                        <View
                          className={`w-8 h-8 rounded-full items-center justify-center ${
                            isDark ? "bg-dark-100" : "bg-gray-100"
                          }`}
                        >
                          <Icons.user
                            name={IconNames.personCircle as any}
                            size={16}
                            color={isDark ? "#9CA4AB" : "#6E6E73"}
                          />
                        </View>
                      )}
                    </View>
                  )}
                  <View
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMe
                        ? isDark
                          ? "bg-accent"
                          : "bg-accent"
                        : isDark
                        ? "bg-dark-100"
                        : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        isMe
                          ? "text-white"
                          : isDark
                          ? "text-light-100"
                          : "text-black"
                      }`}
                    >
                      {msg.message}
                    </Text>
                    {showTime && (
                      <View className="flex-row items-center justify-end mt-1">
                        <Text
                          className={`text-xs ${
                            isMe
                              ? "text-white/70"
                              : isDark
                              ? "text-light-400"
                              : "text-gray-500"
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </Text>
                        {isMe && (
                          <View className="ml-1.5">
                            {msg.read ? (
                              <Icons.action
                                name={IconNames.checkmarkDone as any}
                                size={14}
                                color={isDark ? "#5AC8FA" : "#5AC8FA"}
                              />
                            ) : msg.delivered ? (
                              <Icons.action
                                name={IconNames.checkmarkDone as any}
                                size={14}
                                color={isDark ? "#9CA4AB" : "#9CA4AB"}
                              />
                            ) : (
                              <Icons.action
                                name={IconNames.checkmark as any}
                                size={14}
                                color={isDark ? "#9CA4AB" : "#9CA4AB"}
                              />
                            )}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
            {loadingMore && (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#AB8BFF" />
              </View>
            )}
          </ScrollView>
        )}

        {/* Input - Always show, even when waiting */}
        <View
          className={`border-t px-4 py-3 flex-row items-center ${
            isDark
              ? "bg-secondary border-neutral-100"
              : "bg-white border-gray-200"
          }`}
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder={
              supportChat?.status === "waiting" && !supportChat?.adminId
                ? "Type a message... An admin will be assigned soon"
                : "Type a message..."
            }
            placeholderTextColor={isDark ? "#9CA4AB" : "#6E6E73"}
            className={`flex-1 rounded-full px-4 py-3 mr-3 text-base ${
              isDark ? "bg-dark-100 text-light-100" : "bg-gray-100 text-black"
            }`}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
            editable={!sending}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
            className={`w-12 h-12 rounded-full items-center justify-center ${
              messageText.trim() && !sending
                ? "bg-accent"
                : isDark
                ? "bg-dark-100"
                : "bg-gray-200"
            }`}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icons.action
                name={IconNames.arrowForward as any}
                size={20}
                color={
                  messageText.trim() && !sending
                    ? "#FFFFFF"
                    : isDark
                    ? "#9CA4AB"
                    : "#6E6E73"
                }
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
