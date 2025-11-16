import { IconNames, Icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { navigationHelper, Routes } from "@/services/navigationHelper";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

type AuthMode = "login" | "signup";

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"customer" | "rider">(
    "customer"
  );
  const [vehicleType, setVehicleType] = useState<
    "bicycle" | "motorbike" | "tricycle" | "car" | "van" | ""
  >("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmMismatch, setConfirmMismatch] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<
    "weak" | "medium" | "strong" | null
  >(null);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  const vehicleTypes = [
    { value: "bicycle", label: "Bicycle", icon: "bicycle" },
    { value: "motorbike", label: "Motorbike", icon: "motorbike" },
    { value: "tricycle", label: "Tricycle", icon: "rickshaw" },
    { value: "car", label: "Car", icon: "car-outline" },
    { value: "van", label: "Van", icon: "van-utility" },
  ] as const;

  const { login, register, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  const isRouterReady = router && typeof router.replace === "function";

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

  const handleSubmit = async () => {
    // Validation
    if (!email || !password) {
      Toast.show({
        type: "error",
        text1: "Missing fields",
        text2: "Please fill in all fields",
      });
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      Toast.show({ type: "error", text1: "Passwords do not match" });
      return;
    }

    if (password.length < 6) {
      Toast.show({
        type: "error",
        text1: "Weak password",
        text2: "Must be at least 6 characters",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);

        const pendingAction = await navigationHelper.getPendingAction();
        await navigationHelper.clearPendingAction();

        if (isRouterReady && typeof router.replace === "function") {
          try {
            router.replace(Routes.tabs.home);
          } catch (e) {}

          setTimeout(() => {
            if (!isRouterReady) return;
            try {
              if (
                pendingAction === "request" &&
                typeof router.push === "function"
              ) {
                router.push(Routes.standalone.newOrder);
              } else if (
                pendingAction === "track" &&
                typeof router.push === "function"
              ) {
                router.push(Routes.tabs.track);
              } else if (
                pendingAction === "sos" &&
                typeof router.push === "function"
              ) {
                router.push(Routes.standalone.sos);
              } else if (
                pendingAction === "orders" &&
                typeof router.push === "function"
              ) {
                router.push(Routes.tabs.orders);
              } else if (
                pendingAction === "deliveries" &&
                typeof router.push === "function"
              ) {
                router.push(Routes.tabs.deliveries);
              } else if (
                pendingAction === "earnings" &&
                typeof router.push === "function"
              ) {
                router.push(Routes.tabs.earnings);
              }
            } catch (e) {
              // Ignore navigation errors
            }
          }, 100);
        }
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setPasswordsMatch(false);
        setMode("login");
      } else {
        const strength = evaluatePassword(password);
        if (strength === "weak") {
          Toast.show({
            type: "error",
            text1: "Password too weak",
            text2: "Use at least 8 chars incl. upper/lower & number",
          });
          setIsLoading(false);
          return;
        }
        if (selectedRole === "rider") {
          if (!vehicleType) {
            Toast.show({ type: "error", text1: "Select your vehicle" });
            setIsLoading(false);
            return;
          }
        }
        await register(
          email,
          password,
          selectedRole,
          vehicleType || (undefined as any)
        );

        if (isRouterReady && typeof router.replace === "function") {
          try {
            router.replace(`/verify?email=${encodeURIComponent(email)}`);
          } catch (e) {}
        }
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setPasswordsMatch(false);
        setVehicleType("");
        setMode("login");
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        `${mode === "login" ? "Login" : "Signup"} failed`;

      Toast.show({
        type: "error",
        text1: message,
        text2: "Please try again",
      });

      if (__DEV__) {
        console.error("Auth error:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = useCallback(() => {
    if (!isRouterReady) {
      return; // Don't navigate if router isn't ready
    }
    try {
      if (router.canGoBack && typeof router.canGoBack === "function") {
        const canGoBack = router.canGoBack();
        if (canGoBack && typeof router.back === "function") {
          router.back();
          return;
        }
      }
      if (typeof router.replace === "function") {
        router.replace(Routes.tabs.home);
      }
    } catch (error) {
      // Silently fail - navigation context not ready
      if (typeof router.replace === "function") {
        try {
          router.replace(Routes.tabs.home);
        } catch (e) {
          // Ignore navigation errors
        }
      }
    }
  }, [router, isRouterReady]);

  useEffect(() => {
    const checkPendingAction = async () => {
      const pendingAction = await navigationHelper.getPendingAction();
      if (pendingAction === "request") {
        setMode("signup");
      }
    };
    checkPendingAction();
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleGoBack();
        return true; // Prevent default back behavior
      }
    );

    return () => backHandler.remove();
  }, [handleGoBack]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      {/* Toasts rendered globally in _layout.tsx */}
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
              onPress={handleGoBack}
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
          <View className="items-center mb-6">
            <Image
              source={images.logo}
              style={{ width: 100, height: 50 }}
              contentFit="contain"
              className="mb-4"
            />
            <Text
              className={`text-2xl font-bold text-center mb-2 ${
                isDark ? "text-light-100" : "text-white"
              }`}
            >
              Welcome to 9thWaka
            </Text>
            <Text
              className={`text-base text-center px-4 ${
                isDark ? "text-light-300" : "text-white/90"
              }`}
            >
              Nigeria's Most Trusted Delivery Platform
            </Text>
            <View className="flex-row items-center justify-center mt-3 gap-4">
              <View className="flex-row items-center">
                <Icons.status
                  name={IconNames.checkmarkCircle as any}
                  size={16}
                  color={isDark ? "#30D158" : "#FFFFFF"}
                />
                <Text
                  className={`text-sm ml-1 ${
                    isDark ? "text-light-300" : "text-white/90"
                  }`}
                >
                  Fast
                </Text>
              </View>
              <View className="flex-row items-center">
                <Icons.status
                  name={IconNames.checkmarkCircle as any}
                  size={16}
                  color={isDark ? "#30D158" : "#FFFFFF"}
                />
                <Text
                  className={`text-sm ml-1 ${
                    isDark ? "text-light-300" : "text-white/90"
                  }`}
                >
                  Secure
                </Text>
              </View>
              <View className="flex-row items-center">
                <Icons.status
                  name={IconNames.checkmarkCircle as any}
                  size={16}
                  color={isDark ? "#30D158" : "#FFFFFF"}
                />
                <Text
                  className={`text-sm ml-1 ${
                    isDark ? "text-light-300" : "text-white/90"
                  }`}
                >
                  Reliable
                </Text>
              </View>
            </View>
          </View>

          {/* Auth Card */}
          <View
            className={`rounded-3xl p-6 border backdrop-blur ${
              isDark
                ? "bg-secondary/95 border-neutral-100/50"
                : "bg-gray-50/98 border-gray-300/60 shadow-lg"
            }`}
            style={
              !isDark
                ? {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.12,
                    shadowRadius: 16,
                    elevation: 8,
                  }
                : undefined
            }
          >
            {/* Welcome Message Inside Form */}
            <View className="mb-6">
              <Text
                className={`text-xl font-bold text-center mb-2 ${
                  isDark ? "text-light-100" : "text-white"
                }`}
              >
                {mode === "login"
                  ? "Welcome Back! 🚀"
                  : "Start Your Journey Today! ✨"}
              </Text>
              <Text
                className={`text-sm text-center ${
                  isDark ? "text-light-400" : "text-white/90"
                }`}
              >
                {mode === "login"
                  ? "Access your account and continue delivering excellence"
                  : "Join thousands of satisfied customers and riders across Nigeria"}
              </Text>
            </View>

            {/* Mode Toggle */}
            <View
              className={`flex-row rounded-2xl p-1 mb-6 ${
                isDark ? "bg-dark-100" : "bg-gray-100"
              }`}
            >
              <TouchableOpacity
                onPress={() => setMode("login")}
                className={`flex-1 py-3 rounded-xl ${
                  mode === "login" ? (isDark ? "bg-accent" : "") : ""
                }`}
                style={
                  mode === "login" && !isDark
                    ? { backgroundColor: "#1E3A8A" }
                    : undefined
                }
              >
                <Text
                  className={`text-center font-semibold ${
                    mode === "login"
                      ? isDark
                        ? "text-primary"
                        : "text-white"
                      : isDark
                      ? "text-light-300"
                      : "text-gray-500"
                  }`}
                >
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMode("signup")}
                className={`flex-1 py-3 rounded-xl ${
                  mode === "signup" ? (isDark ? "bg-accent" : "") : ""
                }`}
                style={
                  mode === "signup" && !isDark
                    ? { backgroundColor: "#1E3A8A" }
                    : undefined
                }
              >
                <Text
                  className={`text-center font-semibold ${
                    mode === "signup"
                      ? isDark
                        ? "text-primary"
                        : "text-white"
                      : isDark
                      ? "text-light-300"
                      : "text-gray-500"
                  }`}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Role Selection (Signup only) */}
            {mode === "signup" && (
              <View className="mb-6">
                <View
                  className={`mb-2 px-2 py-1 rounded-xl ${
                    isDark ? "" : "bg-white"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      isDark ? "text-light-200" : "text-blue-900"
                    }`}
                  >
                    I want to register as
                  </Text>
                </View>
                <View
                  className={`flex-row rounded-2xl p-1 ${
                    isDark ? "bg-dark-100" : "bg-gray-100"
                  }`}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedRole("customer")}
                    className={`flex-1 py-1.5 rounded-xl ${
                      selectedRole === "customer"
                        ? isDark
                          ? "bg-accent"
                          : ""
                        : ""
                    }`}
                    style={
                      selectedRole === "customer" && !isDark
                        ? { backgroundColor: "#1E3A8A" }
                        : undefined
                    }
                  >
                    <Text
                      className={`text-center font-semibold text-sm ${
                        selectedRole === "customer"
                          ? isDark
                            ? "text-primary"
                            : "text-white"
                          : isDark
                          ? "text-light-300"
                          : "text-gray-500"
                      }`}
                    >
                      Customer
                    </Text>
                    <Text
                      className={`text-center text-xs mt-1 ${
                        selectedRole === "customer"
                          ? isDark
                            ? "text-primary/70"
                            : "text-white/70"
                          : isDark
                          ? "text-light-400"
                          : "text-gray-400"
                      }`}
                    >
                      Request deliveries
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedRole("rider")}
                    className={`flex-1 py-1.5 rounded-xl ${
                      selectedRole === "rider"
                        ? isDark
                          ? "bg-accent"
                          : ""
                        : ""
                    }`}
                    style={
                      selectedRole === "rider" && !isDark
                        ? { backgroundColor: "#1E3A8A" }
                        : undefined
                    }
                  >
                    <Text
                      className={`text-center font-semibold text-sm ${
                        selectedRole === "rider"
                          ? isDark
                            ? "text-primary"
                            : "text-white"
                          : isDark
                          ? "text-light-300"
                          : "text-gray-500"
                      }`}
                    >
                      Rider
                    </Text>
                    <Text
                      className={`text-center text-xs mt-1 ${
                        selectedRole === "rider"
                          ? isDark
                            ? "text-primary/70"
                            : "text-white/70"
                          : isDark
                          ? "text-light-400"
                          : "text-gray-400"
                      }`}
                    >
                      Deliver packages
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Email Input */}
            <View className="mb-4">
              <View
                className={`mb-2 px-2 py-1 rounded-xl ${
                  isDark ? "" : "bg-white"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    isDark ? "text-light-200" : "text-blue-900"
                  }`}
                >
                  Email
                </Text>
              </View>
              <View className="flex-row items-center bg-dark-100 rounded-xl border border-neutral-100/50">
                <View className="pl-4">
                  <Icons.communication
                    name={IconNames.messageOutline as any}
                    size={20}
                    color="#A8B5DB"
                  />
                </View>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA4AB"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className={`flex-1 px-4 py-4 ${
                    isDark ? "text-light-100" : "text-white"
                  }`}
                />
              </View>
            </View>

            {/* Password Input */}
            <View className="mb-4">
              <View
                className={`mb-2 px-2 py-1 rounded-xl ${
                  isDark ? "" : "bg-white"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    isDark ? "text-light-200" : "text-blue-900"
                  }`}
                >
                  Password
                </Text>
              </View>
              <View className="flex-row items-center bg-dark-100 rounded-xl border border-neutral-100/50">
                <View className="pl-4">
                  <Icons.safety
                    name={IconNames.securityOutline as any}
                    size={20}
                    color="#A8B5DB"
                  />
                </View>
                <TextInput
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    if (v.length > 0) {
                      setPasswordStrength(evaluatePassword(v));
                    } else {
                      setPasswordStrength(null);
                    }
                    if (confirmPassword.length > 0) {
                      const matches = v === confirmPassword;
                      setConfirmMismatch(!matches);
                      setPasswordsMatch(matches);
                    }
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA4AB"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  className={`flex-1 px-4 py-4 ${
                    isDark ? "text-light-100" : "text-white"
                  }`}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="pr-4"
                >
                  <Icons.user
                    name={
                      (showPassword
                        ? IconNames.eyeOutline
                        : IconNames.eyeOffOutline) as any
                    }
                    size={20}
                    color="#A8B5DB"
                  />
                </TouchableOpacity>
              </View>
            </View>
            {mode === "signup" && password.length > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center">
                  <View
                    className={`h-2 flex-1 rounded-full ${
                      passwordStrength === "strong"
                        ? "bg-green-500"
                        : passwordStrength === "medium"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  />
                  <Text
                    className={`ml-3 text-xs ${
                      isDark ? "text-light-300" : "text-gray-600"
                    }`}
                  >
                    {passwordStrength ? passwordStrength.toUpperCase() : "WEAK"}
                  </Text>
                </View>
                <Text
                  className={`text-xs mt-2 ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Use at least 8 characters with a mix of upper, lower, numbers,
                  and symbols.
                </Text>
              </View>
            )}

            {/* Confirm Password (Signup only) */}
            {mode === "signup" && (
              <View className="mb-6">
                <View
                  className={`mb-2 px-2 py-1 rounded-xl ${
                    isDark ? "" : "bg-white"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      isDark ? "text-light-200" : "text-blue-900"
                    }`}
                  >
                    Confirm Password
                  </Text>
                </View>
                <View
                  className={`flex-row items-center bg-dark-100 rounded-xl border ${
                    confirmMismatch
                      ? "border-red-500"
                      : passwordsMatch
                      ? "border-green-500"
                      : "border-neutral-100/50"
                  }`}
                >
                  <View className="pl-4">
                    <Icons.safety
                      name={IconNames.securityOutline as any}
                      size={20}
                      color="#A8B5DB"
                    />
                  </View>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      const matches = v.length > 0 && v === password;
                      setConfirmMismatch(v.length > 0 && !matches);
                      setPasswordsMatch(matches);
                    }}
                    placeholder="Confirm your password"
                    placeholderTextColor="#9CA4AB"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    className={`flex-1 px-4 py-4 ${
                      isDark ? "text-light-100" : "text-white"
                    }`}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="pr-4"
                  >
                    <Icons.user
                      name={
                        (showConfirmPassword
                          ? IconNames.eyeOutline
                          : IconNames.eyeOffOutline) as any
                      }
                      size={20}
                      color="#A8B5DB"
                    />
                  </TouchableOpacity>
                </View>
                {confirmMismatch && (
                  <Text className="text-red-500 text-xs mt-2">
                    Passwords do not match
                  </Text>
                )}
                {passwordsMatch && !confirmMismatch && (
                  <Text className="text-green-500 text-xs mt-2">
                    ✓ Passwords match
                  </Text>
                )}
              </View>
            )}

            {/* Rider: Vehicle Type (Signup only) */}
            {mode === "signup" && selectedRole === "rider" && (
              <View className="mb-6">
                <View
                  className={`mb-2 px-2 py-1 rounded-xl ${
                    isDark ? "" : "bg-white"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      isDark ? "text-light-200" : "text-blue-900"
                    }`}
                  >
                    Vehicle Type
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    // Show vehicle type picker modal
                    setShowVehiclePicker(true);
                  }}
                  className={`flex-row items-center justify-between rounded-xl px-4 py-3 border ${
                    isDark
                      ? "bg-dark-100 border-neutral-100"
                      : "bg-gray-100 border-gray-200"
                  }`}
                >
                  <Text
                    className={`flex-1 ${
                      vehicleType
                        ? isDark
                          ? "text-light-100"
                          : "text-black"
                        : isDark
                        ? "text-light-400"
                        : "text-gray-500"
                    }`}
                  >
                    {vehicleType
                      ? vehicleType.charAt(0).toUpperCase() +
                        vehicleType.slice(1)
                      : "Select your vehicle type"}
                  </Text>
                  <Icons.action
                    name={IconNames.chevronDown as any}
                    size={20}
                    color={isDark ? "#9CA4AB" : "#6E6E73"}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Submit Button */}
            {(() => {
              const signupMismatch =
                mode === "signup" &&
                confirmPassword.length > 0 &&
                confirmPassword !== password;
              const riderNeedsVehicle =
                mode === "signup" && selectedRole === "rider" && !vehicleType;
              const disabled = isLoading || signupMismatch || riderNeedsVehicle;
              return (
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={disabled}
                  className={`rounded-xl py-4 mb-4 flex-row items-center justify-center ${
                    disabled
                      ? isDark
                        ? "bg-accent/50"
                        : "bg-blue-800/50"
                      : isDark
                      ? "bg-accent"
                      : ""
                  }`}
                  style={
                    !disabled && !isDark
                      ? { backgroundColor: "#1E3A8A" }
                      : undefined
                  }
                >
                  {isLoading ? (
                    <ActivityIndicator
                      color={isDark ? "#030014" : "#FFFFFF"}
                      size="small"
                    />
                  ) : (
                    <>
                      <View style={{ marginRight: 8 }}>
                        <Icons.action
                          name={
                            (mode === "login"
                              ? IconNames.arrowForward
                              : IconNames.addCircle) as any
                          }
                          size={20}
                          color={isDark ? "#030014" : "#FFFFFF"}
                        />
                      </View>
                      <Text
                        className={`font-bold text-base ${
                          isDark ? "text-primary" : "text-white"
                        }`}
                      >
                        {mode === "login" ? "Login" : "Create Account"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })()}

            {/* Forgot Password Link (Login only) */}
            {mode === "login" && (
              <TouchableOpacity
                onPress={() => {
                  if (isRouterReady && typeof router.push === "function") {
                    try {
                      router.push("/auth/forgot-password" as any);
                    } catch (e) {
                      // Ignore navigation errors
                    }
                  }
                }}
                className="py-2 items-center mb-3"
              >
                <Text className="text-light-300 text-sm">
                  Forgot password?{" "}
                  <Text className="text-accent font-semibold">Reset it</Text>
                </Text>
              </TouchableOpacity>
            )}

            {/* Toggle Text */}
            <View className="flex-row justify-center items-center">
              <Text className="text-light-300 text-sm">
                {mode === "login"
                  ? "Don't have an account? "
                  : "Already have an account? "}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setConfirmPassword("");
                  setPasswordsMatch(false);
                }}
              >
                <Text className="text-accent font-semibold text-sm">
                  {mode === "login" ? "Sign Up" : "Login"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View className="mt-6">
            <Text className="text-light-400 text-xs text-center">
              By continuing, you agree to our Terms of Service
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Vehicle Type Picker Modal */}
      <Modal
        visible={showVehiclePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVehiclePicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={() => setShowVehiclePicker(false)}
        >
          <View
            className={`absolute bottom-0 left-0 right-0 rounded-t-3xl ${
              isDark ? "bg-secondary" : "bg-white"
            }`}
            style={{ paddingBottom: insets.bottom }}
          >
            <View className="px-6 pt-4 pb-2">
              <View className="flex-row items-center justify-between mb-4">
                <Text
                  className={`text-xl font-bold ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Select Vehicle Type
                </Text>
                <TouchableOpacity
                  onPress={() => setShowVehiclePicker(false)}
                  className="p-2"
                >
                  <Icons.action
                    name={IconNames.close as any}
                    size={24}
                    color={isDark ? "#9CA4AB" : "#6E6E73"}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {vehicleTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => {
                      setVehicleType(type.value);
                      setShowVehiclePicker(false);
                    }}
                    className={`flex-row items-center p-4 mb-2 rounded-xl border ${
                      vehicleType === type.value
                        ? isDark
                          ? "bg-accent/20 border-accent"
                          : "bg-blue-900/20 border-blue-900"
                        : isDark
                        ? "bg-dark-100 border-neutral-100"
                        : "bg-gray-100 border-gray-200"
                    }`}
                  >
                    <View
                      className={`mr-4 p-2 rounded-lg ${
                        vehicleType === type.value
                          ? isDark
                            ? "bg-accent/30"
                            : "bg-blue-900/30"
                          : isDark
                          ? "bg-dark-100"
                          : "bg-gray-200"
                      }`}
                    >
                      <Icons.motorcycle
                        name={type.icon as any}
                        size={24}
                        color={
                          vehicleType === type.value
                            ? isDark
                              ? "#AB8BFF"
                              : "#1E3A8A"
                            : isDark
                            ? "#9CA4AB"
                            : "#6E6E73"
                        }
                      />
                    </View>
                    <Text
                      className={`flex-1 text-base font-semibold ${
                        vehicleType === type.value
                          ? isDark
                            ? "text-accent"
                            : "text-blue-900"
                          : isDark
                          ? "text-light-100"
                          : "text-black"
                      }`}
                    >
                      {type.label}
                    </Text>
                    {vehicleType === type.value && (
                      <Icons.status
                        name={IconNames.checkmarkCircle as any}
                        size={24}
                        color={isDark ? "#AB8BFF" : "#1E3A8A"}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
