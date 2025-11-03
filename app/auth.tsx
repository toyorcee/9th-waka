import { IconNames, Icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useAuth } from "@/contexts/AuthContext";
import { navigationHelper } from "@/services/navigationHelper";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type AuthMode = "login" | "signup";

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"customer" | "rider">(
    "customer"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    // Validation
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        const pendingAction = await navigationHelper.getPendingAction();
        await navigationHelper.clearPendingAction();

        if (pendingAction === "request") {
          router.replace("/orders/new");
        } else if (pendingAction === "track") {
          router.replace("/(tabs)/track");
        } else if (pendingAction === "sos") {
          router.replace("/sos" as any);
        } else {
          router.replace("/(tabs)/home");
        }
      } else {
        await register(email, password, selectedRole);
        router.replace(`/verify?email=${encodeURIComponent(email)}`);
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || `${mode === "login" ? "Login" : "Signup"} failed`
      );
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
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
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
              Night Delivery • Safe • Fast
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
                  onChangeText={setPassword}
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

            {/* Confirm Password (Signup only) */}
            {mode === "signup" && (
              <View className="mb-6">
                <Text className="text-light-200 text-sm mb-2 font-medium">
                  Confirm Password
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
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
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
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              className="bg-accent rounded-xl py-4 mb-4 flex-row items-center justify-center"
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
