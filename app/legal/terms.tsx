import { IconNames, Icons } from "@/constants/icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useTabBarPadding } from "@/hooks/useTabBarPadding";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TermsConditionsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { tabBarPadding } = useTabBarPadding();
  const isDark = theme === "dark";

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
      {/* Header */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/profile");
            }
          }}
          className={`w-11 h-11 rounded-full border items-center justify-center mr-4 ${
            isDark
              ? "bg-secondary border-neutral-100"
              : "bg-white border-gray-200"
          }`}
        >
          <Icons.navigation
            name={IconNames.arrowBack as any}
            size={20}
            color={isDark ? "#9CA4AB" : "#6E6E73"}
          />
        </TouchableOpacity>
        <View className="flex-1">
          <Text
            className={`text-2xl font-bold ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            Terms & Conditions
          </Text>
          <Text
            className={`text-sm mt-1 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View
        className={`rounded-3xl p-6 border mb-4 ${
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
        <Text
          className={`text-base leading-7 mb-6 ${
            isDark ? "text-light-100" : "text-black"
          }`}
        >
          Welcome to 9thWaka. By accessing or using our delivery service
          application, you agree to be bound by these Terms and Conditions.
          Please read them carefully before using our services.
        </Text>

        <View className="mb-6">
          <Text
            className={`text-lg font-bold mb-3 ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            1. Acceptance of Terms
          </Text>
          <Text
            className={`text-sm leading-6 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            By creating an account, placing an order, or using any of our
            services, you acknowledge that you have read, understood, and agree
            to be bound by these Terms and Conditions. If you do not agree,
            please do not use our services.
          </Text>
        </View>

        <View className="mb-6">
          <Text
            className={`text-lg font-bold mb-3 ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            2. Service Description
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            9thWaka is a delivery service platform that connects customers with
            delivery riders. We facilitate the delivery of items within Lagos,
            Nigeria, operating daily until 10:00 PM.
          </Text>
        </View>

        <View className="mb-6">
          <Text
            className={`text-lg font-bold mb-3 ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            3. User Accounts
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            To use our services, you must:
          </Text>
          <View className="ml-4 mb-2">
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Be at least 18 years old
            </Text>
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Provide accurate and complete information
            </Text>
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Maintain the security of your account
            </Text>
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • For riders: Complete KYC verification (NIN, BVN, driver's
              license)
            </Text>
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Notify us immediately of any unauthorized access
            </Text>
          </View>
        </View>

        <View className="mb-6">
          <Text
            className={`text-lg font-bold mb-3 ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            4. Orders and Payments
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • Delivery prices are calculated based on distance, vehicle type,
            and time of day
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • Prices are displayed before order confirmation
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • Payment is required at the time of order placement
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • Additional charges may apply based on your bank or payment
            provider's transaction fees. These charges are determined by your
            financial institution and are separate from our delivery fees
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • Refunds are processed according to our refund policy
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • We reserve the right to adjust prices due to distance, traffic, or
            special circumstances
          </Text>
        </View>

        <View className="mb-6">
          <Text
            className={`text-lg font-bold mb-3 ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            5. Delivery Service
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • We strive to provide accurate delivery time estimates, but actual
            delivery times may vary
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • Customers must ensure accurate pickup and dropoff addresses
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • Riders must verify delivery using OTP or delivery proof
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • We are not responsible for items damaged due to improper packaging
            by the customer
          </Text>
        </View>

        <View className="mb-6">
          <Text
            className={`text-lg font-bold mb-3 ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            6. Cancellation Policy
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • Customers may cancel orders before pickup without penalty
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • Cancellations after pickup may incur charges
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • Riders may not cancel assigned orders without valid reason
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • Repeated cancellations may result in account restrictions
          </Text>
        </View>

        <View className="mb-6">
          <Text
            className={`text-lg font-bold mb-3 ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            7. Prohibited Items
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            The following items are prohibited from delivery:
          </Text>
          <View className="ml-4 mb-2">
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Illegal substances or contraband
            </Text>
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Hazardous materials
            </Text>
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Firearms or weapons
            </Text>
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Perishable items requiring special handling (unless agreed)
            </Text>
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Items exceeding size/weight limits
            </Text>
          </View>
        </View>

        <View className="mb-6">
          <Text
            className={`text-lg font-bold mb-3 ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            8. Rider Responsibilities
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            Riders must:
          </Text>
          <View className="ml-4 mb-2">
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Maintain valid licenses and vehicle registration
            </Text>
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Follow traffic laws and safety regulations
            </Text>
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Handle items with care and deliver promptly
            </Text>
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Verify delivery using required methods (OTP/proof)
            </Text>
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Maintain professional conduct with customers
            </Text>
          </View>
        </View>

        <View className="mb-6">
          <Text
            className={`text-lg font-bold mb-3 ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            9. Limitation of Liability
          </Text>
          <Text
            className={`text-sm leading-6 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            9thWaka acts as an intermediary platform. We are not responsible for
            the actions of riders or customers, lost or damaged items (unless
            due to our negligence), delays caused by traffic or weather, or any
            indirect or consequential damages. Our liability is limited to the
            value of the delivery fee paid.
          </Text>
        </View>

        <View className="mb-6">
          <Text
            className={`text-lg font-bold mb-3 ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            10. Dispute Resolution
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • Contact our support team first to resolve any disputes
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • We will investigate and attempt to resolve issues fairly
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            • Unresolved disputes may be subject to Nigerian law and
            jurisdiction
          </Text>
        </View>

        <View className="mb-6">
          <Text
            className={`text-lg font-bold mb-3 ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            11. Account Termination
          </Text>
          <Text
            className={`text-sm leading-6 mb-2 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            We reserve the right to suspend or terminate accounts that:
          </Text>
          <View className="ml-4 mb-2">
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Violate these Terms and Conditions
            </Text>
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Engage in fraudulent or illegal activity
            </Text>
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Repeatedly cancel orders or fail to complete deliveries
            </Text>
            <Text
              className={`text-sm leading-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              • Harass or abuse other users
            </Text>
          </View>
        </View>

        <View className="mb-6">
          <Text
            className={`text-lg font-bold mb-3 ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            12. Changes to Terms
          </Text>
          <Text
            className={`text-sm leading-6 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            We may modify these Terms and Conditions at any time. Continued use
            of our services after changes constitutes acceptance of the new
            terms. We will notify users of significant changes.
          </Text>
        </View>

        <View className="mb-6">
          <Text
            className={`text-lg font-bold mb-3 ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            13. Contact Information
          </Text>
          <Text
            className={`text-sm leading-6 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            For questions about these Terms and Conditions, please contact us
            through the app's support section or via WhatsApp.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
