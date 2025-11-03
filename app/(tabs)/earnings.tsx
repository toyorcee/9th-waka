import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { IconNames, Icons, MCIconNames } from "@/constants/icons";

export default function EarningsScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-primary">
      <View className="pt-20 px-6 pb-8">
        <Text className="text-light-100 text-3xl font-bold mb-6">
          Earnings
        </Text>

        {/* Total Earnings */}
        <View className="bg-secondary rounded-2xl p-6 mb-6 border border-neutral-100">
          <Text className="text-light-300 text-sm mb-2">Total Earnings</Text>
          <Text className="text-accent text-4xl font-bold mb-4">₦0.00</Text>
          <View className="flex-row justify-between pt-4 border-t border-neutral-100">
            <View className="flex-1">
              <Text className="text-light-400 text-xs mb-1">This Week</Text>
              <Text className="text-light-200 font-semibold">₦0.00</Text>
            </View>
            <View className="flex-1">
              <Text className="text-light-400 text-xs mb-1">This Month</Text>
              <Text className="text-light-200 font-semibold">₦0.00</Text>
            </View>
          </View>
        </View>

        {/* Earnings Breakdown */}
        <View className="bg-secondary rounded-2xl p-5 mb-6 border border-neutral-100">
          <Text className="text-light-200 text-lg font-semibold mb-4">
            Earnings Breakdown
          </Text>
          
          <View className="gap-4">
            <View className="bg-dark-100 rounded-xl p-4 border border-neutral-100">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-light-200 font-medium">Completed Deliveries</Text>
                <Text className="text-accent font-bold">0</Text>
              </View>
              <Text className="text-light-400 text-xs">Total deliveries completed</Text>
            </View>

            <View className="bg-dark-100 rounded-xl p-4 border border-neutral-100">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-light-200 font-medium">Commission</Text>
                <Text className="text-accent font-bold">₦0.00</Text>
              </View>
              <Text className="text-light-400 text-xs">10-15% per delivery</Text>
            </View>

            <View className="bg-dark-100 rounded-xl p-4 border border-neutral-100">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-light-200 font-medium">Night Mode Bonus</Text>
                <Text className="text-accent font-bold">₦0.00</Text>
              </View>
              <Text className="text-light-400 text-xs">Bonus for deliveries after 9 PM</Text>
            </View>
          </View>
        </View>

        {/* Withdrawal */}
        <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
          <Text className="text-light-200 text-lg font-semibold mb-4">
            Wallet
          </Text>
          <View className="bg-dark-100 rounded-xl p-4 border border-neutral-100 mb-4">
            <Text className="text-light-400 text-xs mb-1">Available Balance</Text>
            <Text className="text-light-100 text-2xl font-bold">₦0.00</Text>
          </View>
          <View className="bg-accent rounded-xl p-4 items-center opacity-50">
            <Text className="text-primary font-bold">Withdraw Funds</Text>
            <Text className="text-primary text-xs mt-1">(Coming soon)</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}


