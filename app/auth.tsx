import { IconNames, Icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useAuth } from "@/contexts/AuthContext";
import { navigationHelper, Routes } from "@/services/navigationHelper";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
  Easing,
  SlideInLeft,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

type AuthMode = "login" | "signup";

export default function AuthScreen() {
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"customer" | "rider" | null>(
    null
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
  const [inputPositions, setInputPositions] = useState<{
    email?: number;
    password?: number;
    confirmPassword?: number;
    loginEmail?: number;
    loginPassword?: number;
  }>({});

  const vehicleTypes = [
    { value: "bicycle", label: "Bicycle", icon: "bicycle", backendValue: null }, // Not supported by backend
    {
      value: "motorbike",
      label: "Motorbike",
      icon: "motorbike",
      backendValue: "motorcycle",
    },
    {
      value: "tricycle",
      label: "Tricycle",
      icon: "rickshaw",
      backendValue: null,
    }, // Not supported by backend
    { value: "car", label: "Car", icon: "car-outline", backendValue: "car" },
    { value: "van", label: "Van", icon: "van-utility", backendValue: null }, // Not supported by backend
  ] as const;

  // Map frontend vehicle type to backend vehicle type
  const mapVehicleTypeToBackend = (
    frontendType: string
  ): "motorcycle" | "car" | undefined => {
    const vehicle = vehicleTypes.find((v) => v.value === frontendType);
    if (!vehicle || !vehicle.backendValue) return undefined;
    return vehicle.backendValue as "motorcycle" | "car";
  };

  const { login, register, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get("window").height;
  const screenWidth = Dimensions.get("window").width;

  const isRouterReady = router && typeof router.replace === "function";

  // Refs for scrolling to inputs
  const scrollViewRef = useRef<ScrollView>(null);
  const emailInputRef = useRef<View>(null);
  const passwordInputRef = useRef<View>(null);
  const confirmPasswordInputRef = useRef<View>(null);
  const loginEmailInputRef = useRef<View>(null);
  const loginPasswordInputRef = useRef<View>(null);

  // Sharp flip animation
  const translateX = useSharedValue(-screenWidth);
  const rotateY = useSharedValue(-90);
  const opacity = useSharedValue(0);
  const hasAnimatedRef = useRef(false);

  // Padlock animations
  const padlockRotateAnim = useRef(new Animated.Value(0)).current;
  const fireRotateAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const padlockScaleAnim = useRef(new Animated.Value(1)).current;

  // Button slide animations
  const loginButtonX = useRef(new Animated.Value(-screenWidth)).current;
  const signupButtonX = useRef(new Animated.Value(screenWidth)).current;

  useFocusEffect(
    useCallback(() => {
      if (!hasAnimatedRef.current) {
        // First time - run animation
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
        hasAnimatedRef.current = true;
      } else {
        // Subsequent visits - no animation, stay in place
        translateX.value = 0;
        rotateY.value = 0;
        opacity.value = 1;
      }
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
        if (!selectedRole) {
          Toast.show({ type: "error", text1: "Please select a role" });
          setIsLoading(false);
          return;
        }

        if (!selectedRole) {
          Toast.show({ type: "error", text1: "Please select a role" });
          setIsLoading(false);
          return;
        }

        if (selectedRole === "rider") {
          if (!vehicleType) {
            Toast.show({ type: "error", text1: "Select your vehicle" });
            setIsLoading(false);
            return;
          }
          const backendVehicleType = mapVehicleTypeToBackend(vehicleType);
          if (!backendVehicleType) {
            Toast.show({
              type: "error",
              text1: "Vehicle type not supported",
              text2: "Please select Motorcycle or Car",
            });
            setIsLoading(false);
            return;
          }
          await register(email, password, selectedRole, backendVehicleType);
        } else {
          await register(email, password, selectedRole, undefined);
        }

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
    if (showForm) {
      setShowForm(false);
      setCurrentStep(0);
      return;
    }
    if (!isRouterReady) {
      return;
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
      if (typeof router.replace === "function") {
        try {
          router.replace(Routes.tabs.home);
        } catch (e) {
          // Ignore navigation errors
        }
      }
    }
  }, [router, isRouterReady, showForm]);

  useEffect(() => {
    const checkPendingAction = async () => {
      const pendingAction = await navigationHelper.getPendingAction();
      if (pendingAction === "request") {
        setMode("signup");
        setShowForm(true);
        setCurrentStep(0);
      }
    };
    checkPendingAction();
  }, []);

  // Auto-advance when email is valid in signup mode
  useEffect(() => {
    if (
      mode === "signup" &&
      currentStep === 1 &&
      email &&
      email.includes("@") &&
      email.length > 3
    ) {
      const timer = setTimeout(() => {
        setCurrentStep(2);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [email, currentStep, mode]);

  // Auto-advance when passwords match in signup mode
  useEffect(() => {
    if (
      mode === "signup" &&
      currentStep === 2 &&
      password &&
      confirmPassword &&
      password === confirmPassword &&
      password.length >= 6
    ) {
      // Small delay to ensure UI updates smoothly
      const timer = setTimeout(() => {
        if (selectedRole === "rider") {
          setCurrentStep(3);
        } else {
          setCurrentStep(4);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [password, confirmPassword, currentStep, mode, selectedRole]);

  // Manual step navigation for signup wizard
  const handleNextStep = () => {
    if (mode === "signup") {
      if (currentStep === 0 && selectedRole) {
        setCurrentStep(1);
      } else if (currentStep === 1 && email && email.includes("@")) {
        setCurrentStep(2);
      } else if (
        currentStep === 2 &&
        password &&
        confirmPassword &&
        passwordsMatch &&
        password.length >= 6
      ) {
        if (
          selectedRole === "rider" &&
          (!vehicleType || !mapVehicleTypeToBackend(vehicleType))
        ) {
          setCurrentStep(3);
        } else {
          setCurrentStep(4);
        }
      } else if (
        currentStep === 3 &&
        vehicleType &&
        mapVehicleTypeToBackend(vehicleType)
      ) {
        setCurrentStep(4);
      }
    }
  };

  const handlePreviousStep = () => {
    if (mode === "signup" && currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNextStep = () => {
    if (mode === "signup") {
      if (currentStep === 0) return selectedRole !== null;
      if (currentStep === 1) return email && email.includes("@");
      if (currentStep === 2) {
        return (
          password && confirmPassword && passwordsMatch && password.length >= 6
        );
      }
      if (currentStep === 3) {
        return vehicleType && mapVehicleTypeToBackend(vehicleType);
      }
    }
    return false;
  };

  const handleModeSelect = (selectedMode: AuthMode) => {
    setMode(selectedMode);
    setShowForm(true);
    setCurrentStep(0);
  };

  // Handle Android back button - prevent navigation when unauthenticated
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // If showing form, allow going back to initial view
        if (showForm) {
          handleGoBack();
          return true;
        }
        // If on initial view and unauthenticated, prevent navigation
        if (!user) {
          return true; // Prevent default back behavior
        }
        // If authenticated, allow normal back navigation
        handleGoBack();
        return true;
      }
    );

    return () => backHandler.remove();
  }, [handleGoBack, showForm, user]);

  // Start padlock animations when initial view is shown
  useEffect(() => {
    if (!showForm) {
      // Continuous rotation for fire animation (subtle)
      const fireRotation = Animated.loop(
        Animated.timing(fireRotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      );
      fireRotation.start();

      // Simple pulsing scale animation for padlock
      const padlockPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(padlockScaleAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(padlockScaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      padlockPulse.start();

      // Button slide-in animations
      Animated.parallel([
        Animated.timing(loginButtonX, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(signupButtonX, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      // Shake animation after 3 seconds
      const shakeTimeout = setTimeout(() => {
        const shake = Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
        ]);
        shake.start();
      }, 3000);

      return () => {
        fireRotation.stop();
        padlockPulse.stop();
        clearTimeout(shakeTimeout);
        fireRotateAnim.setValue(0);
        shakeAnim.setValue(0);
        padlockScaleAnim.setValue(1);
        loginButtonX.setValue(-screenWidth);
        signupButtonX.setValue(screenWidth);
      };
    }
  }, [showForm]);

  // Initial view with background image and two buttons
  if (!showForm) {
    return (
      <Reanimated.View style={[{ flex: 1 }, animatedStyle]}>
        <View className="flex-1">
          {/* Background Image */}
          <View className="absolute inset-0">
            <Image
              source={images.homeHero}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
            <View className="absolute inset-0 bg-primary/10" />
          </View>

          <View
            className="flex-1 px-6"
            style={{
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            }}
          >
            {/* Padlock with Fire Animation - Centered */}
            <View className="flex-1 justify-center items-center">
              <View
                style={{
                  width: 120,
                  height: 120,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Fire Animation - Rotating (Subtle) */}
                <Animated.View
                  style={{
                    position: "absolute",
                    width: 120,
                    height: 120,
                    opacity: 0.4,
                    transform: [
                      {
                        rotate: fireRotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "360deg"],
                        }),
                      },
                    ],
                  }}
                >
                  {/* Fire particles around padlock */}
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 58,
                      width: 4,
                      height: 20,
                      backgroundColor: "#FF6B35",
                      borderRadius: 2,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 58,
                      width: 4,
                      height: 20,
                      backgroundColor: "#FF6B35",
                      borderRadius: 2,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 58,
                      width: 20,
                      height: 4,
                      backgroundColor: "#FF6B35",
                      borderRadius: 2,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 58,
                      width: 20,
                      height: 4,
                      backgroundColor: "#FF6B35",
                      borderRadius: 2,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 50,
                      width: 3,
                      height: 15,
                      backgroundColor: "#FF8C42",
                      borderRadius: 1.5,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      bottom: 10,
                      left: 50,
                      width: 3,
                      height: 15,
                      backgroundColor: "#FF8C42",
                      borderRadius: 1.5,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      left: 10,
                      top: 50,
                      width: 15,
                      height: 3,
                      backgroundColor: "#FF8C42",
                      borderRadius: 1.5,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      right: 10,
                      top: 50,
                      width: 15,
                      height: 3,
                      backgroundColor: "#FF8C42",
                      borderRadius: 1.5,
                    }}
                  />
                </Animated.View>

                {/* Padlock Icon - Pulsing and Shaking */}
                <Animated.View
                  style={{
                    transform: [
                      {
                        translateX: shakeAnim,
                      },
                      {
                        scale: padlockScaleAnim,
                      },
                    ],
                  }}
                >
                  <Icons.safety
                    name={IconNames.security as any}
                    size={50}
                    color="#AB8BFF"
                  />
                </Animated.View>
              </View>
            </View>

            {/* Two Buttons - Way Below, Sliding In */}
            <View className="pb-8 flex-row items-center justify-center gap-4">
              <Animated.View
                style={{
                  transform: [
                    {
                      translateX: loginButtonX,
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  onPress={() => handleModeSelect("login")}
                  className="flex-row items-center rounded-2xl px-6 py-4"
                  style={{
                    backgroundColor: "#AB8BFF",
                    shadowColor: "#AB8BFF",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  <Icons.action
                    name={IconNames.arrowForward as any}
                    size={24}
                    color="#030014"
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    className="font-bold text-primary"
                    style={{ fontSize: screenWidth * 0.04 }}
                  >
                    Login
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={{
                  transform: [
                    {
                      translateX: signupButtonX,
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  onPress={() => handleModeSelect("signup")}
                  className="flex-row items-center rounded-2xl px-6 py-4"
                  style={{
                    backgroundColor: "#AB8BFF",
                    shadowColor: "#AB8BFF",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  <Icons.action
                    name={IconNames.addCircle as any}
                    size={24}
                    color="#030014"
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    className="font-bold text-primary"
                    style={{ fontSize: screenWidth * 0.04 }}
                  >
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>
      </Reanimated.View>
    );
  }

  // Form view - simple page without background
  return (
    <Reanimated.View
      style={[
        {
          flex: 1,
          zIndex: 9999,
          elevation: 9999,
        },
        animatedStyle,
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        style={{ zIndex: 9999, elevation: 9999 }}
      >
        <View
          className={`flex-1 ${mode === "login" ? "bg-black" : "bg-black"}`}
          style={{
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            zIndex: 9999,
            elevation: 9999,
          }}
        >
          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: 40,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            style={{ zIndex: 9999, elevation: 9999 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Back Button */}
            <TouchableOpacity
              onPress={handleGoBack}
              className="mb-6"
              activeOpacity={0.7}
            >
              <Icons.navigation
                name={IconNames.arrowBack as any}
                size={24}
                color="#AB8BFF"
              />
            </TouchableOpacity>

            {/* Title */}
            <Reanimated.View entering={SlideInLeft.delay(0)} className="mb-8">
              <Text
                className="text-3xl font-bold text-light-100"
                style={{ fontSize: screenWidth * 0.07 }}
              >
                {mode === "login" ? "Welcome Back!" : "Get Started"}
              </Text>
              <Text
                className="text-base text-light-400 mt-2"
                style={{ fontSize: screenWidth * 0.035 }}
              >
                {mode === "login"
                  ? "Sign in to continue"
                  : "Create your account"}
              </Text>
            </Reanimated.View>

            {/* Login Form - Simple view, all fields at once */}
            {mode === "login" && (
              <>
                <View className="mb-4">
                  <Text className="text-sm font-medium text-light-200 mb-2">
                    Email
                  </Text>
                  <View
                    ref={loginEmailInputRef}
                    className="flex-row items-center bg-dark-100 rounded-xl border border-neutral-100/50 px-4"
                    onLayout={(event) => {
                      const { y } = event.nativeEvent.layout;
                      setInputPositions((prev) => ({ ...prev, loginEmail: y }));
                    }}
                  >
                    <Icons.communication
                      name={IconNames.messageOutline as any}
                      size={20}
                      color="#A8B5DB"
                      style={{ marginRight: 12 }}
                    />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => {
                        if (inputPositions.loginEmail !== undefined) {
                          scrollViewRef.current?.scrollTo({
                            y: inputPositions.loginEmail - 20,
                            animated: true,
                          });
                        }
                      }}
                      placeholder="Enter your email"
                      placeholderTextColor="#9CA4AB"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      className="flex-1 py-4 text-light-100"
                    />
                  </View>
                </View>

                <View className="mb-6">
                  <Text className="text-sm font-medium text-light-200 mb-2">
                    Password
                  </Text>
                  <View
                    ref={loginPasswordInputRef}
                    className="flex-row items-center bg-dark-100 rounded-xl border border-neutral-100/50 px-4"
                    onLayout={(event) => {
                      const { y } = event.nativeEvent.layout;
                      setInputPositions((prev) => ({
                        ...prev,
                        loginPassword: y,
                      }));
                    }}
                  >
                    <Icons.safety
                      name={IconNames.securityOutline as any}
                      size={20}
                      color="#A8B5DB"
                      style={{ marginRight: 12 }}
                    />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => {
                        if (inputPositions.loginPassword !== undefined) {
                          scrollViewRef.current?.scrollTo({
                            y: inputPositions.loginPassword - 20,
                            animated: true,
                          });
                        }
                      }}
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA4AB"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      className="flex-1 py-4 text-light-100"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
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

                <View>
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isLoading}
                    className={`rounded-xl py-4 items-center mb-4 ${
                      isLoading ? "bg-accent/60" : "bg-accent"
                    }`}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#030014" />
                    ) : (
                      <Text className="font-bold text-primary text-lg">
                        Login
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      if (isRouterReady && typeof router.push === "function") {
                        try {
                          router.push("/auth/forgot-password" as any);
                        } catch (e) {}
                      }
                    }}
                    className="py-2 items-center"
                  >
                    <Text className="text-light-300 text-sm">
                      Forgot password?{" "}
                      <Text className="text-accent font-semibold">
                        Reset it
                      </Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Signup Form - Wizard Style */}
            {mode === "signup" && (
              <>
                {/* Step 0: Role Selection */}
                {currentStep >= 0 && (
                  <Reanimated.View
                    entering={SlideInLeft.delay(0)}
                    className="mb-6"
                  >
                    <Text className="text-sm font-medium text-light-200 mb-3">
                      I want to register as
                    </Text>
                    <View className="flex-row gap-3 mb-4">
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedRole("customer");
                          setCurrentStep(1);
                        }}
                        className={`flex-1 rounded-xl p-4 border-2 ${
                          selectedRole === "customer"
                            ? "bg-accent/20 border-accent"
                            : "bg-dark-100 border-neutral-100"
                        }`}
                      >
                        <Text
                          className={`text-center font-semibold ${
                            selectedRole === "customer"
                              ? "text-accent"
                              : "text-light-300"
                          }`}
                        >
                          Customer
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedRole("rider");
                          setCurrentStep(1);
                        }}
                        className={`flex-1 rounded-xl p-4 border-2 ${
                          selectedRole === "rider"
                            ? "bg-accent/20 border-accent"
                            : "bg-dark-100 border-neutral-100"
                        }`}
                      >
                        <Text
                          className={`text-center font-semibold ${
                            selectedRole === "rider"
                              ? "text-accent"
                              : "text-light-300"
                          }`}
                        >
                          Rider
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Reanimated.View>
                )}

                {/* Step 1: Email */}
                {currentStep >= 1 && (
                  <Reanimated.View
                    entering={SlideInRight.delay(100)}
                    className="mb-6"
                  >
                    <Text className="text-sm font-medium text-light-200 mb-2">
                      Email
                    </Text>
                    <View
                      ref={emailInputRef}
                      className="flex-row items-center bg-dark-100 rounded-xl border border-neutral-100/50 px-4"
                      onLayout={(event) => {
                        const { y } = event.nativeEvent.layout;
                        setInputPositions((prev) => ({ ...prev, email: y }));
                        // Auto-scroll when step changes to show email input
                        if (currentStep === 1) {
                          setTimeout(() => {
                            scrollViewRef.current?.scrollTo({
                              y: y - 20,
                              animated: true,
                            });
                          }, 100);
                        }
                      }}
                    >
                      <Icons.communication
                        name={IconNames.messageOutline as any}
                        size={20}
                        color="#A8B5DB"
                        style={{ marginRight: 12 }}
                      />
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => {
                          if (inputPositions.email !== undefined) {
                            scrollViewRef.current?.scrollTo({
                              y: inputPositions.email - 20,
                              animated: true,
                            });
                          }
                        }}
                        placeholder="Enter your email"
                        placeholderTextColor="#9CA4AB"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        className="flex-1 py-4 text-light-100"
                      />
                    </View>
                  </Reanimated.View>
                )}

                {/* Step 2: Password */}
                {currentStep >= 2 && (
                  <>
                    <Reanimated.View
                      entering={SlideInLeft.delay(200)}
                      className="mb-4"
                    >
                      <Text className="text-sm font-medium text-light-200 mb-2">
                        Password
                      </Text>
                      <View
                        ref={passwordInputRef}
                        className="flex-row items-center bg-dark-100 rounded-xl border border-neutral-100/50 px-4"
                        onLayout={(event) => {
                          const { y } = event.nativeEvent.layout;
                          setInputPositions((prev) => ({
                            ...prev,
                            password: y,
                          }));
                          // Auto-scroll when step changes to show password input
                          if (currentStep === 2) {
                            setTimeout(() => {
                              scrollViewRef.current?.scrollTo({
                                y: y - 20,
                                animated: true,
                              });
                            }, 100);
                          }
                        }}
                      >
                        <Icons.safety
                          name={IconNames.securityOutline as any}
                          size={20}
                          color="#A8B5DB"
                          style={{ marginRight: 12 }}
                        />
                        <TextInput
                          value={password}
                          onChangeText={(v) => {
                            setPassword(v);
                            if (v.length > 0) {
                              setPasswordStrength(evaluatePassword(v));
                            } else {
                              setPasswordStrength(null);
                            }
                            // Check if passwords match in real-time
                            if (confirmPassword.length > 0) {
                              const matches = v === confirmPassword;
                              setConfirmMismatch(!matches);
                              setPasswordsMatch(matches);
                            } else {
                              setConfirmMismatch(false);
                              setPasswordsMatch(false);
                            }
                          }}
                          onFocus={() => {
                            if (inputPositions.password !== undefined) {
                              scrollViewRef.current?.scrollTo({
                                y: inputPositions.password - 20,
                                animated: true,
                              });
                            }
                          }}
                          placeholder="Enter your password"
                          placeholderTextColor="#9CA4AB"
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          className="flex-1 py-4 text-light-100"
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
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
                      {password.length > 0 && (
                        <View className="mt-2 flex-row items-center">
                          <View
                            className={`h-1.5 flex-1 rounded-full ${
                              passwordStrength === "strong"
                                ? "bg-green-500"
                                : passwordStrength === "medium"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                          />
                          <Text className="ml-2 text-xs text-light-300">
                            {passwordStrength
                              ? passwordStrength.toUpperCase()
                              : "WEAK"}
                          </Text>
                        </View>
                      )}
                    </Reanimated.View>

                    <Reanimated.View
                      entering={SlideInRight.delay(300)}
                      className="mb-6"
                    >
                      <Text className="text-sm font-medium text-light-200 mb-2">
                        Confirm Password
                      </Text>
                      <View
                        ref={confirmPasswordInputRef}
                        className={`flex-row items-center bg-dark-100 rounded-xl border px-4 ${
                          confirmMismatch
                            ? "border-red-500"
                            : passwordsMatch
                            ? "border-green-500"
                            : "border-neutral-100/50"
                        }`}
                        onLayout={(event) => {
                          const { y } = event.nativeEvent.layout;
                          setInputPositions((prev) => ({
                            ...prev,
                            confirmPassword: y,
                          }));
                          // Auto-scroll when confirm password appears
                          if (currentStep === 2 && password.length > 0) {
                            setTimeout(() => {
                              scrollViewRef.current?.scrollTo({
                                y: y - 20,
                                animated: true,
                              });
                            }, 100);
                          }
                        }}
                      >
                        <Icons.safety
                          name={IconNames.securityOutline as any}
                          size={20}
                          color="#A8B5DB"
                          style={{ marginRight: 12 }}
                        />
                        <TextInput
                          value={confirmPassword}
                          onChangeText={(v) => {
                            setConfirmPassword(v);
                            const matches = v.length > 0 && v === password;
                            setConfirmMismatch(v.length > 0 && !matches);
                            setPasswordsMatch(matches);
                          }}
                          onFocus={() => {
                            if (inputPositions.confirmPassword !== undefined) {
                              scrollViewRef.current?.scrollTo({
                                y: inputPositions.confirmPassword - 20,
                                animated: true,
                              });
                            }
                          }}
                          placeholder="Confirm your password"
                          placeholderTextColor="#9CA4AB"
                          secureTextEntry={!showConfirmPassword}
                          autoCapitalize="none"
                          className="flex-1 py-4 text-light-100"
                        />
                        <TouchableOpacity
                          onPress={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
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
                    </Reanimated.View>
                  </>
                )}

                {/* Step 3: Vehicle Type (Rider only) */}
                {currentStep >= 3 && selectedRole === "rider" && (
                  <Reanimated.View
                    entering={SlideInLeft.delay(400)}
                    className="mb-6"
                  >
                    <Text className="text-sm font-medium text-light-200 mb-2">
                      Vehicle Type <Text className="text-red-500">*</Text>
                    </Text>
                    <Text className="text-xs text-light-400 mb-3">
                      Select Motorcycle or Car (required for riders)
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowVehiclePicker(true)}
                      className={`flex-row items-center justify-between rounded-xl px-4 py-4 border ${
                        vehicleType && mapVehicleTypeToBackend(vehicleType)
                          ? "bg-dark-100 border-accent"
                          : "bg-dark-100 border-neutral-100"
                      }`}
                    >
                      <Text
                        className={`flex-1 ${
                          vehicleType ? "text-light-100" : "text-light-400"
                        }`}
                      >
                        {vehicleType
                          ? vehicleTypes.find((v) => v.value === vehicleType)
                              ?.label ||
                            vehicleType.charAt(0).toUpperCase() +
                              vehicleType.slice(1)
                          : "Select your vehicle type"}
                      </Text>
                      <Icons.action
                        name={IconNames.chevronDown as any}
                        size={20}
                        color={
                          vehicleType && mapVehicleTypeToBackend(vehicleType)
                            ? "#AB8BFF"
                            : "#9CA4AB"
                        }
                      />
                    </TouchableOpacity>
                    {vehicleType && !mapVehicleTypeToBackend(vehicleType) && (
                      <Text className="text-red-500 text-xs mt-2">
                        ⚠️ This vehicle type is not supported. Please select
                        Motorcycle or Car.
                      </Text>
                    )}
                  </Reanimated.View>
                )}

                {/* Step 4: Submit Button */}
                {currentStep >= 4 && (
                  <Reanimated.View entering={SlideInRight.delay(500)}>
                    {(() => {
                      const signupMismatch =
                        confirmPassword.length > 0 &&
                        confirmPassword !== password;
                      const riderNeedsVehicle =
                        selectedRole === "rider" &&
                        (!vehicleType || !mapVehicleTypeToBackend(vehicleType));
                      const disabled =
                        isLoading || signupMismatch || riderNeedsVehicle;

                      return (
                        <TouchableOpacity
                          onPress={handleSubmit}
                          disabled={disabled}
                          className={`rounded-xl py-4 items-center mb-4 ${
                            disabled ? "bg-accent/50" : "bg-accent"
                          }`}
                        >
                          {isLoading ? (
                            <ActivityIndicator color="#030014" />
                          ) : (
                            <Text className="font-bold text-primary text-lg">
                              Create Account
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })()}
                  </Reanimated.View>
                )}
              </>
            )}
          </ScrollView>
        </View>

        {/* Vehicle Type Picker Modal */}
        <Modal
          visible={showVehiclePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowVehiclePicker(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 10000,
              elevation: 10000,
            }}
            onPress={() => setShowVehiclePicker(false)}
          >
            <View
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-secondary"
              style={{
                paddingBottom: insets.bottom,
                zIndex: 10001,
                elevation: 10001,
              }}
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
                  {vehicleTypes
                    .filter((type) => type.backendValue !== null) // Only show supported types
                    .map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        onPress={() => {
                          setVehicleType(type.value);
                          setShowVehiclePicker(false);
                          setCurrentStep(4);
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
