import { IconNames, Icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useTheme } from "@/contexts/ThemeContext";
import { apiClient } from "@/services/apiClient";
import { Routes } from "@/services/navigationHelper";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

type ResetMethod = "email" | "phone";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const [resetMethod, setResetMethod] = useState<ResetMethod>("email");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    // Remove spaces and special characters
    const cleaned = phone.replace(/[\s\-\(\)]/g, "");
    // Check if it's a valid Nigerian phone number (10-11 digits, may start with 0 or +234)
    return /^(\+?234|0)?[0-9]{10}$/.test(cleaned);
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, "");
    // If starts with 0, replace with +234
    if (cleaned.startsWith("0")) {
      cleaned = "+234" + cleaned.substring(1);
    } else if (!cleaned.startsWith("234") && !cleaned.startsWith("+234")) {
      cleaned = "+234" + cleaned;
    } else if (cleaned.startsWith("234")) {
      cleaned = "+" + cleaned;
    }
    return cleaned;
  };

  const handleRequestReset = async () => {
    if (resetMethod === "email") {
      if (!email.trim()) {
        Toast.show({
          type: "error",
          text1: "Email required",
          text2: "Please enter your email address",
        });
        return;
      }
      if (!validateEmail(email.trim())) {
        Toast.show({
          type: "error",
          text1: "Invalid email",
          text2: "Please enter a valid email address",
        });
        return;
      }
    } else {
      if (!phoneNumber.trim()) {
        Toast.show({
          type: "error",
          text1: "Phone number required",
          text2: "Please enter your phone number",
        });
        return;
      }
      if (!validatePhone(phoneNumber.trim())) {
        Toast.show({
          type: "error",
          text1: "Invalid phone number",
          text2: "Please enter a valid Nigerian phone number",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post("/auth/forgotpassword", {
        email: resetMethod === "email" ? email.trim().toLowerCase() : undefined,
        phoneNumber:
          resetMethod === "phone"
            ? formatPhoneNumber(phoneNumber.trim())
            : undefined,
      });

      setCodeSent(true);
      Toast.show({
        type: "success",
        text1: "Reset code sent",
        text2:
          resetMethod === "email"
            ? `We've sent a password reset code to ${email}`
            : `We've sent a password reset code to ${phoneNumber}`,
      });

      // Navigate to reset password page after a short delay
      setTimeout(() => {
        router.push({
          pathname: "/auth/reset-password",
          params: {
            email:
              resetMethod === "email" ? email.trim().toLowerCase() : undefined,
            phoneNumber:
              resetMethod === "phone"
                ? formatPhoneNumber(phoneNumber.trim())
                : undefined,
            method: resetMethod,
          },
        });
      }, 1500);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to send reset code";

      // Handle user-friendly error messages
      if (
        errorMessage.toLowerCase().includes("not found") ||
        errorMessage.toLowerCase().includes("doesn't exist") ||
        errorMessage.toLowerCase().includes("invalid")
      ) {
        Toast.show({
          type: "error",
          text1: "Account not found",
          text2:
            resetMethod === "email"
              ? "We couldn't find an account with that email address. Please check and try again."
              : "We couldn't find an account with that phone number. Please check and try again.",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Unable to send code",
          text2:
            "Please try again in a few moments. If the problem persists, contact support.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Background Image with Overlay */}
        <View className="absolute inset-0">
          <Image
            source={images.homeHero}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
          <View
            className={`absolute inset-0 ${
              isDark ? "bg-primary/10" : "bg-gray-100/10"
            }`}
          />
        </View>

        <View className="flex-1 justify-center px-6 py-12">
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(Routes.standalone.auth);
              }
            }}
            className={`absolute top-0 left-6 z-10 rounded-full p-2 ${
              isDark ? "bg-secondary/80" : "bg-white/80"
            }`}
            style={{ marginTop: insets.top + 8 }}
          >
            <Icons.navigation
              name={IconNames.arrowBack as any}
              size={24}
              color={isDark ? "#AB8BFF" : "#000000"}
            />
          </TouchableOpacity>

          {/* Logo/Branding Section */}
          <View className="items-center mb-8">
            <Image
              source={isDark ? images.logo : images.logoDark}
              style={{ width: 100, height: 50 }}
              contentFit="contain"
              className="mb-3"
            />
            <Text
              className={`text-base text-center ${
                isDark ? "text-light-200" : "text-gray-600"
              }`}
            >
              Reset Your Password
            </Text>
          </View>

          {/* Auth Card */}
          <View
            className={`rounded-3xl p-6 border backdrop-blur ${
              isDark
                ? "bg-secondary/95 border-neutral-100/50"
                : "bg-white/95 border-gray-200/50"
            }`}
          >
            <Text
              className={`text-2xl font-bold mb-2 text-center ${
                isDark ? "text-light-100" : "text-black"
              }`}
            >
              Forgot Password?
            </Text>
            <Text
              className={`text-sm text-center mb-6 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              No worries! Enter your email or phone number and we'll send you a
              code to reset your password.
            </Text>

            {/* Method Selection */}
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity
                onPress={() => {
                  setResetMethod("email");
                  setEmail("");
                  setPhoneNumber("");
                }}
                className={`flex-1 rounded-xl py-3 px-4 border-2 ${
                  resetMethod === "email"
                    ? "bg-accent/20 border-accent"
                    : isDark
                    ? "bg-dark-100 border-neutral-100"
                    : "bg-gray-100 border-gray-200"
                }`}
              >
                <View className="flex-row items-center justify-center">
                  <Icons.communication
                    name={IconNames.message as any}
                    size={18}
                    color={
                      resetMethod === "email"
                        ? "#AB8BFF"
                        : isDark
                        ? "#9CA4AB"
                        : "#6E6E73"
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className={`font-semibold text-sm ${
                      resetMethod === "email"
                        ? "text-accent"
                        : isDark
                        ? "text-light-400"
                        : "text-gray-500"
                    }`}
                  >
                    Email
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setResetMethod("phone");
                  setEmail("");
                  setPhoneNumber("");
                }}
                className={`flex-1 rounded-xl py-3 px-4 border-2 ${
                  resetMethod === "phone"
                    ? "bg-accent/20 border-accent"
                    : isDark
                    ? "bg-dark-100 border-neutral-100"
                    : "bg-gray-100 border-gray-200"
                }`}
              >
                <View className="flex-row items-center justify-center">
                  <Icons.communication
                    name={IconNames.callOutline as any}
                    size={18}
                    color={
                      resetMethod === "phone"
                        ? "#AB8BFF"
                        : isDark
                        ? "#9CA4AB"
                        : "#6E6E73"
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className={`font-semibold text-sm ${
                      resetMethod === "phone"
                        ? "text-accent"
                        : isDark
                        ? "text-light-400"
                        : "text-gray-500"
                    }`}
                  >
                    Phone
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Input Field */}
            {resetMethod === "email" ? (
              <View className="mb-6">
                <Text
                  className={`text-xs mb-2 ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Email Address
                </Text>
                <View
                  className={`flex-row items-center rounded-xl px-4 border ${
                    isDark
                      ? "bg-dark-100 border-neutral-100"
                      : "bg-gray-100 border-gray-200"
                  }`}
                >
                  <Icons.communication
                    name={IconNames.message as any}
                    size={20}
                    color={isDark ? "#9CA4AB" : "#6E6E73"}
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor="#9CA4AB"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className={`flex-1 py-4 ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  />
                </View>
              </View>
            ) : (
              <View className="mb-6">
                <Text
                  className={`text-xs mb-2 ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Phone Number
                </Text>
                <View
                  className={`flex-row items-center rounded-xl px-4 border ${
                    isDark
                      ? "bg-dark-100 border-neutral-100"
                      : "bg-gray-100 border-gray-200"
                  }`}
                >
                  <Icons.communication
                    name={IconNames.callOutline as any}
                    size={20}
                    color={isDark ? "#9CA4AB" : "#6E6E73"}
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="08012345678"
                    placeholderTextColor="#9CA4AB"
                    keyboardType="phone-pad"
                    className={`flex-1 py-4 ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  />
                </View>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleRequestReset}
              disabled={isLoading}
              className={`bg-accent rounded-xl py-4 items-center mb-4 ${
                isLoading ? "opacity-60" : ""
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="#030014" />
              ) : (
                <Text className="text-primary font-bold text-base">
                  Send Reset Code
                </Text>
              )}
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              onPress={() => router.replace(Routes.standalone.auth)}
              className="py-3 items-center"
            >
              <Text
                className={`text-sm ${
                  isDark ? "text-light-300" : "text-gray-600"
                }`}
              >
                Remember your password?{" "}
                <Text className="text-accent font-semibold">Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
