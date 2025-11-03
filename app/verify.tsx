import { resendVerification, verifyEmailCode } from "@/services/authApi";
import { navigationHelper } from "@/services/navigationHelper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState((params.email as string) || "");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (!email || !code) {
      Alert.alert("Error", "Please enter your email and verification code");
      return;
    }
    setIsLoading(true);
    try {
      await verifyEmailCode({ email, code });

      const pendingAction = await navigationHelper.getPendingAction();
      await navigationHelper.clearPendingAction();

      Alert.alert("Success", "Your account has been verified!", [
        {
          text: "Continue",
          onPress: () => {
            if (pendingAction === "request") {
              router.replace("/orders/new");
            } else if (pendingAction === "track") {
              router.replace("/(tabs)/track");
            } else if (pendingAction === "sos") {
              router.replace("/sos" as any);
            } else {
              router.replace("/(tabs)/home");
            }
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.error || e?.message || "Verification failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      await resendVerification(email);
      Alert.alert("Sent", "A new code has been sent to your email.");
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.error || e?.message || "Failed to resend code"
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-primary p-6"
    >
      <View className="mt-24">
        <Text className="text-light-100 text-3xl font-bold mb-2">
          Verify your email
        </Text>
        <Text className="text-light-300 mb-6">
          Enter the 6-digit code we sent to your email.
        </Text>

        <Text className="text-light-400 text-xs mb-2">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          className="bg-dark-100 rounded-xl p-4 text-light-100 mb-4 border border-neutral-100"
          placeholder="you@example.com"
          placeholderTextColor="#9CA4AB"
        />

        <Text className="text-light-400 text-xs mb-2">Verification Code</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          className="bg-dark-100 rounded-xl p-4 text-light-100 tracking-widest text-center text-2xl mb-6 border border-neutral-100"
          placeholder="000000"
          placeholderTextColor="#9CA4AB"
        />

        <TouchableOpacity
          disabled={isLoading}
          onPress={handleVerify}
          className="bg-accent rounded-xl py-4 items-center mb-3"
        >
          <Text className="text-primary font-bold">Verify</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleResend}
          className="rounded-xl py-4 items-center border border-neutral-100"
        >
          <Text className="text-light-200 font-semibold">Resend Code</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
