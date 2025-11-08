import OrderChat from "@/components/OrderChat";
import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { ChatConversation, getMyConversations } from "@/services/chatApi";
import { Routes } from "@/services/navigationHelper";
import { getUserPresence, UserPresence } from "@/services/presenceApi";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function MessagesScreen() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [presences, setPresences] = useState<Record<string, UserPresence>>({});

  const tabBarHeight = 65;

  const loadConversations = async (showRefreshing = false) => {
    if (!isAuthenticated) return;
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getMyConversations();
      setConversations(data);

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

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-primary items-center justify-center px-6">
        <View className="bg-warning/20 rounded-full p-6 mb-4">
          <Icons.communication
            name={IconNames.chatbubbleOutline as any}
            size={48}
            color="#FF9500"
          />
        </View>
        <Text className="text-light-100 text-xl font-bold mb-2 text-center">
          Sign in required
        </Text>
        <Text className="text-light-400 text-sm text-center mb-6 leading-5">
          Please sign in to view your messages
        </Text>
        <TouchableOpacity
          onPress={() => router.push(Routes.standalone.auth as any)}
          className="bg-accent rounded-2xl px-8 py-4"
          style={{
            shadowColor: "#AB8BFF",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text className="text-primary font-bold text-base">Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-primary"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: tabBarHeight + insets.bottom + 40,
          paddingHorizontal: 24,
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
        <View>
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center flex-1">
              <View className="bg-accent/20 rounded-xl p-2.5 mr-3">
                <Icons.communication
                  name={IconNames.chatbubbleOutline as any}
                  size={22}
                  color="#AB8BFF"
                />
              </View>
              <View className="flex-1">
                <Text className="text-light-100 text-xl font-bold mb-0.5">
                  Messages
                </Text>
                <Text className="text-light-400 text-xs">
                  {conversations.length}{" "}
                  {conversations.length === 1
                    ? "conversation"
                    : "conversations"}
                </Text>
              </View>
            </View>
          </View>

          {/* Loading State */}
          {loading && !refreshing ? (
            <View
              className="bg-secondary rounded-3xl p-12 items-center border border-neutral-100"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <ActivityIndicator size="large" color="#AB8BFF" />
              <Text className="text-light-300 mt-4 text-sm">
                Loading conversations...
              </Text>
            </View>
          ) : conversations.length === 0 ? (
            <View
              className="bg-secondary rounded-3xl p-10 items-center border border-neutral-100"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="bg-accent/20 rounded-full p-6 mb-4">
                <Icons.communication
                  name={IconNames.chatbubbleOutline as any}
                  size={48}
                  color="#AB8BFF"
                />
              </View>
              <Text className="text-light-200 text-xl font-bold mb-2">
                No messages yet
              </Text>
              <Text className="text-light-400 text-sm text-center mb-6 leading-5">
                Start a conversation by opening an order and tapping the chat
                button
              </Text>
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
                  color="#030014"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-primary font-bold text-base">
                  View {user?.role === "customer" ? "Orders" : "Deliveries"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-3">
              {conversations.map((conversation) => {
                const hasUnread = conversation.unreadCount > 0;
                const lastMessage = conversation.lastMessage;
                const otherPartyId =
                  user?.role === "customer"
                    ? conversation.participants.riderId
                    : conversation.participants.customerId;
                const otherPartyName =
                  user?.role === "customer" ? "Rider" : "Customer";
                const otherPartyPresence = otherPartyId
                  ? presences[otherPartyId]
                  : null;

                return (
                  <TouchableOpacity
                    key={conversation._id || conversation.orderId}
                    onPress={() => {
                      setChatOrderId(conversation.orderId);
                      setShowChat(true);
                    }}
                    className="bg-secondary rounded-2xl p-5 border border-neutral-100 active:opacity-80"
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <View className="flex-row items-start">
                      <View className="relative">
                        <View
                          className={`rounded-full p-3 mr-4 ${
                            hasUnread ? "bg-accent/20" : "bg-dark-100"
                          }`}
                        >
                          <Icons.communication
                            name={IconNames.chatbubbleOutline as any}
                            size={24}
                            color={hasUnread ? "#AB8BFF" : "#9CA4AB"}
                          />
                        </View>
                        {otherPartyPresence?.online && (
                          <View className="absolute bottom-0 right-3 w-3.5 h-3.5 rounded-full bg-success border-2 border-primary" />
                        )}
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-1">
                          <View className="flex-row items-center flex-1">
                            <Text className="text-light-100 font-bold text-base">
                              {otherPartyName}
                            </Text>
                            {otherPartyPresence && (
                              <>
                                {otherPartyPresence.online ? (
                                  <View className="flex-row items-center ml-2">
                                    <View className="w-1.5 h-1.5 rounded-full bg-success mr-1" />
                                    <Text className="text-success text-[10px] font-medium">
                                      Online
                                    </Text>
                                  </View>
                                ) : null}
                              </>
                            )}
                          </View>
                          {lastMessage && (
                            <Text className="text-light-400 text-xs ml-2">
                              {formatTime(lastMessage.createdAt)}
                            </Text>
                          )}
                        </View>
                        <View className="flex-row items-center justify-between">
                          <Text
                            className="text-light-400 text-sm flex-1 mr-2"
                            numberOfLines={1}
                          >
                            {lastMessage
                              ? lastMessage.message
                              : "No messages yet"}
                          </Text>
                          {hasUnread && (
                            <View className="bg-accent rounded-full px-2.5 py-1 min-w-[24px] items-center">
                              <Text className="text-primary text-xs font-bold">
                                {conversation.unreadCount > 9
                                  ? "9+"
                                  : conversation.unreadCount}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View className="flex-row items-center mt-2">
                          <Text className="text-light-400 text-xs">
                            Order #
                            {conversation.orderId.slice(-6).toUpperCase()}
                          </Text>
                          {conversation.orderStatus && (
                            <>
                              <View className="mx-2 w-1 h-1 rounded-full bg-light-400" />
                              <Text className="text-light-400 text-xs capitalize">
                                {conversation.orderStatus}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Chat Modal */}
      {chatOrderId && (
        <OrderChat
          orderId={chatOrderId}
          visible={showChat}
          onClose={() => {
            setShowChat(false);
            setChatOrderId(null);
            loadConversations(); // Refresh conversations when chat closes
          }}
        />
      )}
    </>
  );
}
