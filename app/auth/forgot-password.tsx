import { IconNames, Icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useTheme } from "@/contexts/ThemeContext";
import { apiClient } from "@/services/apiClient";
import { Routes } from "@/services/navigationHelper";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
  const { theme, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  const isRouterReady = router && typeof router.replace === "function";
  const [resetMethod, setResetMethod] = useState<ResetMethod>("email");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  // Animation values for success state
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

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

      // Animate success state
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Navigate to reset password page after animation
      setTimeout(() => {
        if (!isRouterReady || typeof router.push !== "function") return;
        try {
          router.push({
            pathname: "/auth/reset-password",
            params: {
              email:
                resetMethod === "email"
                  ? email.trim().toLowerCase()
                  : undefined,
              phoneNumber:
                resetMethod === "phone"
                  ? formatPhoneNumber(phoneNumber.trim())
                  : undefined,
              method: resetMethod,
            },
          });
        } catch (e) {
          // Ignore navigation errors
        }
      }, 2000);
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
      {/* Background Image with Overlay - Fixed */}
      <View className="absolute inset-0">
        <Image
          source={images.homeHero}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
        <View
          className={`absolute inset-0 ${
            isDark ? "bg-primary/10" : "bg-white/10"
          }`}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center px-6 py-12">
          {/* Back Button and Theme Toggle */}
          <View
            className="absolute top-0 left-0 right-0 z-10 flex-row justify-between items-center px-6"
            style={{ marginTop: insets.top + 8 }}
          >
            <TouchableOpacity
              onPress={() => {
                if (!isRouterReady) return;
                try {
                  if (
                    router.canGoBack &&
                    typeof router.canGoBack === "function"
                  ) {
                    const canGoBack = router.canGoBack();
                    if (canGoBack && typeof router.back === "function") {
                      router.back();
                      return;
                    }
                  }
                  if (typeof router.replace === "function") {
                    router.replace(Routes.standalone.auth);
                  }
                } catch (error) {
                  if (typeof router.replace === "function") {
                    try {
                      router.replace(Routes.standalone.auth);
                    } catch (e) {
                      // Ignore navigation errors
                    }
                  }
                }
              }}
              className={`rounded-full p-1.5 ${
                isDark ? "bg-secondary/80" : "bg-gray-50/90"
              }`}
            >
              <Icons.navigation
                name={IconNames.arrowBack as any}
                size={20}
                color={isDark ? "#AB8BFF" : "#1E3A8A"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleTheme}
              className={`rounded-full p-1.5 ${
                isDark ? "bg-secondary/80" : "bg-gray-50/90"
              }`}
              accessibilityRole="button"
              accessibilityLabel={
                isDark ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              <Icons.action
                name={isDark ? "moon-outline" : "sunny-outline"}
                size={20}
                color={isDark ? "#AB8BFF" : "#1E3A8A"}
              />
            </TouchableOpacity>
          </View>

          {/* Logo/Branding Section */}
          <View className="items-center mb-8">
            <Image
              source={images.logo}
              style={{ width: 100, height: 50 }}
              contentFit="contain"
              className="mb-3"
            />
            <Text
              className={`text-base text-center ${
                isDark ? "text-light-200" : "text-white"
              }`}
            >
              Reset Your Password
            </Text>
          </View>

          {/* Auth Card */}
          <Animated.View
            className={`rounded-3xl p-6 border backdrop-blur ${
              isDark
                ? "bg-secondary/95 border-neutral-100/50"
                : "bg-gray-50/98 border-gray-300/60 shadow-lg"
            }`}
            style={[
              !isDark
                ? {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.12,
                    shadowRadius: 16,
                    elevation: 8,
                  }
                : undefined,
              { opacity: fadeAnim },
            ]}
          >
            <Text
              className={`text-2xl font-bold mb-2 text-center ${
                isDark ? "text-light-100" : "text-white"
              }`}
            >
              Forgot Password?
            </Text>
            <Text
              className={`text-sm text-center mb-16 ${
                isDark ? "text-light-400" : "text-white"
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
                    ? isDark
                      ? "bg-accent/20 border-accent"
                      : "border-blue-800"
                    : isDark
                    ? "bg-dark-100 border-neutral-100"
                    : "bg-gray-100 border-gray-200"
                }`}
                style={
                  resetMethod === "email" && !isDark
                    ? { backgroundColor: "#1E3A8A" }
                    : undefined
                }
              >
                <View className="flex-row items-center justify-center">
                  <Icons.communication
                    name={IconNames.message as any}
                    size={18}
                    color={
                      resetMethod === "email"
                        ? isDark
                          ? "#AB8BFF"
                          : "#FFFFFF"
                        : isDark
                        ? "#9CA4AB"
                        : "#6E6E73"
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className={`font-semibold text-sm ${
                      resetMethod === "email"
                        ? isDark
                          ? "text-accent"
                          : "text-white"
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
                    ? isDark
                      ? "bg-accent/20 border-accent"
                      : "border-blue-800"
                    : isDark
                    ? "bg-dark-100 border-neutral-100"
                    : "bg-gray-100 border-gray-200"
                }`}
                style={
                  resetMethod === "phone" && !isDark
                    ? { backgroundColor: "#1E3A8A" }
                    : undefined
                }
              >
                <View className="flex-row items-center justify-center">
                  <Icons.communication
                    name={IconNames.callOutline as any}
                    size={18}
                    color={
                      resetMethod === "phone"
                        ? isDark
                          ? "#AB8BFF"
                          : "#FFFFFF"
                        : isDark
                        ? "#9CA4AB"
                        : "#6E6E73"
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className={`font-semibold text-sm ${
                      resetMethod === "phone"
                        ? isDark
                          ? "text-accent"
                          : "text-white"
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
                <View
                  className={`mb-2 px-2 py-1 rounded-xl ${
                    isDark ? "" : "bg-white"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      isDark ? "text-light-400" : "text-blue-900"
                    }`}
                  >
                    Email Address
                  </Text>
                </View>
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
                      isDark ? "text-light-100" : "text-white"
                    }`}
                  />
                </View>
              </View>
            ) : (
              <View className="mb-6">
                <View
                  className={`mb-2 px-2 py-1 rounded-xl ${
                    isDark ? "" : "bg-white"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      isDark ? "text-light-400" : "text-blue-900"
                    }`}
                  >
                    Phone Number
                  </Text>
                </View>
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
                      isDark ? "text-light-100" : "text-white"
                    }`}
                  />
                </View>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleRequestReset}
              disabled={isLoading}
              className={`rounded-xl py-4 items-center mb-4 ${
                isLoading
                  ? isDark
                    ? "bg-accent/60"
                    : "bg-blue-800/60"
                  : isDark
                  ? "bg-accent"
                  : ""
              }`}
              style={
                !isLoading && !isDark
                  ? { backgroundColor: "#1E3A8A" }
                  : undefined
              }
            >
              {isLoading ? (
                <ActivityIndicator color={isDark ? "#030014" : "#FFFFFF"} />
              ) : (
                <Text
                  className={`font-bold text-base ${
                    isDark ? "text-primary" : "text-white"
                  }`}
                >
                  Send Reset Code
                </Text>
              )}
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              onPress={() => {
                if (isRouterReady && typeof router.replace === "function") {
                  try {
                    router.replace(Routes.standalone.auth);
                  } catch (e) {
                    // Ignore navigation errors
                  }
                }
              }}
              className="py-3 items-center"
            >
              <Text
                className={`text-sm ${
                  isDark ? "text-light-300" : "text-white"
                }`}
              >
                Remember your password?{" "}
                <Text className="text-accent font-semibold">Sign In</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Success Overlay */}
          {codeSent && (
            <Animated.View
              className="absolute inset-0 items-center justify-center z-20"
              style={{
                opacity: successOpacity,
                transform: [{ scale: successScale }],
              }}
            >
              <View
                className={`rounded-3xl p-8 items-center ${
                  isDark ? "bg-secondary" : "bg-white"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 10,
                  minWidth: 280,
                }}
              >
                <View
                  className={`rounded-full p-4 mb-4 ${
                    isDark ? "bg-accent/20" : "bg-blue-900/20"
                  }`}
                >
                  <Icons.status
                    name={IconNames.checkmarkCircle as any}
                    size={48}
                    color={isDark ? "#30D158" : "#10B981"}
                  />
                </View>
                <Text
                  className={`text-2xl font-bold mb-2 text-center ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Code Sent! ✨
                </Text>
                <Text
                  className={`text-sm text-center mb-4 ${
                    isDark ? "text-light-400" : "text-gray-600"
                  }`}
                >
                  {resetMethod === "email"
                    ? `Check your email: ${email}`
                    : `Check your phone: ${phoneNumber}`}
                </Text>
                <Text
                  className={`text-xs text-center ${
                    isDark ? "text-light-500" : "text-gray-500"
                  }`}
                >
                  Redirecting to reset page...
                </Text>
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
