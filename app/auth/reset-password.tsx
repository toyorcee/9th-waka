import { IconNames, Icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { apiClient } from "@/services/apiClient";
import { Routes } from "@/services/navigationHelper";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const isRouterReady = router && typeof router.replace === "function";
  const isDark = theme === "dark";
  const params = useLocalSearchParams<{
    email?: string;
    phoneNumber?: string;
    method?: "email" | "phone";
  }>();

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  // Animation values for success state
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const resetMethod = (params.method as "email" | "phone") || "email";
  const identifier =
    resetMethod === "email" ? params.email : params.phoneNumber;

  const evaluatePassword = (value: string): "weak" | "medium" | "strong" => {
    const lengthScore = value.length >= 8;
    const upper = /[A-Z]/.test(value);
    const lower = /[a-z]/.test(value);
    const number = /\d/.test(value);
    const special = /[^A-Za-z0-9]/.test(value);
    const checks = [upper, lower, number, special].filter(Boolean).length;
    if (lengthScore && checks >= 3) return "strong";
    if (value.length >= 6 && checks >= 2) return "medium";
    return "weak";
  };

  const passwordStrength = evaluatePassword(newPassword);

  const handleResetPassword = async () => {
    if (!code.trim() || code.length !== 6) {
      Toast.show({
        type: "error",
        text1: "Invalid code",
        text2: "Please enter the 6-digit reset code",
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Toast.show({
        type: "error",
        text1: "Weak password",
        text2: "Password must be at least 6 characters",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Passwords don't match",
        text2: "Please make sure both passwords are the same",
      });
      return;
    }

    const strength = evaluatePassword(newPassword);
    if (strength === "weak") {
      Toast.show({
        type: "error",
        text1: "Password too weak",
        text2: "Use at least 8 characters with uppercase, lowercase & numbers",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.put(`/auth/resetpassword/${code}`, {
        password: newPassword,
        email: resetMethod === "email" ? identifier : undefined,
        phoneNumber: resetMethod === "phone" ? identifier : undefined,
      });

      const hasAuthToken = response.data?.token && response.data?.user;
      setHasToken(hasAuthToken);
      setResetSuccess(true);

      Toast.show({
        type: "success",
        text1: "Password reset successful",
        text2: "Your password has been updated. Please sign in.",
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

      // Auto-login if token is provided
      if (hasAuthToken) {
        await login(response.data.token, response.data.user);
        // Navigate after animation
        setTimeout(() => {
          if (isRouterReady && typeof router.replace === "function") {
            try {
              router.replace(Routes.tabs.home);
            } catch (e) {
              // Ignore navigation errors
            }
          }
        }, 2000);
      } else {
        // Navigate after animation
        setTimeout(() => {
          if (isRouterReady && typeof router.replace === "function") {
            try {
              router.replace(Routes.standalone.auth);
            } catch (e) {
              // Ignore navigation errors
            }
          }
        }, 2000);
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to reset password";

      if (
        errorMessage.toLowerCase().includes("invalid") ||
        errorMessage.toLowerCase().includes("expired")
      ) {
        Toast.show({
          type: "error",
          text1: "Invalid or expired code",
          text2:
            "The reset code is invalid or has expired. Please request a new one.",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Reset failed",
          text2:
            "Please check your code and try again. If the problem persists, request a new code.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!identifier) return;

    setIsResending(true);
    try {
      await apiClient.post("/auth/forgotpassword", {
        email: resetMethod === "email" ? identifier : undefined,
        phoneNumber: resetMethod === "phone" ? identifier : undefined,
      });

      Toast.show({
        type: "success",
        text1: "Code resent",
        text2: `A new reset code has been sent to your ${
          resetMethod === "email" ? "email" : "phone"
        }`,
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to resend",
        text2: "Please try again in a few moments",
      });
    } finally {
      setIsResending(false);
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
                    router.replace("/auth/forgot-password");
                  }
                } catch (error) {
                  if (typeof router.replace === "function") {
                    try {
                      router.replace("/auth/forgot-password");
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
              Create New Password
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
              Reset Password
            </Text>
            <Text
              className={`text-sm text-center mb-6 ${
                isDark ? "text-light-400" : "text-white"
              }`}
            >
              Enter the 6-digit code sent to{" "}
              {resetMethod === "email" ? identifier : identifier} and create a
              new password.
            </Text>

            {/* Reset Code */}
            <View className="mb-4">
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
                  Reset Code
                </Text>
              </View>
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                className={`rounded-xl p-4 tracking-widest text-center text-2xl border ${
                  isDark
                    ? "bg-dark-100 text-light-100 border-neutral-100"
                    : "bg-gray-100 text-white border-gray-200"
                }`}
                placeholder="000000"
                placeholderTextColor="#9CA4AB"
              />
            </View>

            {/* New Password */}
            <View className="mb-4">
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
                  New Password
                </Text>
              </View>
              <View
                className={`flex-row items-center rounded-xl px-4 border ${
                  isDark
                    ? "bg-dark-100 border-neutral-100"
                    : "bg-gray-100 border-gray-200"
                }`}
              >
                <Icons.safety
                  name={IconNames.security as any}
                  size={20}
                  color={isDark ? "#9CA4AB" : "#6E6E73"}
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#9CA4AB"
                  secureTextEntry={!showPassword}
                  className={`flex-1 py-4 ${
                    isDark ? "text-light-100" : "text-white"
                  }`}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Icons.action
                    name={
                      showPassword
                        ? (IconNames.eyeOutline as any)
                        : (IconNames.eyeOffOutline as any)
                    }
                    size={20}
                    color={isDark ? "#9CA4AB" : "#6E6E73"}
                  />
                </TouchableOpacity>
              </View>
              {/* Password Strength Indicator */}
              {newPassword.length > 0 && (
                <View className="mt-2">
                  <View className="flex-row items-center gap-2 mb-1">
                    <View
                      className={`h-1 flex-1 rounded-full ${
                        passwordStrength === "strong"
                          ? "bg-success"
                          : passwordStrength === "medium"
                          ? "bg-warning"
                          : "bg-danger"
                      }`}
                    />
                    <Text
                      className={`text-xs ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
                      {passwordStrength === "strong"
                        ? "Strong"
                        : passwordStrength === "medium"
                        ? "Medium"
                        : "Weak"}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Confirm Password */}
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
                  Confirm Password
                </Text>
              </View>
              <View
                className={`flex-row items-center rounded-xl px-4 border ${
                  isDark
                    ? "bg-dark-100 border-neutral-100"
                    : "bg-gray-100 border-gray-200"
                }`}
              >
                <Icons.safety
                  name={IconNames.security as any}
                  size={20}
                  color={isDark ? "#9CA4AB" : "#6E6E73"}
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#9CA4AB"
                  secureTextEntry={!showConfirmPassword}
                  className={`flex-1 py-4 ${
                    isDark ? "text-light-100" : "text-white"
                  }`}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Icons.action
                    name={
                      showConfirmPassword
                        ? (IconNames.eyeOutline as any)
                        : (IconNames.eyeOffOutline as any)
                    }
                    size={20}
                    color={isDark ? "#9CA4AB" : "#6E6E73"}
                  />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 &&
                newPassword !== confirmPassword && (
                  <Text className="text-danger text-xs mt-1">
                    Passwords don't match
                  </Text>
                )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={isLoading}
              className={`rounded-xl py-4 items-center mb-3 ${
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
                  Reset Password
                </Text>
              )}
            </TouchableOpacity>

            {/* Resend Code */}
            <TouchableOpacity
              onPress={handleResendCode}
              disabled={isResending}
              className={`rounded-xl py-3 items-center border ${
                isDark ? "border-neutral-100" : "border-gray-200"
              } ${isResending ? "opacity-60" : ""}`}
            >
              {isResending ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator
                    color={isDark ? "#9CA4AB" : "#6E6E73"}
                    size="small"
                  />
                  <Text
                    className={`font-semibold text-sm ${
                      isDark ? "text-light-300" : "text-white"
                    }`}
                  >
                    Sending…
                  </Text>
                </View>
              ) : (
                <Text
                  className={`font-semibold text-sm ${
                    isDark ? "text-light-300" : "text-white"
                  }`}
                >
                  Resend Code
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Success Overlay */}
          {resetSuccess && (
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
                  Password Reset! 🎉
                </Text>
                <Text
                  className={`text-sm text-center mb-4 ${
                    isDark ? "text-light-400" : "text-gray-600"
                  }`}
                >
                  Your password has been successfully updated
                </Text>
                <Text
                  className={`text-xs text-center ${
                    isDark ? "text-light-500" : "text-gray-500"
                  }`}
                >
                  {hasToken ? "Signing you in..." : "Redirecting to login..."}
                </Text>
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
