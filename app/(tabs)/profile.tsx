import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Routes } from "@/services/navigationHelper";
import { toAbsoluteUrl } from "@/services/url";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { user, isLoading, logout } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showLogout, setShowLogout] = React.useState(false);
  const tabBarHeight = 65;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 20;
  const contentBottomPadding = tabBarHeight + bottomPadding + 32;
  const isDark = theme === "dark";

  const handleLogout = async () => {
    setShowLogout(true);
  };

  if (isLoading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-primary" : "bg-white"
        }`}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? "#AB8BFF" : "#1E3A8A"}
        />
      </View>
    );
  }

  return (
    <ScrollView
      className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: tabBarHeight + insets.bottom + 40,
        paddingHorizontal: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View>
        {/* Profile Header Card - Enhanced */}
        <View
          className={`rounded-3xl p-6 mb-6 border ${
            isDark
              ? "bg-secondary border-neutral-100"
              : "bg-white border-gray-200"
          }`}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.15 : 0.08,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <View className="items-center mb-5">
            <View
              className={`w-28 h-28 rounded-full items-center justify-center mb-4 overflow-hidden border-4 ${
                isDark
                  ? "bg-accent/20 border-accent/30"
                  : "bg-blue-900/10 border-blue-900/40"
              }`}
              style={{
                shadowColor: isDark ? "#AB8BFF" : "#1E3A8A",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.2,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              {user?.profilePicture ? (
                <Image
                  source={{
                    uri: String(toAbsoluteUrl(String(user.profilePicture))),
                  }}
                  style={{ width: 112, height: 112, borderRadius: 56 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  className={`rounded-full p-4 ${
                    isDark ? "bg-accent/30" : "bg-blue-900/30"
                  }`}
                >
                  <Icons.user
                    name={IconNames.personCircle as any}
                    size={56}
                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                  />
                </View>
              )}
            </View>
            <View className="w-full px-2 mb-1">
              <Text
                className={`text-xl font-bold text-center ${
                  isDark ? "text-light-100" : "text-black"
                }`}
                numberOfLines={2}
                ellipsizeMode="tail"
                style={{
                  maxWidth: "100%",
                  lineHeight: 28,
                }}
              >
                {user?.fullName || "User"}
              </Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Icons.communication
                name={IconNames.messageOutline as any}
                size={14}
                color={isDark ? "#9CA4AB" : "#6E6E73"}
                style={{ marginRight: 6 }}
              />
              <Text
                className={`text-sm ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                {user?.email}
              </Text>
            </View>
            {user?.role && (
              <View
                className={`border px-4 py-2 rounded-full ${
                  isDark
                    ? "bg-accent/20 border-accent/30"
                    : "bg-blue-900/10 border-blue-900/40"
                }`}
              >
                <View className="flex-row items-center">
                  <Icons.user
                    name={IconNames.personOutline as any}
                    size={14}
                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className={`text-xs font-bold uppercase ${
                      isDark ? "text-accent" : "text-blue-900"
                    }`}
                  >
                    {user.role}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => router.push(Routes.standalone.profileEdit)}
            className={`rounded-2xl py-4 px-5 items-center flex-row justify-center ${
              isDark ? "bg-accent" : "bg-blue-900"
            }`}
            style={{
              shadowColor: isDark ? "#AB8BFF" : "#1E3A8A",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Icons.user
              name={IconNames.editOutline as any}
              size={18}
              color={isDark ? "#030014" : "#FFFFFF"}
              style={{ marginRight: 8 }}
            />
            <Text
              className={`font-bold text-base ${
                isDark ? "text-primary" : "text-white"
              }`}
            >
              Edit Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* Menu Options - Enhanced */}
        <View className="gap-3 mb-6">
          <TouchableOpacity
            onPress={() => router.push(Routes.standalone.profileEdit)}
            className={`rounded-2xl p-5 flex-row items-center justify-between border active:opacity-80 ${
              isDark
                ? "bg-secondary border-neutral-100"
                : "bg-white border-gray-200"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center flex-1">
              <View
                className={`rounded-xl p-2.5 mr-4 ${
                  isDark ? "bg-accent/20" : "bg-blue-900/20"
                }`}
              >
                <Icons.user
                  name={IconNames.personOutline as any}
                  size={22}
                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`font-bold text-base mb-0.5 ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Edit Profile
                </Text>
                <Text
                  className={`text-xs ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Update your personal information
                </Text>
              </View>
            </View>
            <Icons.navigation
              name={IconNames.arrowForward as any}
              size={20}
              color={isDark ? "#9CA4AB" : "#6E6E73"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(Routes.standalone.profileSettings)}
            className={`rounded-2xl p-5 flex-row items-center justify-between border active:opacity-80 ${
              isDark
                ? "bg-secondary border-neutral-100"
                : "bg-white border-gray-200"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.1 : 0.05,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center flex-1">
              <View className="bg-info/20 rounded-xl p-2.5 mr-4">
                <Icons.settings
                  name={IconNames.settingsOutline as any}
                  size={22}
                  color="#5AC8FA"
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`font-bold text-base mb-0.5 ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Settings
                </Text>
                <Text
                  className={`text-xs ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  App preferences and notifications
                </Text>
              </View>
            </View>
            <Icons.navigation
              name={IconNames.arrowForward as any}
              size={20}
              color={isDark ? "#9CA4AB" : "#6E6E73"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/support" as any)}
            className={`rounded-2xl p-5 flex-row items-center justify-between border active:opacity-80 mb-3 ${
              isDark
                ? "bg-secondary border-neutral-100"
                : "bg-white border-gray-200"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.1 : 0.05,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center flex-1">
              <View className="bg-success/20 rounded-xl p-2.5 mr-4">
                <Icons.communication
                  name={IconNames.chatbubbleOutline as any}
                  size={22}
                  color="#30D158"
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`font-bold text-base mb-0.5 ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Support & FAQ
                </Text>
                <Text
                  className={`text-xs ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Get help and find answers
                </Text>
              </View>
            </View>
            <Icons.navigation
              name={IconNames.arrowForward as any}
              size={20}
              color={isDark ? "#9CA4AB" : "#6E6E73"}
            />
          </TouchableOpacity>

          {/* Legal Section */}
          <View className="mb-3">
            <Text
              className={`text-xs font-semibold mb-2 px-1 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              Legal
            </Text>
            <View className="gap-2">
              <TouchableOpacity
                onPress={() => router.push("/legal/privacy" as any)}
                className={`rounded-xl p-4 flex-row items-center justify-between border active:opacity-80 ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.05 : 0.03,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center flex-1">
                  <View className="bg-info/20 rounded-lg p-1.5 mr-3">
                    <Icons.info
                      name={IconNames.informationOutline as any}
                      size={18}
                      color="#5AC8FA"
                    />
                  </View>
                  <Text
                    className={`font-medium text-sm ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    Privacy Policy
                  </Text>
                </View>
                <Icons.navigation
                  name={IconNames.arrowForward as any}
                  size={16}
                  color={isDark ? "#9CA4AB" : "#6E6E73"}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/legal/terms" as any)}
                className={`rounded-xl p-4 flex-row items-center justify-between border active:opacity-80 ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.05 : 0.03,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center flex-1">
                  <View className="bg-info/20 rounded-lg p-1.5 mr-3">
                    <Icons.info
                      name={IconNames.informationOutline as any}
                      size={18}
                      color="#5AC8FA"
                    />
                  </View>
                  <Text
                    className={`font-medium text-sm ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    Terms & Conditions
                  </Text>
                </View>
                <Icons.navigation
                  name={IconNames.arrowForward as any}
                  size={16}
                  color={isDark ? "#9CA4AB" : "#6E6E73"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Logout Button - Enhanced */}
        <TouchableOpacity
          onPress={handleLogout}
          className="rounded-2xl p-5 items-center flex-row justify-center active:opacity-90"
          style={{
            backgroundColor: "#FF3B30",
            borderWidth: 1,
            borderColor: "#FF5757",
            shadowColor: "#FF3B30",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          <Icons.action
            name={IconNames.logoutOutline as any}
            size={22}
            color="#FFFFFF"
            style={{ marginRight: 10 }}
          />
          <Text className="text-light-100 font-bold text-base">Logout</Text>
        </TouchableOpacity>
      </View>
      {/* Logout Confirm Modal - Enhanced */}
      <Modal
        visible={showLogout}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogout(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-6">
          <View
            className={`w-full rounded-3xl p-6 border ${
              isDark
                ? "bg-secondary border-neutral-100"
                : "bg-white border-gray-200"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            <View className="items-center mb-5">
              <View className="bg-danger/20 rounded-full p-4 mb-4">
                <Icons.action
                  name={IconNames.logoutOutline as any}
                  size={32}
                  color="#FF3B30"
                />
              </View>
              <Text
                className={`text-xl font-bold mb-2 ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Logout
              </Text>
              <Text
                className={`text-sm text-center ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                Are you sure you want to logout?
              </Text>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowLogout(false)}
                className={`flex-1 rounded-2xl py-4 items-center border ${
                  isDark
                    ? "bg-dark-100 border-neutral-100"
                    : "bg-gray-100 border-gray-200"
                }`}
              >
                <Text
                  className={`font-semibold text-base ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  setShowLogout(false);
                  await logout();
                  router.replace(Routes.standalone.auth);
                }}
                className="flex-1 bg-danger rounded-2xl py-4 items-center flex-row justify-center"
                style={{
                  shadowColor: "#FF3B30",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Icons.action
                  name={IconNames.logoutOutline as any}
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text
                  className={`font-bold text-base ${
                    isDark ? "text-light-100" : "text-white"
                  }`}
                >
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
