import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { useTheme } from "@/contexts/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, { FadeInDown, FadeInUp } from "react-native-reanimated";

const { width } = Dimensions.get("window");

const ONBOARDING_KEY = "@orders_onboarding_seen";

interface OrdersOnboardingProps {
  visible: boolean;
  onComplete: () => void;
}

const steps = [
  {
    iconFamily: "delivery" as const,
    iconName: MCIconNames.packageVariant,
    title: "What are Orders?",
    description:
      "Track all your delivery requests in one place. See order status, track deliveries in real-time, and manage your packages from pickup to delivery.",
  },
  {
    iconFamily: "action" as const,
    iconName: IconNames.search,
    title: "Filter & Search",
    description:
      "Use filters to view pending, active, completed, or cancelled orders. Search by order ID, items, or addresses to quickly find what you need.",
  },
  {
    iconFamily: "action" as const,
    iconName: IconNames.addCircle,
    title: "Create Orders",
    description:
      "Tap the '+' button to create a new delivery order. Enter pickup and dropoff locations, describe your package, and choose a vehicle type.",
  },
];

export default function OrdersOnboarding({
  visible,
  onComplete,
}: OrdersOnboardingProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [currentStep, setCurrentStep] = useState(0);
  const [slideAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      slideAnim.setValue(0);
    }
  }, [visible]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      Animated.timing(slideAnim, {
        toValue: -width * nextStep,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      handleComplete();
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    onComplete();
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    onComplete();
  };

  if (!visible) return null;

  return (
    <View
      className="absolute inset-0 z-50"
      style={{
        backgroundColor: isDark ? "#000000" : "#FFFFFF",
      }}
    >
      {/* Skip Button */}
      <TouchableOpacity
        onPress={handleSkip}
        className="absolute top-12 right-6 z-10"
        style={{ paddingTop: 40 }}
      >
        <Text
          className={`text-base font-semibold ${
            isDark ? "text-light-400" : "text-gray-600"
          }`}
        >
          Skip
        </Text>
      </TouchableOpacity>

      {/* Scrollable Content */}
      <Animated.View
        style={{
          flexDirection: "row",
          width: width * steps.length,
          transform: [{ translateX: slideAnim }],
        }}
      >
        {steps.map((step, index) => (
          <View
            key={index}
            style={{
              width,
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 32,
            }}
          >
            <Reanimated.View
              entering={FadeInUp.delay(100)}
              className="items-center"
            >
              {/* Icon Container */}
              <View
                className="rounded-full mb-8"
                style={{
                  width: 200,
                  height: 200,
                  backgroundColor: isDark
                    ? "rgba(171, 139, 255, 0.15)"
                    : "rgba(59, 130, 246, 0.1)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {step.iconFamily === "delivery" ? (
                  <Icons.delivery
                    name={step.iconName as any}
                    size={100}
                    color={isDark ? "#AB8BFF" : "#3B82F6"}
                  />
                ) : (
                  <Icons.action
                    name={step.iconName as any}
                    size={100}
                    color={isDark ? "#AB8BFF" : "#3B82F6"}
                  />
                )}
              </View>

              {/* Title */}
              <Reanimated.View entering={FadeInDown.delay(200)}>
                <Text
                  className={`text-3xl font-bold mb-4 text-center ${
                    isDark ? "text-light-100" : "text-gray-900"
                  }`}
                >
                  {step.title}
                </Text>
              </Reanimated.View>

              {/* Description */}
              <Reanimated.View entering={FadeInDown.delay(300)}>
                <Text
                  className={`text-base leading-6 text-center px-4 ${
                    isDark ? "text-light-400" : "text-gray-600"
                  }`}
                >
                  {step.description}
                </Text>
              </Reanimated.View>
            </Reanimated.View>
          </View>
        ))}
      </Animated.View>

      {/* Progress Dots */}
      <View className="absolute bottom-32 left-0 right-0 flex-row justify-center items-center">
        {steps.map((_, index) => (
          <View
            key={index}
            style={{
              width: index === currentStep ? 32 : 8,
              height: 8,
              borderRadius: 4,
              marginHorizontal: 6,
              backgroundColor:
                index === currentStep
                  ? isDark
                    ? "#AB8BFF" 
                    : "#1E3A8A" 
                  : isDark
                  ? "rgba(171, 139, 255, 0.3)" 
                  : "rgba(30, 58, 138, 0.3)", 
            }}
          />
        ))}
      </View>

      {/* Next/Get Started Button */}
      <View className="absolute bottom-12 left-0 right-0 px-6">
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.8}
          style={{
            backgroundColor: isDark ? "#AB8BFF" : "#1E3A8A", 
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            shadowColor: isDark ? "#AB8BFF" : "#1E3A8A",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontWeight: "bold",
              fontSize: 18,
            }}
          >
            {currentStep === steps.length - 1 ? "Get Started" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export async function hasSeenOrdersOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === "true";
  } catch {
    return false;
  }
}
