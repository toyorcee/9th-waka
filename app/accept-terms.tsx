import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Routes } from "@/services/navigationHelper";
import { acceptTerms } from "@/services/userApi";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function AcceptTermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const scrollViewRef = useRef<ScrollView>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 50;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    if (!isAccepted) {
      Toast.show({
        type: "error",
        text1: "Acceptance Required",
        text2: "Please check the box to accept the terms",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await acceptTerms();

      // Update user context with the updated user data from the response
      if (response.user) {
        updateUser({
          termsAccepted: response.user.termsAccepted ?? true,
        });
      }

      Toast.show({
        type: "success",
        text1: "Terms Accepted",
        text2: "Welcome to 9thWaka!",
      });

      // Redirect based on user role
      // Use response.user.role if available, otherwise fall back to current user.role
      const userRole = response.user?.role || user?.role;
      if (userRole === "rider") {
        router.replace("/kyc-wizard");
      } else {
        router.replace(
          `${Routes.standalone.profileEdit}?email=${encodeURIComponent(
            response.user?.email || user?.email || ""
          )}`
        );
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to accept terms";
      Toast.show({
        type: "error",
        text1: "Error",
        text2: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}>
      {/* Header */}
      <View
        className={`border-b ${
          isDark
            ? "bg-secondary border-neutral-100"
            : "bg-white border-gray-200"
        }`}
        style={{ paddingTop: insets.top + 10, paddingBottom: 20 }}
      >
        <View className="px-6">
          <View className="items-center mb-4">
            <View className="bg-accent/20 rounded-full p-4 mb-3">
              <Icons.info
                name={IconNames.informationOutline as any}
                size={32}
                color="#AB8BFF"
              />
            </View>
            <Text
              className={`text-2xl font-bold text-center mb-2 ${
                isDark ? "text-light-100" : "text-black"
              }`}
            >
              Terms & Conditions
            </Text>
            <Text
              className={`text-sm text-center ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              Please read and accept our terms to continue
            </Text>
          </View>
        </View>
      </View>

      {/* Scrollable Terms Content */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 120,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={true}
      >
        <View
          className={`rounded-3xl p-6 border mb-4 ${
            isDark
              ? "bg-secondary border-neutral-100"
              : "bg-white border-gray-200"
          }`}
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
              services, you acknowledge that you have read, understood, and
              agree to be bound by these Terms and Conditions. If you do not
              agree, please do not use our services.
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
              9thWaka is a delivery service platform that connects customers
              with delivery riders. We facilitate the delivery of items within
              Lagos, Nigeria, operating daily until 10:00 PM.
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
              • We reserve the right to adjust prices due to distance, traffic,
              or special circumstances
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
              • We strive to provide accurate delivery time estimates, but
              actual delivery times may vary
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
              • We are not responsible for items damaged due to improper
              packaging by the customer
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
              9thWaka acts as an intermediary platform. We are not responsible
              for the actions of riders or customers, lost or damaged items
              (unless due to our negligence), delays caused by traffic or
              weather, or any indirect or consequential damages. Our liability
              is limited to the value of the delivery fee paid.
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
              We may modify these Terms and Conditions at any time. Continued
              use of our services after changes constitutes acceptance of the
              new terms. We will notify users of significant changes.
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

          {/* Privacy Policy Link */}
          <View className="mt-4 pt-4 border-t border-neutral-100">
            <TouchableOpacity
              onPress={() => router.push("/legal/privacy" as any)}
              className="flex-row items-center justify-center py-3"
            >
              <Icons.info
                name={IconNames.informationOutline as any}
                size={18}
                color="#5AC8FA"
                style={{ marginRight: 8 }}
              />
              <Text className="text-info text-sm font-semibold">
                Read Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scroll indicator */}
        {!hasScrolledToBottom && (
          <View className="items-center py-4">
            <View className="bg-accent/20 rounded-full px-4 py-2 flex-row items-center">
              <Icons.navigation
                name={IconNames.arrowDown as any}
                size={16}
                color="#AB8BFF"
                style={{ marginRight: 6 }}
              />
              <Text className="text-accent text-xs font-semibold">
                Scroll to continue
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Section */}
      <View
        className={`border-t px-6 py-4 ${
          isDark
            ? "bg-secondary border-neutral-100"
            : "bg-white border-gray-200"
        }`}
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        {/* Checkbox */}
        <TouchableOpacity
          onPress={() => {
            if (hasScrolledToBottom) {
              setIsAccepted(!isAccepted);
            } else {
              Toast.show({
                type: "info",
                text1: "Please Scroll",
                text2: "Scroll to the bottom to enable acceptance",
              });
            }
          }}
          disabled={!hasScrolledToBottom}
          className={`flex-row items-center mb-4 ${
            !hasScrolledToBottom ? "opacity-50" : ""
          }`}
        >
          <View
            className={`w-6 h-6 rounded-lg border-2 items-center justify-center mr-3 ${
              isAccepted
                ? "bg-accent border-accent"
                : isDark
                ? "border-neutral-300 bg-transparent"
                : "border-gray-300 bg-transparent"
            }`}
          >
            {isAccepted && (
              <Icons.action
                name={IconNames.checkmark as any}
                size={16}
                color="#030014"
              />
            )}
          </View>
          <View className="flex-1">
            <Text
              className={`text-sm ${
                hasScrolledToBottom
                  ? isDark
                    ? "text-light-100"
                    : "text-black"
                  : isDark
                  ? "text-light-400"
                  : "text-gray-500"
              }`}
            >
              I have read and agree to the{" "}
              <Text className="text-accent font-bold">Terms & Conditions</Text>
            </Text>
            {!hasScrolledToBottom && (
              <Text
                className={`text-xs mt-1 ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                Scroll to the bottom to enable
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Accept Button */}
        <TouchableOpacity
          onPress={handleAccept}
          disabled={!isAccepted || isSubmitting}
          className={`bg-accent rounded-2xl py-4 items-center flex-row justify-center ${
            !isAccepted || isSubmitting ? "opacity-60" : ""
          }`}
          style={{
            shadowColor: "#AB8BFF",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          {isSubmitting ? (
            <>
              <ActivityIndicator color="#030014" size="small" />
              <Text className="text-primary font-bold text-base ml-2">
                Processing...
              </Text>
            </>
          ) : (
            <Text className="text-primary font-bold text-base">
              Accept & Continue
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
