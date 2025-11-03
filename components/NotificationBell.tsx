import { IconNames, Icons } from "@/constants/icons";
import { useSocket } from "@/contexts/SocketContext";
import { Routes } from "@/services/navigationHelper";
import { fetchNotifications } from "@/services/notificationService";
import useFetch from "@/services/useFetch";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, clearAll } = useSocket();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const { data, loading, refetch, error } = useFetch(
    () => fetchNotifications(0, 50),
    false
  );

  const mergedNotifications = useMemo(() => {
    const history = data?.items || [];
    // Map to normalize id field
    const normalize = (n: any) => ({
      id: String(n.id || n._id || Date.now()),
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp || n.createdAt || new Date().toISOString(),
      read: !!n.read,
    });
    const fromSocket = notifications.map(normalize);
    const fromHistory = history.map(normalize);
    const seen = new Set<string>();
    const all = [...fromSocket, ...fromHistory].filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
    return all.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [notifications, data]);

  useEffect(() => {
    if (modalVisible) {
      refetch();
    }
  }, [modalVisible, refetch]);

  const mergedUnreadCount = useMemo(
    () => mergedNotifications.filter((n) => !n.read).length,
    [mergedNotifications]
  );

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          setModalVisible(true);
          refetch();
        }}
        className="relative mr-4"
      >
        <Icons.notification
          name={IconNames.notificationsOutline as any}
          size={24}
          color="#FFFFFF"
        />
        {mergedUnreadCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-danger rounded-full w-5 h-5 items-center justify-center">
            <Text className="text-white text-xs font-bold">
              {mergedUnreadCount > 9 ? "9+" : mergedUnreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-start">
          <View
            className="bg-secondary rounded-b-3xl max-h-[80%]"
            style={{ paddingTop: insets.top + 12 }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between p-6 border-b border-neutral-100">
              <Text className="text-light-100 text-xl font-bold">
                Notifications ({mergedNotifications.length})
              </Text>
              <View className="flex-row gap-4">
                {notifications.length > 0 && (
                  <TouchableOpacity onPress={clearAll}>
                    <Text className="text-accent font-semibold">Clear All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text className="text-light-300 font-semibold">Close</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notifications List */}
            <ScrollView className="flex-1">
              {loading ? (
                <View className="p-8 items-center">
                  <Text className="text-light-300">Loading…</Text>
                </View>
              ) : mergedNotifications.length === 0 ? (
                <View className="p-8 items-center">
                  <Icons.notification
                    name={IconNames.notificationsOutline as any}
                    size={48}
                    color="#9CA4AB"
                  />
                  <Text className="text-light-400 mt-4">No notifications</Text>
                </View>
              ) : (
                <View className="p-4">
                  {mergedNotifications.map((notif) => (
                    <TouchableOpacity
                      key={notif.id}
                      onPress={async () => {
                        markAsRead(notif.id);
                        try {
                          await fetchNotifications(0, 0);
                        } catch {}
                        if (notif.type === "order") {
                          router.push(
                            Routes.standalone.orderDetail(
                              String(notif.id)
                            ) as any
                          );
                        }
                      }}
                      className={`bg-dark-100 rounded-xl p-4 mb-3 border ${
                        notif.read
                          ? "border-neutral-100/50"
                          : "border-accent/50"
                      }`}
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 mr-2">
                          <Text className="text-light-100 font-semibold mb-1">
                            {notif.title}
                          </Text>
                          <Text className="text-light-300 text-sm">
                            {notif.message}
                          </Text>
                          <Text className="text-light-400 text-xs mt-2">
                            {new Date(notif.timestamp).toLocaleString()}
                          </Text>
                        </View>
                        {!notif.read && (
                          <View className="w-2 h-2 bg-accent rounded-full mt-1" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
