import OrderChat from "@/components/OrderChat";
import RobotIcon from "@/components/RobotIcon";
import SupportChat from "@/components/SupportChat";
import { IconNames, Icons } from "@/constants/icons";
import { SocketEvents } from "@/constants/socketEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTabBarPadding } from "@/hooks/useTabBarPadding";
import {
  archiveConversation,
  ChatConversation,
  deleteConversation,
  getMyConversations,
  getOnlineAdmins,
} from "@/services/chatApi";
import { Routes } from "@/services/navigationHelper";
import { updateOrderStatus } from "@/services/orderApi";
import { getUserPresence, UserPresence } from "@/services/presenceApi";
import { socketClient } from "@/services/socketClient";
import { toAbsoluteUrl } from "@/services/url";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

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

export default function MessagesScreen() {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tabBarPadding } = useTabBarPadding();
  const isDark = theme === "dark";
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<
    ChatConversation[]
  >([]);
  const [activeTab, setActiveTab] = useState<"chats" | "archived">("chats");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [supportChatOpen, setSupportChatOpen] = useState(false);
  const [presences, setPresences] = useState<Record<string, UserPresence>>({});
  const [chatbotAnimation] = useState(new Animated.Value(0));
  const [searchQuery, setSearchQuery] = useState("");
  const [hasOnlineAdmins, setHasOnlineAdmins] = useState(false);
  const [checkingAdmins, setCheckingAdmins] = useState(false);

  const loadConversations = async (showRefreshing = false) => {
    if (!isAuthenticated) return;
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getMyConversations();
      // Filter active and archived conversations
      // Only show conversations that have at least one message
      const active = data.filter((conv) => !conv.archived && conv.lastMessage);
      const archived = data.filter((conv) => conv.archived && conv.lastMessage);
      setConversations(active);
      setArchivedConversations(archived);

      // Load presence for all other parties
      const presencePromises = data.map(async (conv) => {
        const otherPartyId =
          user?.role === "customer"
            ? conv.participants.riderId
            : conv.participants.customerId;
        if (otherPartyId) {
          try {
            const presence = await getUserPresence(otherPartyId);
            return { userId: otherPartyId, presence };
          } catch (error) {
            return null;
          }
        }
        return null;
      });

      const presenceResults = await Promise.all(presencePromises);
      const presencesMap: Record<string, UserPresence> = {};
      presenceResults.forEach((result) => {
        if (result) {
          presencesMap[result.userId] = result.presence;
        }
      });
      setPresences(presencesMap);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load conversations",
        text2: error?.message || "Please try again",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkOnlineAdmins = async () => {
    if (!isAuthenticated) return;
    setCheckingAdmins(true);
    try {
      const data = await getOnlineAdmins();
      setHasOnlineAdmins(data.hasOnlineAdmins);
    } catch (error) {
      console.error("Error checking online admins:", error);
      setHasOnlineAdmins(false);
    } finally {
      setCheckingAdmins(false);
    }
  };

  const handleOpenSupportChat = () => {
    setSupportChatOpen(true);
    checkOnlineAdmins();
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
      setupSocketListeners();
      checkOnlineAdmins();
      const interval = setInterval(checkOnlineAdmins, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(chatbotAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(chatbotAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        const interval = setInterval(() => {
          Animated.sequence([
            Animated.timing(chatbotAnimation, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(chatbotAnimation, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();
        }, 3000);
        return () => clearInterval(interval);
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const setupSocketListeners = () => {
    const socket = socketClient.socketInstance;
    if (!socket) return;

    // Listen for new messages to update conversations
    socket.on(SocketEvents.CHAT_MESSAGE, (data: any) => {
      const message = data?.message || data;
      if (message && message.orderId) {
        loadConversations();
      }
    });

    // Listen for read receipts
    socket.on(SocketEvents.CHAT_MESSAGE_READ, (data: any) => {
      if (data?.orderId) {
        loadConversations();
      }
    });

    // Listen for online status updates
    socket.on(SocketEvents.USER_ONLINE, (data: any) => {
      if (data?.userId) {
        setPresences((prev) => ({
          ...prev,
          [data.userId]: {
            userId: data.userId,
            online: true,
            lastSeen: new Date(),
          },
        }));
      }
    });

    socket.on(SocketEvents.USER_OFFLINE, (data: any) => {
      if (data?.userId) {
        setPresences((prev) => ({
          ...prev,
          [data.userId]: {
            userId: data.userId,
            online: false,
            lastSeen: new Date(data.timestamp || Date.now()),
          },
        }));
      }
    });
  };

  const handleDelete = async (conversation: ChatConversation) => {
    Alert.alert(
      "Delete Conversation",
      "This conversation will be deleted. Admin can still view it for dispute resolution.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteConversation(conversation.orderId);
              Toast.show({
                type: "success",
                text1: "Deleted",
                text2: "Conversation has been deleted",
              });
              loadConversations();
            } catch (error: any) {
              Toast.show({
                type: "error",
                text1: "Failed to delete",
                text2: error?.message || "Please try again",
              });
            }
          },
        },
      ]
    );
  };

  const handleArchive = async (conversation: ChatConversation) => {
    try {
      await archiveConversation(conversation.orderId, true);
      Toast.show({
        type: "success",
        text1: "Archived",
        text2: "Conversation moved to archive",
      });
      loadConversations();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to archive",
        text2: error?.message || "Please try again",
      });
    }
  };

  const handleUnarchive = async (conversation: ChatConversation) => {
    try {
      await archiveConversation(conversation.orderId, false);
      Toast.show({
        type: "success",
        text1: "Unarchived",
        text2: "Conversation moved back to chats",
      });
      loadConversations();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to unarchive",
        text2: error?.message || "Please try again",
      });
    }
  };

  const renderLeftActions = (
    conversation: ChatConversation,
    progress: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
    });

    if (conversation.orderStatus === "delivered" || user?.role !== "rider") {
      return null;
    }

    return (
      <TouchableOpacity
        onPress={async () => {
          try {
            await updateOrderStatus(conversation.orderId, "deliver");
            Toast.show({
              type: "success",
              text1: "Order marked as delivered",
              text2: "The order has been marked as delivered",
            });
            loadConversations();
          } catch (error: any) {
            Toast.show({
              type: "error",
              text1: "Failed",
              text2: error?.message || "Please try again",
            });
          }
        }}
        className="bg-success items-center justify-center"
        style={{ width: 100, paddingHorizontal: 20 }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Icons.status
            name={IconNames.checkmarkCircle as any}
            size={28}
            color="#FFFFFF"
          />
        </Animated.View>
        <Text className="text-white text-xs font-semibold mt-1 text-center">
          Delivered
        </Text>
      </TouchableOpacity>
    );
  };

  const renderRightActions = (
    conversation: ChatConversation,
    progress: Animated.AnimatedInterpolation<number>,
    isArchived: boolean
  ) => {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
    });

    return (
      <View className="flex-row items-center" style={{ width: 160 }}>
        {!isArchived && (
          <TouchableOpacity
            onPress={() => handleArchive(conversation)}
            className="flex-1 bg-info items-center justify-center h-full"
            style={{ paddingHorizontal: 20 }}
          >
            <Animated.View style={{ transform: [{ scale }] }}>
              <Icons.package
                name={IconNames.boxOutline as any}
                size={24}
                color="#FFFFFF"
              />
            </Animated.View>
            <Text className="text-white text-xs font-semibold mt-1">
              Archive
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => handleDelete(conversation)}
          className="flex-1 bg-danger items-center justify-center h-full"
          style={{ paddingHorizontal: 20 }}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Icons.action
              name={IconNames.deleteOutline as any}
              size={24}
              color="#FFFFFF"
            />
          </Animated.View>
          <Text className="text-white text-xs font-semibold mt-1">Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderConversationItem = (
    conversation: ChatConversation,
    isArchived: boolean = false
  ) => {
    const hasUnread = conversation.unreadCount > 0;
    const lastMessage = conversation.lastMessage;
    const otherPartyId =
      user?.role === "customer"
        ? conversation.participants.riderId
        : conversation.participants.customerId;
    const otherPartyName =
      conversation.otherPartyName ||
      (user?.role === "customer" ? "Rider" : "Customer");
    const otherPartyPresence = otherPartyId ? presences[otherPartyId] : null;

    return (
      <Swipeable
        key={conversation._id || conversation.orderId}
        renderLeftActions={(progress) =>
          renderLeftActions(conversation, progress)
        }
        renderRightActions={(progress) =>
          renderRightActions(conversation, progress, isArchived)
        }
        overshootRight={false}
        overshootLeft={false}
      >
        <TouchableOpacity
          onPress={() => {
            setChatOrderId(conversation.orderId);
            setShowChat(true);
          }}
          className={`px-4 py-4 active:opacity-80 ${
            isDark ? "bg-secondary" : "bg-white"
          }`}
          style={{
            borderBottomWidth: 1,
            borderBottomColor: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.04)",
          }}
        >
          <View className="flex-row items-center">
            <View className="relative mr-3">
              {conversation.otherPartyProfilePicture ||
              otherPartyPresence?.profilePicture ? (
                <Image
                  source={{
                    uri: String(
                      toAbsoluteUrl(
                        String(
                          conversation.otherPartyProfilePicture ||
                            otherPartyPresence?.profilePicture
                        )
                      )
                    ),
                  }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                  }}
                  contentFit="cover"
                />
              ) : (
                <View
                  className={`w-14 h-14 rounded-full items-center justify-center ${
                    hasUnread
                      ? "bg-accent/20"
                      : isDark
                      ? "bg-dark-100"
                      : "bg-gray-100"
                  }`}
                >
                  <Icons.user
                    name={IconNames.personCircle as any}
                    size={28}
                    color={
                      hasUnread ? "#AB8BFF" : isDark ? "#9CA4AB" : "#6E6E73"
                    }
                  />
                </View>
              )}
              {/* Online Status Dot */}
              {otherPartyPresence?.online && (
                <View className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-success border-2 border-white" />
              )}
              {/* Unread Badge */}
              {hasUnread && (
                <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent items-center justify-center border-2 border-white">
                  <Text className="text-primary text-[10px] font-bold">
                    {conversation.unreadCount > 9
                      ? "9+"
                      : conversation.unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <View className="flex-1 mr-2">
              <View className="flex-row items-center justify-between mb-1">
                <Text
                  className={`font-bold text-base flex-1 ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                  numberOfLines={1}
                >
                  {otherPartyName}
                </Text>
                {lastMessage && (
                  <Text
                    className={`text-xs ml-2 ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    {formatTime(lastMessage.createdAt)}
                  </Text>
                )}
              </View>
              <View className="flex-row items-center justify-between">
                <Text
                  className={`text-sm flex-1 mr-2 ${
                    hasUnread
                      ? isDark
                        ? "text-light-200 font-semibold"
                        : "text-black font-semibold"
                      : isDark
                      ? "text-light-400"
                      : "text-gray-500"
                  }`}
                  numberOfLines={1}
                >
                  {lastMessage?.message || "No messages yet"}
                </Text>
              </View>
              <View className="flex-row items-center mt-1">
                <Text
                  className={`text-xs ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Order #{conversation.orderId.slice(-6).toUpperCase()}
                </Text>
                {conversation.orderStatus && (
                  <>
                    <View
                      className={`mx-2 w-1 h-1 rounded-full ${
                        isDark ? "bg-light-400" : "bg-gray-400"
                      }`}
                    />
                    <Text
                      className={`text-xs capitalize ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
                      {conversation.orderStatus}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const currentConversations =
    activeTab === "chats" ? conversations : archivedConversations;

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return currentConversations;
    }

    const query = searchQuery.toLowerCase().trim();
    return currentConversations.filter((conv) => {
      const otherPartyName = user?.role === "customer" ? "Rider" : "Customer";
      if (otherPartyName.toLowerCase().includes(query)) {
        return true;
      }

      const orderId = conv.orderId.slice(-6).toUpperCase();
      if (orderId.includes(query.toUpperCase())) {
        return true;
      }

      if (conv.lastMessage?.message?.toLowerCase().includes(query)) {
        return true;
      }

      // Search by order status
      if (conv.orderStatus?.toLowerCase().includes(query)) {
        return true;
      }

      return false;
    });
  }, [currentConversations, searchQuery, user?.role]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}>
        {/* Header */}
        <View
          className={`px-6 pt-4 pb-3 ${isDark ? "bg-secondary" : "bg-white"}`}
          style={{
            paddingTop: insets.top + 12,
            borderBottomWidth: 1,
            borderBottomColor: isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.06)",
          }}
        >
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-1">
              <Text
                className={`text-2xl font-bold mb-0.5 ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Messages
              </Text>
              <Text
                className={`text-xs ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                {conversations.length}{" "}
                {conversations.length === 1 ? "conversation" : "conversations"}
              </Text>
            </View>
          </View>

          {/* Customer Care Support Chat */}
          <TouchableOpacity
            onPress={handleOpenSupportChat}
            className={`rounded-2xl flex-row items-center ${
              isDark ? "bg-secondary" : "bg-white"
            }`}
            style={{
              padding: 20,
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.06)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View className="relative" style={{ marginRight: 16 }}>
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: chatbotAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.15],
                      }),
                    },
                  ],
                }}
              >
                <RobotIcon size={40} color="#30D158" helpBubble={true} />
              </Animated.View>
            </View>
            <View className="flex-1">
              <Text
                className={`font-bold text-base mb-1 ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Customer Care Support
              </Text>
              <View className="flex-row items-center">
                {checkingAdmins ? (
                  <ActivityIndicator
                    size="small"
                    color={isDark ? "#9CA4AB" : "#6E6E73"}
                    style={{ marginRight: 6 }}
                  />
                ) : hasOnlineAdmins ? (
                  <View className="w-2 h-2 rounded-full bg-success mr-2" />
                ) : null}
                <Text
                  className={`text-sm leading-5 ${
                    isDark ? "text-light-400" : "text-gray-600"
                  }`}
                >
                  {checkingAdmins
                    ? "Checking availability..."
                    : hasOnlineAdmins
                    ? "Online - Get help with your orders and account"
                    : "Get help with your orders and account"}
                </Text>
              </View>
            </View>
            <Icons.navigation
              name={IconNames.arrowForward as any}
              size={20}
              color={isDark ? "#9CA4AB" : "#6E6E73"}
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        {currentConversations.length > 0 && (
          <View
            className={`px-6 py-3 ${isDark ? "bg-secondary" : "bg-white"}`}
            style={{
              borderBottomWidth: 1,
              borderBottomColor: isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.06)",
            }}
          >
            <View
              className={`flex-row items-center rounded-xl px-4 py-3 ${
                isDark ? "bg-dark-100" : "bg-gray-100"
              }`}
            >
              <Icons.action
                name={IconNames.searchOutline as any}
                size={20}
                color={isDark ? "#9CA4AB" : "#6E6E73"}
                style={{ marginRight: 10 }}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search conversations..."
                placeholderTextColor={isDark ? "#9CA4AB" : "#6E6E73"}
                className={`flex-1 text-base ${
                  isDark ? "text-light-100" : "text-black"
                }`}
                style={{ padding: 0 }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  className="ml-2"
                >
                  <Icons.action
                    name={IconNames.closeCircle as any}
                    size={20}
                    color={isDark ? "#9CA4AB" : "#6E6E73"}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Tabs */}
        <View
          className={`flex-row ${isDark ? "bg-secondary" : "bg-white"}`}
          style={{
            borderBottomWidth: 1,
            borderBottomColor: isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.06)",
          }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab("chats")}
            className={`flex-1 py-4 items-center border-b-2 ${
              activeTab === "chats"
                ? "border-accent"
                : isDark
                ? "border-transparent"
                : "border-transparent"
            }`}
          >
            <Text
              className={`font-bold text-base ${
                activeTab === "chats"
                  ? "text-accent"
                  : isDark
                  ? "text-light-400"
                  : "text-gray-500"
              }`}
            >
              Chats
            </Text>
            {conversations.length > 0 && (
              <View className="bg-accent/20 rounded-full px-2 py-0.5 mt-1">
                <Text className="text-accent text-[10px] font-bold">
                  {conversations.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("archived")}
            className={`flex-1 py-4 items-center border-b-2 ${
              activeTab === "archived"
                ? "border-accent"
                : isDark
                ? "border-transparent"
                : "border-transparent"
            }`}
          >
            <Text
              className={`font-bold text-base ${
                activeTab === "archived"
                  ? "text-accent"
                  : isDark
                  ? "text-light-400"
                  : "text-gray-500"
              }`}
            >
              Archived
            </Text>
            {archivedConversations.length > 0 && (
              <View className="bg-accent/20 rounded-full px-2 py-0.5 mt-1">
                <Text className="text-accent text-[10px] font-bold">
                  {archivedConversations.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingBottom: tabBarPadding,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadConversations(true)}
              tintColor="#AB8BFF"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading && !refreshing ? (
            <View className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color="#AB8BFF" />
              <Text
                className={`mt-4 text-sm ${
                  isDark ? "text-light-300" : "text-gray-600"
                }`}
              >
                Loading conversations...
              </Text>
            </View>
          ) : filteredConversations.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6 py-20">
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: chatbotAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.1],
                      }),
                    },
                  ],
                }}
              >
                <View
                  className={`rounded-full p-8 mb-6 ${
                    isDark ? "bg-accent/10" : "bg-accent/5"
                  }`}
                >
                  <Icons.communication
                    name={IconNames.chatbubbleOutline as any}
                    size={64}
                    color={isDark ? "#AB8BFF" : "#6E6E73"}
                  />
                </View>
              </Animated.View>
              <Text
                className={`text-2xl font-bold mb-3 text-center ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                {searchQuery.trim()
                  ? "No conversations found"
                  : activeTab === "archived"
                  ? "No archived chats"
                  : "No conversations yet"}
              </Text>
              <Text
                className={`text-sm text-center mb-8 leading-6 max-w-xs ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                {searchQuery.trim()
                  ? `No conversations match "${searchQuery}". Try searching by name, order ID, or message content.`
                  : activeTab === "archived"
                  ? "Archived conversations will appear here. Swipe left on any chat to archive it."
                  : "Start a conversation by opening an order and tapping the chat button. You'll see conversations here once you've exchanged messages."}
              </Text>
              {activeTab === "chats" && (
                <TouchableOpacity
                  onPress={() => {
                    if (user?.role === "customer") {
                      router.push(Routes.tabs.orders as any);
                    } else {
                      router.push(Routes.tabs.deliveries as any);
                    }
                  }}
                  className="bg-accent rounded-2xl px-8 py-4 flex-row items-center"
                  style={{
                    shadowColor: "#AB8BFF",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <Icons.package
                    name={IconNames.boxOutline as any}
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-white font-bold text-base">
                    View {user?.role === "customer" ? "Orders" : "Deliveries"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View>
              {filteredConversations.map((conversation) =>
                renderConversationItem(conversation, activeTab === "archived")
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Chat Modal */}
      {chatOrderId && (
        <OrderChat
          orderId={chatOrderId}
          visible={showChat}
          onClose={() => {
            setShowChat(false);
            setChatOrderId(null);
            loadConversations();
          }}
        />
      )}

      {/* Support Chat Modal */}
      <SupportChat
        visible={supportChatOpen}
        onClose={() => setSupportChatOpen(false)}
      />
    </GestureHandlerRootView>
  );
}
