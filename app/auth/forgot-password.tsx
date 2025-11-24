import BackButton from "@/components/BackButton";
import { IconNames, Icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { apiClient } from "@/services/apiClient";
import { Routes } from "@/services/navigationHelper";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

type ResetMethod = "email" | "phone";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get("window").height;
  const screenWidth = Dimensions.get("window").width;

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

  const translateX = useSharedValue(-screenWidth);
  const rotateY = useSharedValue(-90);
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      setCodeSent(false);
      setEmail("");
      setPhoneNumber("");
      setIsLoading(false);
      
      successScale.setValue(0);
      successOpacity.setValue(0);
      fadeAnim.setValue(1);
      
      translateX.value = -screenWidth;
      rotateY.value = -90;
      opacity.value = 0;
      translateX.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      rotateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      return () => {
        // Optional cleanup
      };
    }, [screenWidth])
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { rotateY: `${rotateY.value}deg` },
      ],
      opacity: opacity.value,
    };
  });

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
    <Reanimated.View style={[{ flex: 1 }, animatedStyle]}>
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
          <View className="absolute inset-0 bg-primary/10" />
        </View>

        <View
          className="flex-1"
          style={{
            minHeight: screenHeight,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }}
        >
          <View
            className="flex-1 justify-center px-4"
            style={{ minHeight: screenHeight - insets.top - insets.bottom }}
          >
            {/* Back Button */}
            <View
              className="absolute top-0 left-0 right-0 z-10 flex-row justify-start items-center px-4"
              style={{ marginTop: 8 }}
            >
              <BackButton
                fallbackRoute={Routes.standalone.auth}
                className="rounded-full p-1.5 bg-secondary/80"
              />
            </View>

            {/* Icon Section */}
            <View
              className="items-center mb-4"
              style={{ marginTop: screenHeight * 0.05 }}
            >
              <View
                className="rounded-full p-4 mb-3"
                style={{
                  backgroundColor: "rgba(171, 139, 255, 0.2)",
                }}
              >
                <Icons.safety
                  name={IconNames.security as any}
                  size={screenWidth * 0.12}
                  color="#AB8BFF"
                />
              </View>
              <Text
                className="text-lg font-bold text-center text-light-100"
                style={{ fontSize: screenWidth * 0.045 }}
              >
                Forgot Password?
              </Text>
              <Text
                className="text-xs text-center text-light-400 mt-1"
                style={{ fontSize: screenWidth * 0.03 }}
              >
                We'll help you reset it
              </Text>
            </View>

            {/* Auth Card */}
            <Animated.View
              className="rounded-3xl border backdrop-blur bg-secondary/95 border-neutral-100/50"
              style={[
                { opacity: fadeAnim },
                {
                  padding: screenWidth * 0.04,
                  maxHeight: screenHeight * 0.65,
                },
              ]}
            >
              {/* Method Selection */}
              <View
                className="flex-row gap-2 mb-4"
                style={{ marginBottom: screenHeight * 0.02 }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setResetMethod("email");
                    setEmail("");
                    setPhoneNumber("");
                  }}
                  className={`flex-1 rounded-xl border-2 ${
                    resetMethod === "email"
                      ? "bg-accent/20 border-accent"
                      : "bg-dark-100 border-neutral-100"
                  }`}
                  style={{
                    paddingVertical: screenHeight * 0.012,
                    paddingHorizontal: screenWidth * 0.03,
                  }}
                >
                  <View className="flex-row items-center justify-center">
                    <Icons.communication
                      name={IconNames.message as any}
                      size={screenWidth * 0.045}
                      color={resetMethod === "email" ? "#AB8BFF" : "#9CA4AB"}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      className={`font-semibold ${
                        resetMethod === "email"
                          ? "text-accent"
                          : "text-light-400"
                      }`}
                      style={{ fontSize: screenWidth * 0.032 }}
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
                  className={`flex-1 rounded-xl border-2 ${
                    resetMethod === "phone"
                      ? "bg-accent/20 border-accent"
                      : "bg-dark-100 border-neutral-100"
                  }`}
                  style={{
                    paddingVertical: screenHeight * 0.012,
                    paddingHorizontal: screenWidth * 0.03,
                  }}
                >
                  <View className="flex-row items-center justify-center">
                    <Icons.communication
                      name={IconNames.callOutline as any}
                      size={screenWidth * 0.045}
                      color={resetMethod === "phone" ? "#AB8BFF" : "#9CA4AB"}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      className={`font-semibold ${
                        resetMethod === "phone"
                          ? "text-accent"
                          : "text-light-400"
                      }`}
                      style={{ fontSize: screenWidth * 0.032 }}
                    >
                      Phone
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Input Field */}
              {resetMethod === "email" ? (
                <View
                  className="mb-4"
                  style={{ marginBottom: screenHeight * 0.02 }}
                >
                  <View className="mb-1 px-2 py-0.5 rounded-xl">
                    <Text
                      className="text-xs font-medium text-light-400"
                      style={{ fontSize: screenWidth * 0.028 }}
                    >
                      Email Address
                    </Text>
                  </View>
                  <View className="flex-row items-center rounded-xl px-3 border bg-dark-100 border-neutral-100">
                    <Icons.communication
                      name={IconNames.message as any}
                      size={screenWidth * 0.05}
                      color="#9CA4AB"
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      placeholderTextColor="#9CA4AB"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      className="flex-1 py-3 text-light-100"
                      style={{ fontSize: screenWidth * 0.035 }}
                    />
                  </View>
                </View>
              ) : (
                <View
                  className="mb-4"
                  style={{ marginBottom: screenHeight * 0.02 }}
                >
                  <View className="mb-1 px-2 py-0.5 rounded-xl">
                    <Text
                      className="text-xs font-medium text-light-400"
                      style={{ fontSize: screenWidth * 0.028 }}
                    >
                      Phone Number
                    </Text>
                  </View>
                  <View className="flex-row items-center rounded-xl px-3 border bg-dark-100 border-neutral-100">
                    <Icons.communication
                      name={IconNames.callOutline as any}
                      size={screenWidth * 0.05}
                      color="#9CA4AB"
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholder="08012345678"
                      placeholderTextColor="#9CA4AB"
                      keyboardType="phone-pad"
                      className="flex-1 py-3 text-light-100"
                      style={{ fontSize: screenWidth * 0.035 }}
                    />
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleRequestReset}
                disabled={isLoading}
                className={`rounded-xl items-center mb-3 ${
                  isLoading ? "bg-accent/60" : "bg-accent"
                }`}
                style={{
                  paddingVertical: screenHeight * 0.015,
                  marginBottom: screenHeight * 0.01,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#030014" />
                ) : (
                  <Text
                    className="font-bold text-primary"
                    style={{ fontSize: screenWidth * 0.038 }}
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
                className="py-2 items-center"
              >
                <Text
                  className="text-light-300"
                  style={{ fontSize: screenWidth * 0.03 }}
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
                  className="rounded-3xl p-8 items-center bg-secondary"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 16,
                    elevation: 10,
                    minWidth: 280,
                  }}
                >
                  <View className="rounded-full p-4 mb-4 bg-accent/20">
                    <Icons.status
                      name={IconNames.checkmarkCircle as any}
                      size={48}
                      color="#30D158"
                    />
                  </View>
                  <Text className="text-2xl font-bold mb-2 text-center text-light-100">
                    Code Sent! ✨
                  </Text>
                  <Text className="text-sm text-center mb-4 text-light-400">
                    {resetMethod === "email"
                      ? `Check your email: ${email}`
                      : `Check your phone: ${phoneNumber}`}
                  </Text>
                  <Text className="text-xs text-center text-light-500">
                    Redirecting to reset page...
                  </Text>
                </View>
              </Animated.View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Reanimated.View>
  );
}
