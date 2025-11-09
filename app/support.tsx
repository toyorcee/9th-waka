import { IconNames, Icons } from "@/constants/icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useTabBarPadding } from "@/hooks/useTabBarPadding";
import { Routes } from "@/services/navigationHelper";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FAQ_DATA = [
  {
    id: 1,
    question: "How do I place a delivery order?",
    answer:
      "To place an order, go to the 'New Delivery' page, enter your pickup and dropoff addresses, describe the items you want to deliver, and select your preferred vehicle type (motorcycle or car). The app will show you an estimated price before you confirm.",
  },
  {
    id: 2,
    question: "How is the delivery price calculated?",
    answer:
      "Delivery prices are calculated based on distance, vehicle type, and time of day. Motorcycle deliveries are typically more affordable, while car/van deliveries cost slightly more but can handle larger items. Prices are shown before you confirm your order.",
  },
  {
    id: 3,
    question: "Can I track my delivery in real-time?",
    answer:
      "Yes! Once your order is assigned to a rider, you can track it in real-time on the 'Track' page. You'll see the rider's location and estimated delivery time. Active deliveries are automatically updated every 30 seconds.",
  },
  {
    id: 4,
    question: "What if I need to cancel my order?",
    answer:
      "You can cancel your order from the order details page, but only if it hasn't been picked up yet. Once a rider has picked up your items, cancellation is no longer possible. Cancelled orders won't affect rider earnings or system analytics.",
  },
  {
    id: 5,
    question: "How do I become a delivery rider?",
    answer:
      "To become a rider, sign up with the 'rider' role and complete the KYC (Know Your Customer) verification process. You'll need to provide your NIN, BVN, driver's license, and vehicle information. Once verified, you can start accepting delivery requests.",
  },
  {
    id: 6,
    question: "What payment methods are accepted?",
    answer:
      "Currently, payments are handled through the app's integrated payment system. You'll be charged when you place an order. For riders, earnings are processed and can be viewed in the 'Earnings' section of the app.",
  },
  {
    id: 7,
    question: "What should I do if my delivery is delayed?",
    answer:
      "If your delivery is taking longer than expected, you can contact the rider directly through the app or reach out to our customer support team via WhatsApp. We monitor all active deliveries and will assist if there are any issues.",
  },
  {
    id: 8,
    question: "Is my personal information secure?",
    answer:
      "Yes, we take your privacy seriously. All personal information is encrypted and stored securely. We only share necessary delivery information with assigned riders to complete your delivery. Your payment details are processed through secure payment gateways.",
  },
  {
    id: 9,
    question: "Can I schedule a delivery for later?",
    answer:
      "Currently, all deliveries are processed immediately after confirmation. However, you can place an order and coordinate with the rider if you need a specific delivery time. We're working on adding scheduled delivery options in future updates.",
  },
  {
    id: 10,
    question: "What areas do you serve?",
    answer:
      "We currently serve Lagos, Nigeria. Our service operates daily until 10:00 PM. We're continuously expanding our coverage area, so check back regularly for updates on new service locations.",
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { tabBarPadding } = useTabBarPadding();
  const isDark = theme === "dark";
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const whatsappNumber =
    Constants.expoConfig?.extra?.ninthwakaWhatsapp ||
    process.env.EXPO_PUBLIC_NINTHWAKA_WHATSAPP ||
    "2348108663443";

  const handleWhatsApp = async () => {
    try {
      const message = encodeURIComponent(
        "Hello! I need help with my 9thWaka delivery."
      );
      const url = `https://wa.me/${whatsappNumber}?text=${message}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Cannot open WhatsApp",
          "Please make sure WhatsApp is installed on your device.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open WhatsApp. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const toggleFAQ = (id: number) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <ScrollView
      className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: tabBarPadding,
        paddingHorizontal: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(Routes.tabs.profile);
              }
            }}
            className={`w-11 h-11 rounded-full border items-center justify-center ${
              isDark
                ? "bg-secondary border-neutral-100"
                : "bg-white border-gray-200"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.1 : 0.05,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Icons.navigation
              name={IconNames.arrowBack as any}
              size={22}
              color={isDark ? "#FFFFFF" : "#000000"}
            />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <View className="flex-row items-center">
              <View className="bg-accent/20 rounded-lg p-1.5 mr-2">
                <Icons.communication
                  name={IconNames.chatbubbleOutline as any}
                  size={18}
                  color="#AB8BFF"
                />
              </View>
              <Text
                className={`text-2xl font-bold ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Support & FAQ
              </Text>
            </View>
          </View>
          <View className="w-11" />
        </View>

        {/* Customer Care Section */}
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
            elevation: 8,
          }}
        >
          <View className="items-center mb-5">
            <View className="bg-accent/20 rounded-full p-6 mb-4">
              <Icons.communication
                name={IconNames.chatbubbleOutline as any}
                size={48}
                color="#AB8BFF"
              />
            </View>
            <Text
              className={`text-xl font-bold mb-2 text-center ${
                isDark ? "text-light-100" : "text-black"
              }`}
            >
              Need Help?
            </Text>
            <Text
              className={`text-sm text-center leading-5 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              Our customer care team is available 24/7 to assist you. Chat with
              us on WhatsApp for instant support.
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleWhatsApp}
            className="bg-accent rounded-2xl py-4 px-6 flex-row items-center justify-center"
            style={{
              shadowColor: "#AB8BFF",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Icons.communication
              name={IconNames.chatbubbleOutline as any}
              size={20}
              color="#030014"
              style={{ marginRight: 8 }}
            />
            <Text className="text-primary font-bold text-base">
              Chat on WhatsApp
            </Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View className="mb-6">
          <View className="flex-row items-center mb-4">
            <View className="bg-info/20 rounded-lg p-1.5 mr-2">
              <Icons.info
                name={IconNames.informationOutline as any}
                size={18}
                color="#5AC8FA"
              />
            </View>
            <Text
              className={`text-lg font-bold ${
                isDark ? "text-light-100" : "text-black"
              }`}
            >
              Frequently Asked Questions
            </Text>
          </View>

          <View className="gap-3">
            {FAQ_DATA.map((faq) => (
              <View
                key={faq.id}
                className={`rounded-2xl border overflow-hidden ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.1 : 0.05,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <TouchableOpacity
                  onPress={() => toggleFAQ(faq.id)}
                  className="p-5 flex-row items-center justify-between active:opacity-80"
                >
                  <View className="flex-1 mr-3">
                    <Text
                      className={`font-bold text-base mb-1 ${
                        isDark ? "text-light-100" : "text-black"
                      }`}
                    >
                      {faq.question}
                    </Text>
                  </View>
                  <View className="bg-accent/20 rounded-lg p-1.5">
                    <Icons.navigation
                      name={
                        expandedFAQ === faq.id
                          ? (IconNames.chevronUp as any)
                          : (IconNames.chevronDown as any)
                      }
                      size={18}
                      color="#AB8BFF"
                    />
                  </View>
                </TouchableOpacity>
                {expandedFAQ === faq.id && (
                  <View className="px-5 pb-5 pt-0">
                    <View
                      className={`h-px mb-4 ${
                        isDark ? "bg-neutral-100" : "bg-gray-200"
                      }`}
                    />
                    <Text
                      className={`text-sm leading-6 ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      {faq.answer}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Additional Help */}
        <View
          className={`rounded-3xl p-6 mb-6 ${
            isDark ? "bg-secondary" : "bg-white"
          }`}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.08 : 0.04,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <View className="flex-row items-start mb-4">
            <View className="bg-info/10 rounded-2xl p-3 mr-4">
              <Icons.info
                name={IconNames.informationOutline as any}
                size={24}
                color="#5AC8FA"
              />
            </View>
            <View className="flex-1 pt-0.5">
              <Text
                className={`font-bold text-lg mb-2 ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Still need help?
              </Text>
              <Text
                className={`text-sm leading-6 mb-5 ${
                  isDark ? "text-light-400" : "text-gray-600"
                }`}
              >
                If you couldn't find the answer you're looking for, don't
                hesitate to reach out to our support team via WhatsApp. We're
                here to help!
              </Text>
              <TouchableOpacity
                onPress={handleWhatsApp}
                className="bg-info rounded-2xl py-3.5 px-5 flex-row items-center justify-center"
                style={{
                  shadowColor: "#5AC8FA",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <Icons.communication
                  name={IconNames.chatbubbleOutline as any}
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-white font-bold text-sm">
                  Contact Support
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Legal & App Review Section */}
        <View className="mb-6">
          <Text
            className={`text-xs font-semibold mb-3 px-1 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            Legal & Information
          </Text>
          <View className="gap-2 mb-4">
            <TouchableOpacity
              onPress={() => router.push("/legal/privacy" as any)}
              className={`rounded-2xl p-4 flex-row items-center justify-between border active:opacity-80 ${
                isDark
                  ? "bg-secondary border-neutral-100"
                  : "bg-white border-gray-200"
              }`}
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
              className={`rounded-2xl p-4 flex-row items-center justify-between border active:opacity-80 ${
                isDark
                  ? "bg-secondary border-neutral-100"
                  : "bg-white border-gray-200"
              }`}
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

          {/* App Review Section */}
          <View
            className={`rounded-3xl p-6 ${
              isDark ? "bg-secondary" : "bg-white"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.08 : 0.04,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View className="flex-row items-start mb-4">
              <View className="bg-accent/10 rounded-2xl p-3 mr-4">
                <Icons.status
                  name={IconNames.starOutline as any}
                  size={24}
                  color="#AB8BFF"
                />
              </View>
              <View className="flex-1 pt-0.5">
                <Text
                  className={`font-bold text-lg mb-2 ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Enjoying 9thWaka?
                </Text>
                <Text
                  className={`text-sm leading-6 mb-5 ${
                    isDark ? "text-light-400" : "text-gray-600"
                  }`}
                >
                  Your feedback helps us improve! Please rate and review the app
                  on the App Store or Google Play Store.
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      // For iOS
                      if (Platform.OS === "ios") {
                        const url =
                          "https://apps.apple.com/app/id[YOUR_APP_ID]?action=write-review";
                        await Linking.openURL(url);
                      } else {
                        // For Android
                        const url = "market://details?id=com.ninthwaka.app";
                        const canOpen = await Linking.canOpenURL(url);
                        if (canOpen) {
                          await Linking.openURL(url);
                        } else {
                          // Fallback to web
                          await Linking.openURL(
                            "https://play.google.com/store/apps/details?id=com.ninthwaka.app"
                          );
                        }
                      }
                    } catch (error) {
                      Alert.alert(
                        "Error",
                        "Could not open app store. Please search for '9thWaka' in your app store."
                      );
                    }
                  }}
                  className="bg-accent rounded-2xl py-3.5 px-5 flex-row items-center justify-center"
                  style={{
                    shadowColor: "#AB8BFF",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  <Icons.status
                    name={IconNames.starOutline as any}
                    size={18}
                    color="#030014"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-primary font-bold text-sm">
                    Rate & Review
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
