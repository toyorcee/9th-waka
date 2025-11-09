import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { resendVerification, verifyEmailCode } from "@/services/authApi";
import { navigationHelper, Routes } from "@/services/navigationHelper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function VerifyScreen() {
  const router = useRouter();
  const { verifyEmail } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState((params.email as string) || "");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showResentModal, setShowResentModal] = useState(false);

  const handleVerify = async () => {
    if (!email || !code) {
      Toast.show({
        type: "error",
        text1: "Missing fields",
        text2: "Enter your email and 6-digit code",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await verifyEmailCode({ email, code });

      await verifyEmail(response.token, response.user);

      const pendingAction = await navigationHelper.getPendingAction();
      await navigationHelper.clearPendingAction();

      Toast.show({
        type: "success",
        text1: "Verified",
        text2: "Your account has been verified",
      });

      const user = response.user;

      if (!user.termsAccepted) {
        router.replace("/accept-terms");
        return;
      }

      if (user.role === "rider") {
        router.replace("/kyc-wizard");
        Toast.show({
          type: "info",
          text1: "Complete Your KYC",
          text2: "Verify your identity to start accepting deliveries",
        });
      } else {
        router.replace(
          `${Routes.standalone.profileEdit}?email=${encodeURIComponent(
            user.email
          )}`
        );
        Toast.show({
          type: "info",
          text1: "Complete Your Profile",
          text2: "Add your name and phone to complete your profile",
        });
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.error || e?.message || "Verification failed";
      Toast.show({ type: "error", text1: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      setIsResending(true);
      await resendVerification(email);
      setShowResentModal(true);
      Toast.show({
        type: "success",
        text1: "Code sent",
        text2: `We emailed a new code to ${email}`,
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.error || e?.message || "Failed to resend code";
      Toast.show({ type: "error", text1: msg });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className={`flex-1 p-6 ${isDark ? "bg-primary" : "bg-white"}`}
    >
      <View className="mt-24">
        <Text className={`text-3xl font-bold mb-2 ${isDark ? "text-light-100" : "text-black"}`}>
          Verify your email
        </Text>
        <Text className={`mb-6 ${isDark ? "text-light-300" : "text-gray-600"}`}>
          Enter the 6-digit code we sent to your email.
        </Text>

        <Text className={`text-xs mb-2 ${isDark ? "text-light-400" : "text-gray-500"}`}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          className={`rounded-xl p-4 mb-4 border ${isDark ? "bg-dark-100 text-light-100 border-neutral-100" : "bg-gray-100 text-black border-gray-200"}`}
          placeholder="you@example.com"
          placeholderTextColor="#9CA4AB"
        />

        <Text className={`text-xs mb-2 ${isDark ? "text-light-400" : "text-gray-500"}`}>Verification Code</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          className={`rounded-xl p-4 tracking-widest text-center text-2xl mb-6 border ${isDark ? "bg-dark-100 text-light-100 border-neutral-100" : "bg-gray-100 text-black border-gray-200"}`}
          placeholder="000000"
          placeholderTextColor="#9CA4AB"
        />

        <TouchableOpacity
          disabled={isLoading}
          onPress={handleVerify}
          className={`bg-accent rounded-xl py-4 items-center mb-3 ${
            isLoading ? "opacity-60" : ""
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-primary font-bold">Verify</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleResend}
          disabled={isResending}
          className={`rounded-xl py-4 items-center border border-neutral-100 ${
            isResending ? "opacity-60" : ""
          }`}
        >
          {isResending ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#9CA4AB" />
              <Text className={`font-semibold ${isDark ? "text-light-300" : "text-gray-600"}`}>Sending…</Text>
            </View>
          ) : (
            <Text className={`font-semibold ${isDark ? "text-light-200" : "text-black"}`}>Resend Code</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Branded success modal */}
      <Modal
        visible={showResentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResentModal(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-6">
          <View className={`w-full rounded-2xl p-6 border ${isDark ? "bg-primary border-neutral-100" : "bg-white border-gray-200"}`}>
            <View className="items-center mb-4">
              <View className="h-12 w-12 rounded-full bg-accent items-center justify-center mb-3">
                <Text className="text-primary font-extrabold text-lg">✓</Text>
              </View>
              <Text className={`text-xl font-bold mb-1 ${isDark ? "text-light-100" : "text-black"}`}>
                Code re-sent
              </Text>
              <Text className={`text-center ${isDark ? "text-light-300" : "text-gray-600"}`}>
                We emailed a fresh 6‑digit code to {email}. Enter it to verify
                your account.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowResentModal(false)}
              className="bg-accent rounded-xl py-3 items-center"
            >
              <Text className="text-primary font-bold">Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
