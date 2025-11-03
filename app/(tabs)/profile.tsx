import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
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

export default function ProfileScreen() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [showLogout, setShowLogout] = React.useState(false);

  const handleLogout = async () => {
    setShowLogout(true);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-primary">
      <View className="pt-20 px-6 pb-8">
        <Text className="text-light-100 text-3xl font-bold mb-6">Profile</Text>

        {/* Profile Info */}
        <View className="bg-secondary rounded-2xl p-5 mb-6 border border-neutral-100">
          <View className="items-center mb-4">
            <View className="w-24 h-24 rounded-full bg-accent items-center justify-center mb-4 overflow-hidden">
              {user?.profilePicture ? (
                <Image
                  source={{
                    uri: String(toAbsoluteUrl(String(user.profilePicture))),
                  }}
                  style={{ width: 96, height: 96, borderRadius: 48 }}
                  contentFit="cover"
                />
              ) : (
                <Icons.user
                  name={IconNames.personCircle as any}
                  size={48}
                  color="#030014"
                />
              )}
            </View>
            <Text className="text-light-100 text-xl font-semibold">
              {user?.fullName || "User"}
            </Text>
            <Text className="text-light-400 text-sm mt-1">{user?.email}</Text>
            {user?.role && (
              <View className="mt-2 px-3 py-1 rounded-full bg-accent/20">
                <Text className="text-accent text-xs font-semibold uppercase">
                  {user.role}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => router.push(Routes.standalone.profileEdit)}
            className="bg-accent px-4 py-2 rounded-xl items-center"
          >
            <Text className="text-primary font-bold">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Options */}
        <View className="gap-3 mb-6">
          <TouchableOpacity
            onPress={() => router.push(Routes.standalone.profileEdit)}
            className="bg-secondary rounded-xl p-4 flex-row items-center justify-between border border-neutral-100"
          >
            <View className="flex-row items-center">
              <Icons.user
                name={IconNames.personOutline as any}
                size={24}
                color="#AB8BFF"
              />
              <Text className="text-light-100 font-medium ml-3">
                Edit Profile
              </Text>
            </View>
            <Icons.navigation
              name={IconNames.arrowForward as any}
              size={20}
              color="#9CA4AB"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(Routes.standalone.profileSettings)}
            className="bg-secondary rounded-xl p-4 flex-row items-center justify-between border border-neutral-100"
          >
            <View className="flex-row items-center">
              <Icons.settings
                name={IconNames.settingsOutline as any}
                size={24}
                color="#AB8BFF"
              />
              <Text className="text-light-100 font-medium ml-3">Settings</Text>
            </View>
            <Icons.navigation
              name={IconNames.arrowForward as any}
              size={20}
              color="#9CA4AB"
            />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-danger rounded-xl p-4 items-center"
        >
          <Text className="text-light-100 font-bold">Logout</Text>
        </TouchableOpacity>
      </View>
      {/* Logout Confirm Modal */}
      <Modal
        visible={showLogout}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogout(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-6">
          <View className="w-full rounded-2xl p-6 bg-primary border border-neutral-100">
            <Text className="text-light-100 text-xl font-bold mb-2">
              Logout
            </Text>
            <Text className="text-light-300 mb-5">
              Are you sure you want to logout?
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowLogout(false)}
                className="flex-1 bg-secondary rounded-xl py-3 items-center border border-neutral-100"
              >
                <Text className="text-light-100 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  setShowLogout(false);
                  await logout();
                  router.replace(Routes.standalone.auth);
                }}
                className="flex-1 bg-danger rounded-xl py-3 items-center"
              >
                <Text className="text-light-100 font-bold">Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
