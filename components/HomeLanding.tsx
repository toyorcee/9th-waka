import NotificationBell from "@/components/NotificationBell";
import { IconNames, Icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useAuth } from "@/contexts/AuthContext";
import { navigationHelper, Routes } from "@/services/navigationHelper";
import { toAbsoluteUrl } from "@/services/url";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeLanding() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const TAB_BAR_HEIGHT = 65;
  const TAB_BAR_MARGIN = 16;
  const bottomPad = TAB_BAR_HEIGHT + TAB_BAR_MARGIN + insets.bottom;

  useEffect(() => {}, [isAuthenticated, isLoading]);

  const handleAction = async (actionType: "request" | "track" | "sos") => {
    if (!isAuthenticated) {
      await navigationHelper.setPendingAction(actionType);
      router.push(Routes.standalone.auth);
    } else {
      if (actionType === "request") router.push(Routes.standalone.newOrder);
      else if (actionType === "track") router.push(Routes.tabs.track);
      else if (actionType === "sos") router.push(Routes.standalone.sos);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-primary"
      contentContainerStyle={{ paddingBottom: bottomPad, flexGrow: 1 }}
    >
      <View className="flex-1">
        <View className="pt-20 px-6 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Image
                source={images.logo}
                style={{ width: 60, height: 60 }}
                contentFit="contain"
                className="mb-2"
              />
              <Text className="text-light-200 text-lg">
                Night Delivery • Safe • Fast
              </Text>
            </View>
            {isAuthenticated ? (
              <View className="flex-row items-center ml-2">
                <NotificationBell />
                <TouchableOpacity
                  onPress={() => router.push(Routes.tabs.profile)}
                  className="ml-2"
                >
                  {user?.profilePicture ? (
                    <Image
                      source={{ uri: String(toAbsoluteUrl(String(user.profilePicture))) }}
                      style={{ width: 32, height: 32, borderRadius: 16 }}
                      contentFit="cover"
                    />
                  ) : (
                    <Icons.user
                      name={IconNames.personCircle as any}
                      size={32}
                      color="#FFFFFF"
                    />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => router.push(Routes.standalone.auth)}
                className="ml-4"
              >
                <Icons.user
                  name={IconNames.personOutline as any}
                  size={32}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="mx-6 mb-6 bg-secondary rounded-2xl p-5 border border-neutral-100">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-light-100 text-lg font-semibold">
              Service Status
            </Text>
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full bg-active mr-2" />
              <Text className="text-active font-medium">Active</Text>
            </View>
          </View>
          <Text className="text-light-300 text-sm">
            Operating: 5:00 PM - 10:00 PM
          </Text>
        </View>

        <View className="mx-6 mb-6">
          <Text className="text-light-200 text-base font-semibold mb-4">
            Quick Actions
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <TouchableOpacity
              onPress={() => handleAction("request")}
              className="bg-accent px-6 py-4 rounded-xl flex-1 min-w-[45%]"
            >
              <Text className="text-primary font-bold text-center text-base">
                Request Delivery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAction("track")}
              className="bg-accentWarm px-6 py-4 rounded-xl flex-1 min-w-[45%]"
            >
              <Text className="text-primary font-bold text-center text-base">
                Track Order
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mx-6 mb-6">
          <TouchableOpacity
            onPress={() => handleAction("sos")}
            className="bg-danger rounded-xl p-5 flex-row items-center justify-center shadow-lg"
          >
            <Text className="text-light-100 font-bold text-lg mr-2">🆘</Text>
            <Text className="text-light-100 font-bold text-lg">
              Emergency SOS
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mx-6 mb-6">
          <Text className="text-light-200 text-base font-semibold mb-4">
            Features
          </Text>
          <View className="gap-3">
            <View className="bg-dark-100 rounded-xl p-4 border border-neutral-100">
              <Text className="text-accent font-semibold text-base mb-1">
                AI Safe Routes
              </Text>
              <Text className="text-light-300 text-sm">
                Intelligent routing for maximum safety
              </Text>
            </View>
            <View className="bg-dark-200 rounded-xl p-4 border border-neutral-100">
              <Text className="text-info font-semibold text-base mb-1">
                Real-Time Tracking
              </Text>
              <Text className="text-light-300 text-sm">
                Follow your delivery live on the map
              </Text>
            </View>
            <View className="bg-dark-300 rounded-xl p-4 border border-neutral-100">
              <Text className="text-success font-semibold text-base mb-1">
                Night Assurance
              </Text>
              <Text className="text-light-300 text-sm">
                Verified riders, secure deliveries
              </Text>
            </View>
          </View>
        </View>

        {/* CTA for guests */}
        {!isAuthenticated && (
          <View className="mx-6 mt-6 mb-4">
            <TouchableOpacity
              onPress={async () => {
                await navigationHelper.setPendingAction("request");
                router.push(Routes.standalone.auth);
              }}
              className="bg-accent rounded-xl py-4 px-6 flex-row items-center justify-center"
            >
              <Icons.action
                name={IconNames.addCircle as any}
                size={20}
                color="#030014"
                style={{ marginRight: 8 }}
              />
              <Text className="text-primary font-bold text-base">
                Get Started - Request Your First Delivery
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="mx-6 mt-4 mb-4">
          <Text className="text-light-400 text-xs text-center">
            Operating in Lagos, Nigeria • Night hours only
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
