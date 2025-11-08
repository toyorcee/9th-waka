import { IconNames, Icons } from "@/constants/icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-primary"
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 40,
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
          className="w-11 h-11 rounded-full bg-secondary border border-neutral-100 items-center justify-center mr-4"
        >
          <Icons.navigation
            name={IconNames.arrowBack as any}
            size={20}
            color="#9CA4AB"
          />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-light-100 text-2xl font-bold">
            Privacy Policy
          </Text>
          <Text className="text-light-400 text-sm mt-1">
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
      <View className="bg-secondary rounded-3xl p-6 border border-neutral-100 mb-4">
        <Text className="text-light-100 text-base leading-7 mb-6">
          At 9thWaka, we are committed to protecting your privacy and ensuring
          the security of your personal information. This Privacy Policy
          explains how we collect, use, disclose, and safeguard your information
          when you use our delivery service application.
        </Text>

        <View className="mb-6">
          <Text className="text-light-100 text-lg font-bold mb-3">
            1. Information We Collect
          </Text>
          <Text className="text-light-400 text-sm leading-6 mb-2">
            We collect information that you provide directly to us, including:
          </Text>
          <View className="ml-4 mb-2">
            <Text className="text-light-400 text-sm leading-6">
              • Personal identification information (name, email, phone number)
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • Delivery addresses and location data
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • Payment information (processed securely through third-party
              providers)
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • For riders: NIN, BVN, driver's license, and vehicle information
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • Device information and usage data
            </Text>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-light-100 text-lg font-bold mb-3">
            2. How We Use Your Information
          </Text>
          <Text className="text-light-400 text-sm leading-6 mb-2">
            We use the information we collect to:
          </Text>
          <View className="ml-4 mb-2">
            <Text className="text-light-400 text-sm leading-6">
              • Process and fulfill your delivery orders
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • Connect you with delivery riders
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • Provide real-time tracking and updates
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • Process payments and manage your account
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • Send you important notifications about your orders
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • Improve our services and user experience
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • Comply with legal obligations and prevent fraud
            </Text>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-light-100 text-lg font-bold mb-3">
            3. Information Sharing
          </Text>
          <Text className="text-light-400 text-sm leading-6 mb-2">
            We share your information only in the following circumstances:
          </Text>
          <View className="ml-4 mb-2">
            <Text className="text-light-400 text-sm leading-6">
              • With delivery riders assigned to your orders (only necessary
              delivery information)
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • With service providers who assist in operating our platform
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • When required by law or to protect our rights
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • With your explicit consent
            </Text>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-light-100 text-lg font-bold mb-3">
            4. Data Security
          </Text>
          <Text className="text-light-400 text-sm leading-6">
            We implement industry-standard security measures to protect your
            personal information, including encryption, secure servers, and
            regular security audits. However, no method of transmission over the
            internet is 100% secure, and we cannot guarantee absolute security.
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-light-100 text-lg font-bold mb-3">
            5. Your Rights
          </Text>
          <Text className="text-light-400 text-sm leading-6 mb-2">
            You have the right to:
          </Text>
          <View className="ml-4 mb-2">
            <Text className="text-light-400 text-sm leading-6">
              • Access and update your personal information
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • Request deletion of your account and data
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • Opt-out of marketing communications
            </Text>
            <Text className="text-light-400 text-sm leading-6">
              • Withdraw consent for data processing
            </Text>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-light-100 text-lg font-bold mb-3">
            6. Location Data
          </Text>
          <Text className="text-light-400 text-sm leading-6">
            We collect location data to provide delivery services, track orders,
            and improve our services. Location data is only shared with assigned
            riders and is used solely for delivery purposes. You can control
            location permissions through your device settings.
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-light-100 text-lg font-bold mb-3">
            7. Children's Privacy
          </Text>
          <Text className="text-light-400 text-sm leading-6">
            Our services are not intended for individuals under the age of 18.
            We do not knowingly collect personal information from children. If
            you believe we have collected information from a child, please
            contact us immediately.
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-light-100 text-lg font-bold mb-3">
            8. Changes to This Policy
          </Text>
          <Text className="text-light-400 text-sm leading-6">
            We may update this Privacy Policy from time to time. We will notify
            you of any changes by posting the new policy on this page and
            updating the "Last updated" date. You are advised to review this
            policy periodically.
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-light-100 text-lg font-bold mb-3">
            9. Contact Us
          </Text>
          <Text className="text-light-400 text-sm leading-6">
            If you have any questions about this Privacy Policy or our data
            practices, please contact us through the app's support section or
            via WhatsApp.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
