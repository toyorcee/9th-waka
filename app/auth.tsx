import BackButton from "@/components/BackButton";
import { IconNames, Icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useAuth } from "@/contexts/AuthContext";
import { navigationHelper, Routes } from "@/services/navigationHelper";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
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
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
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
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isRouterReady = router && typeof router.replace === "function";

  // Slide in animation from left to right
  const translateX = useSharedValue(-Dimensions.get("window").width);
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      translateX.value = -Dimensions.get("window").width;
      opacity.value = 0;
      translateX.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      });
      opacity.value = withTiming(1, { duration: 400 });
      return () => {
        // Optional cleanup
      };
    }, [])
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

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
    <Reanimated.View style={[{ flex: 1 }, animatedStyle]}>
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
          <View className="absolute inset-0 bg-primary/10" />
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
            {/* Back Button */}
            <View
              className="absolute top-0 left-0 right-0 z-10 flex-row justify-start items-center px-6"
              style={{ marginTop: insets.top + 8 }}
            >
              <BackButton
                fallbackRoute={Routes.tabs.home}
                className="rounded-full p-1.5 bg-secondary/80"
              />
            </View>

            {/* Logo/Branding Section */}
            <View className="items-center mb-6">
              <Image
                source={images.logo}
                style={{ width: 100, height: 50 }}
                contentFit="contain"
                className="mb-4"
              />
              <Text className="text-base text-center px-4 text-light-300">
                Nigeria's Most Trusted Delivery Platform
              </Text>
              <View className="flex-row items-center justify-center mt-3 gap-4">
                <View className="flex-row items-center">
                  <Icons.status
                    name={IconNames.checkmarkCircle as any}
                    size={16}
                    color="#30D158"
                  />
                  <Text className="text-sm ml-1 text-light-300">Fast</Text>
                </View>
                <View className="flex-row items-center">
                  <Icons.status
                    name={IconNames.checkmarkCircle as any}
                    size={16}
                    color="#30D158"
                  />
                  <Text className="text-sm ml-1 text-light-300">Secure</Text>
                </View>
                <View className="flex-row items-center">
                  <Icons.status
                    name={IconNames.checkmarkCircle as any}
                    size={16}
                    color="#30D158"
                  />
                  <Text className="text-sm ml-1 text-light-300">Reliable</Text>
                </View>
              </View>
            </View>

            {/* Auth Card */}
            <View className="rounded-3xl p-6 border backdrop-blur bg-secondary/95 border-neutral-100/50">
              {/* Welcome Message Inside Form */}
              <View className="mb-6">
                <Text className="text-xl font-bold text-center mb-2 text-light-100">
                  {mode === "login"
                    ? "Welcome Back! 🚀"
                    : "Start Your Journey Today! ✨"}
                </Text>
                <Text className="text-sm text-center text-light-400">
                  {mode === "login"
                    ? "Access your account and continue delivering excellence"
                    : "Join thousands of satisfied customers and riders across Nigeria"}
                </Text>
              </View>

              {/* Mode Toggle */}
              <View className="flex-row rounded-2xl p-1 mb-6 bg-dark-100">
                <TouchableOpacity
                  onPress={() => setMode("login")}
                  className={`flex-1 py-3 rounded-xl ${
                    mode === "login" ? "bg-accent" : ""
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      mode === "login" ? "text-primary" : "text-light-300"
                    }`}
                  >
                    Login
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMode("signup")}
                  className={`flex-1 py-3 rounded-xl ${
                    mode === "signup" ? "bg-accent" : ""
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      mode === "signup" ? "text-primary" : "text-light-300"
                    }`}
                  >
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Role Selection (Signup only) */}
              {mode === "signup" && (
                <View className="mb-6">
                  <View className="mb-2 px-2 py-1 rounded-xl">
                    <Text className="text-sm font-medium text-light-200">
                      I want to register as
                    </Text>
                  </View>
                  <View className="flex-row rounded-2xl p-1 bg-dark-100">
                    <TouchableOpacity
                      onPress={() => setSelectedRole("customer")}
                      className={`flex-1 py-1.5 rounded-xl ${
                        selectedRole === "customer" ? "bg-accent" : ""
                      }`}
                    >
                      <Text
                        className={`text-center font-semibold text-sm ${
                          selectedRole === "customer"
                            ? "text-primary"
                            : "text-light-300"
                        }`}
                      >
                        Customer
                      </Text>
                      <Text
                        className={`text-center text-xs mt-1 ${
                          selectedRole === "customer"
                            ? "text-primary/70"
                            : "text-light-400"
                        }`}
                      >
                        Request deliveries
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSelectedRole("rider")}
                      className={`flex-1 py-1.5 rounded-xl ${
                        selectedRole === "rider" ? "bg-accent" : ""
                      }`}
                    >
                      <Text
                        className={`text-center font-semibold text-sm ${
                          selectedRole === "rider"
                            ? "text-primary"
                            : "text-light-300"
                        }`}
                      >
                        Rider
                      </Text>
                      <Text
                        className={`text-center text-xs mt-1 ${
                          selectedRole === "rider"
                            ? "text-primary/70"
                            : "text-light-400"
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
                <View className="mb-2 px-2 py-1 rounded-xl">
                  <Text className="text-sm font-medium text-light-200">
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
                    className="flex-1 px-4 py-4 text-light-100"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="mb-4">
                <View className="mb-2 px-2 py-1 rounded-xl">
                  <Text className="text-sm font-medium text-light-200">
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
                    className="flex-1 px-4 py-4 text-light-100"
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
                    <Text className="ml-3 text-xs text-light-300">
                      {passwordStrength
                        ? passwordStrength.toUpperCase()
                        : "WEAK"}
                    </Text>
                  </View>
                  <Text className="text-xs mt-2 text-light-400">
                    Use at least 8 characters with a mix of upper, lower,
                    numbers, and symbols.
                  </Text>
                </View>
              )}

              {/* Confirm Password (Signup only) */}
              {mode === "signup" && (
                <View className="mb-6">
                  <View className="mb-2 px-2 py-1 rounded-xl">
                    <Text className="text-sm font-medium text-light-200">
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
                      className="flex-1 px-4 py-4 text-light-100"
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
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
                  <View className="mb-2 px-2 py-1 rounded-xl">
                    <Text className="text-sm font-medium text-light-200">
                      Vehicle Type
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      // Show vehicle type picker modal
                      setShowVehiclePicker(true);
                    }}
                    className="flex-row items-center justify-between rounded-xl px-4 py-3 border bg-dark-100 border-neutral-100"
                  >
                    <Text
                      className={`flex-1 ${
                        vehicleType ? "text-light-100" : "text-light-400"
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
                      color="#9CA4AB"
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
                const disabled =
                  isLoading || signupMismatch || riderNeedsVehicle;
                return (
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={disabled}
                    className={`rounded-xl py-4 mb-4 flex-row items-center justify-center ${
                      disabled ? "bg-accent/50" : "bg-accent"
                    }`}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#030014" size="small" />
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
                            color="#030014"
                          />
                        </View>
                        <Text className="font-bold text-base text-primary">
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
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-secondary"
              style={{ paddingBottom: insets.bottom }}
            >
              <View className="px-6 pt-4 pb-2">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-xl font-bold text-light-100">
                    Select Vehicle Type
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowVehiclePicker(false)}
                    className="p-2"
                  >
                    <Icons.action
                      name={IconNames.close as any}
                      size={24}
                      color="#9CA4AB"
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
                          ? "bg-accent/20 border-accent"
                          : "bg-dark-100 border-neutral-100"
                      }`}
                    >
                      <View
                        className={`mr-4 p-2 rounded-lg ${
                          vehicleType === type.value
                            ? "bg-accent/30"
                            : "bg-dark-100"
                        }`}
                      >
                        <Icons.motorcycle
                          name={type.icon as any}
                          size={24}
                          color={
                            vehicleType === type.value ? "#AB8BFF" : "#9CA4AB"
                          }
                        />
                      </View>
                      <Text
                        className={`flex-1 text-base font-semibold ${
                          vehicleType === type.value
                            ? "text-accent"
                            : "text-light-100"
                        }`}
                      >
                        {type.label}
                      </Text>
                      {vehicleType === type.value && (
                        <Icons.status
                          name={IconNames.checkmarkCircle as any}
                          size={24}
                          color="#AB8BFF"
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
    </Reanimated.View>
  );
}
