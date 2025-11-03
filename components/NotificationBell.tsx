import { IconNames, Icons } from "@/constants/icons";
import { useSocket } from "@/contexts/SocketContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, clearAll } = useSocket();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="relative mr-4"
      >
        <Icons.notification
          name={IconNames.notificationsOutline as any}
          size={24}
          color="#FFFFFF"
        />
        {unreadCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-danger rounded-full w-5 h-5 items-center justify-center">
            <Text className="text-white text-xs font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
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
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-secondary rounded-t-3xl max-h-[80%]">
            {/* Header */}
            <View className="flex-row items-center justify-between p-6 border-b border-neutral-100">
              <Text className="text-light-100 text-xl font-bold">
                Notifications ({notifications.length})
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
              {notifications.length === 0 ? (
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
                  {notifications.map((notif) => (
                    <TouchableOpacity
                      key={notif.id}
                      onPress={() => {
                        markAsRead(notif.id);
                        // Handle notification tap based on type
                        if (notif.type === "order") {
                          router.push(`/orders/${notif.id}`);
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
