import { IconNames, Icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useAuth } from "@/contexts/AuthContext";
import { navigationHelper, Routes } from "@/services/navigationHelper";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

type AuthMode = "login" | "signup";

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"customer" | "rider">(
    "customer"
  );
  const [vehicleType, setVehicleType] = useState<"motorcycle" | "car" | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmMismatch, setConfirmMismatch] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<
    "weak" | "medium" | "strong" | null
  >(null);

  const { login, register } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

        if (pendingAction === "request") {
          router.replace(Routes.standalone.newOrder);
        } else if (pendingAction === "track") {
          router.replace(Routes.tabs.track);
        } else if (pendingAction === "sos") {
          router.replace(Routes.standalone.sos);
        } else {
          router.replace(Routes.tabs.home);
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

        router.replace(`/verify?email=${encodeURIComponent(email)}`);
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

  // Auto-switch to signup mode if user came from "Get Started"
  useEffect(() => {
    const checkPendingAction = async () => {
      const pendingAction = await navigationHelper.getPendingAction();
      if (pendingAction === "request") {
        setMode("signup"); // Switch to signup for new users from "Get Started"
      }
    };
    checkPendingAction();
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      {/* Toasts rendered globally in _layout.tsx */}
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
          <View className="absolute inset-0 bg-primary/10" />
        </View>

        <View className="flex-1 justify-center px-6 py-12">
          {/* Logo/Branding Section */}
          <View className="items-center mb-8">
            <Image
              source={images.logo}
              style={{ width: 100, height: 50 }}
              contentFit="contain"
              className="mb-3"
            />
            <Text className="text-light-200 text-base text-center">
              Modern Delivery • Safe • Fast
            </Text>
          </View>

          {/* Auth Card */}
          <View className="bg-secondary/95 rounded-3xl p-6 border border-neutral-100/50 backdrop-blur">
            {/* Mode Toggle */}
            <View className="flex-row bg-dark-100 rounded-2xl p-1 mb-6">
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
                <Text className="text-light-200 text-sm mb-3 font-medium">
                  I want to register as
                </Text>
                <View className="flex-row bg-dark-100 rounded-2xl p-1">
                  <TouchableOpacity
                    onPress={() => setSelectedRole("customer")}
                    className={`flex-1 py-3 rounded-xl ${
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
                    className={`flex-1 py-3 rounded-xl ${
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
              <Text className="text-light-200 text-sm mb-2 font-medium">
                Email
              </Text>
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
              <Text className="text-light-200 text-sm mb-2 font-medium">
                Password
              </Text>
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
                  <Text className="ml-3 text-light-300 text-xs">
                    {passwordStrength ? passwordStrength.toUpperCase() : "WEAK"}
                  </Text>
                </View>
                <Text className="text-light-400 text-xs mt-2">
                  Use at least 8 characters with a mix of upper, lower, numbers,
                  and symbols.
                </Text>
              </View>
            )}

            {/* Confirm Password (Signup only) */}
            {mode === "signup" && (
              <View className="mb-6">
                <Text className="text-light-200 text-sm mb-2 font-medium">
                  Confirm Password
                </Text>
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
                <Text className="text-light-200 text-sm mb-3 font-medium">
                  Vehicle Type
                </Text>
                <View className="flex-row bg-dark-100 rounded-2xl p-1">
                  <TouchableOpacity
                    onPress={() => setVehicleType("motorcycle")}
                    className={`flex-1 py-3 rounded-xl ${
                      vehicleType === "motorcycle" ? "bg-accent" : ""
                    }`}
                  >
                    <Text
                      className={`text-center font-semibold text-sm ${
                        vehicleType === "motorcycle"
                          ? "text-primary"
                          : "text-light-300"
                      }`}
                    >
                      Motorcycle
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setVehicleType("car")}
                    className={`flex-1 py-3 rounded-xl ${
                      vehicleType === "car" ? "bg-accent" : ""
                    }`}
                  >
                    <Text
                      className={`text-center font-semibold text-sm ${
                        vehicleType === "car"
                          ? "text-primary"
                          : "text-light-300"
                      }`}
                    >
                      Car
                    </Text>
                  </TouchableOpacity>
                </View>
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
                      <Text className="text-primary font-bold text-base">
                        {mode === "login" ? "Login" : "Create Account"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })()}

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
    </KeyboardAvoidingView>
  );
}
