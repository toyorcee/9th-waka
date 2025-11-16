import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { SocketEvents } from "@/constants/socketEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  EarningsData,
  getPaymentHistory,
  getRiderEarnings,
  markPayoutPaid,
  PayoutHistoryItem,
} from "@/services/riderApi";
import { socketClient } from "@/services/socketClient";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function EarningsScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProofUri, setPaymentProofUri] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PayoutHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchWeek, setSearchWeek] = useState("");
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(
    null
  );

  const isRider = user?.role === "rider";
  const tabBarHeight = 65;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 20;
  const contentBottomPadding = tabBarHeight + bottomPadding + 32;

  const loadEarnings = async (showRefreshing = false) => {
    if (!isRider) return;
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getRiderEarnings();
      setEarnings(data);
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load earnings",
        text2: e?.response?.data?.error || e?.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPaymentHistory = async () => {
    if (!isRider) return;
    setLoadingHistory(true);
    try {
      const data = await getPaymentHistory();
      setPaymentHistory(data.payouts || []);
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load payment history",
        text2: e?.response?.data?.error || e?.message,
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isRider) {
      loadEarnings();
    }
  }, [isRider]);

  useEffect(() => {
    if (!isRider) return;

    const handleDelivery = () => {
      loadEarnings();
    };

    const socket = socketClient.socketInstance;
    if (socket && socket.connected) {
      socket.on(SocketEvents.DELIVERY_VERIFIED, handleDelivery);
      return () => {
        socket.off(SocketEvents.DELIVERY_VERIFIED, handleDelivery);
      };
    }
  }, [isRider]);

  if (authLoading || loading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-primary" : "bg-white"
        }`}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? "#AB8BFF" : "#1E3A8A"}
        />
      </View>
    );
  }

  if (!isRider) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-primary" : "bg-white"
        }`}
      >
        <Text className={`${isDark ? "text-light-300" : "text-gray-600"}`}>
          Earnings available for riders only
        </Text>
      </View>
    );
  }

  if (!earnings) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-primary" : "bg-white"
        }`}
      >
        <Text className={`${isDark ? "text-light-300" : "text-gray-600"}`}>
          No earnings data
        </Text>
      </View>
    );
  }

  const { currentWeek, allTime, paymentStatus } = earnings;
  const weekStart = new Date(currentWeek.weekStart);
  const weekEnd = new Date(currentWeek.weekEnd);
  const paymentDueDate = new Date(currentWeek.paymentDueDate);
  const graceDeadline = new Date(currentWeek.graceDeadline);
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const isFriday = dayOfWeek === 5; // Friday = day before Saturday payment
  const isSaturday = dayOfWeek === 6; // Saturday = payment due day
  const isSunday = dayOfWeek === 0; // Sunday = grace period day
  const isPaymentDue = currentWeek.isPaymentDue || false;
  const isOverdue = currentWeek.isOverdue || false;
  const isInGracePeriod = currentWeek.isInGracePeriod || false;
  const daysUntilDue = currentWeek.daysUntilDue || 0;
  const daysUntilGraceDeadline = currentWeek.daysUntilGraceDeadline || 0;

  return (
    <>
      <ScrollView
        className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: contentBottomPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-6 px-5 pb-10">
          {/* Modern Header with Icon */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center flex-1">
              <View
                className={`rounded-xl p-2.5 mr-3 ${
                  isDark ? "bg-accent/20" : "bg-blue-900/20"
                }`}
              >
                <Icons.money
                  name={MCIconNames.cash as any}
                  size={22}
                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`text-xl font-bold mb-0.5 ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Earnings
                </Text>
                <Text
                  className={`text-xs ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Track your delivery income
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => loadEarnings(true)}
              disabled={refreshing}
              className={`border rounded-xl p-2.5 ${
                isDark
                  ? "bg-accent/20 border-accent/30"
                  : "bg-blue-900/20 border-blue-900/30"
              }`}
            >
              {refreshing ? (
                <ActivityIndicator
                  size="small"
                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                />
              ) : (
                <Icons.action
                  name={IconNames.refreshCircle as any}
                  size={22}
                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Account Deactivated Warning */}
          {paymentStatus.accountDeactivated && (
            <View
              className="bg-red-600/30 border border-red-600/60 rounded-3xl p-5 mb-6"
              style={{
                shadowColor: "#DC2626",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <View className="flex-row items-start">
                <View className="bg-red-600/40 rounded-2xl p-2.5 mr-3">
                  <Icons.action
                    name={IconNames.warning as any}
                    size={24}
                    color="#DC2626"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-red-600 font-bold text-xl mb-2">
                    🚫 Account Deactivated - 3 Strikes
                  </Text>
                  <Text
                    className={`text-sm leading-5 mb-3 ${
                      isDark ? "text-light-200" : "text-black"
                    }`}
                  >
                    Your account has been permanently deactivated after
                    receiving 3 strikes for late payment. You cannot access the
                    platform or accept orders until this issue is resolved.
                  </Text>
                  {paymentStatus.accountDeactivatedReason && (
                    <Text
                      className={`text-xs mb-3 ${
                        isDark ? "text-light-400" : "text-gray-600"
                      }`}
                    >
                      Reason: {paymentStatus.accountDeactivatedReason}
                    </Text>
                  )}
                  <View
                    className={`border rounded-xl p-3 mb-3 ${
                      isDark
                        ? "bg-red-600/10 border-red-600/30"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <Text
                      className={`text-xs leading-4 ${
                        isDark ? "text-light-300" : "text-gray-700"
                      }`}
                    >
                      <Text className="font-bold">Action Required:</Text> Please
                      contact support immediately to resolve this issue. Your
                      account will remain deactivated until all outstanding
                      payments are cleared and the issue is reviewed by our
                      team.
                    </Text>
                  </View>
                  <Text
                    className={`text-xs ${
                      isDark ? "text-light-400" : "text-gray-600"
                    }`}
                  >
                    Deactivated on:{" "}
                    {paymentStatus.accountDeactivatedAt
                      ? new Date(
                          paymentStatus.accountDeactivatedAt
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "N/A"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Strike Warning (1 or 2 strikes) */}
          {!paymentStatus.accountDeactivated &&
            paymentStatus.strikes > 0 &&
            paymentStatus.strikes < 3 && (
              <View
                className={`border rounded-3xl p-5 mb-6 ${
                  paymentStatus.strikes === 2
                    ? "bg-orange-500/20 border-orange-500/50"
                    : "bg-yellow-500/20 border-yellow-500/50"
                }`}
                style={{
                  shadowColor:
                    paymentStatus.strikes === 2 ? "#FF9500" : "#FFCC00",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <View className="flex-row items-start">
                  <View
                    className={`rounded-2xl p-2.5 mr-3 ${
                      paymentStatus.strikes === 2
                        ? "bg-orange-500/30"
                        : "bg-yellow-500/30"
                    }`}
                  >
                    <Icons.action
                      name={IconNames.warning as any}
                      size={24}
                      color={
                        paymentStatus.strikes === 2 ? "#FF9500" : "#FFCC00"
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`font-bold text-lg mb-2 ${
                        paymentStatus.strikes === 2
                          ? "text-orange-500"
                          : "text-yellow-500"
                      }`}
                    >
                      ⚠️ Strike {paymentStatus.strikes}/3 - Late Payment Warning
                    </Text>
                    <Text
                      className={`text-sm leading-5 mb-3 ${
                        isDark ? "text-light-200" : "text-black"
                      }`}
                    >
                      You have received {paymentStatus.strikes} strike
                      {paymentStatus.strikes !== 1 ? "s" : ""} for late payment.
                      {paymentStatus.strikes === 2
                        ? " One more strike will result in permanent account deactivation."
                        : " Please ensure timely payment to avoid additional strikes."}
                    </Text>
                    {paymentStatus.strikeHistory &&
                      paymentStatus.strikeHistory.length > 0 && (
                        <View
                          className={`border rounded-xl p-3 mb-3 ${
                            isDark
                              ? "bg-dark-100/50 border-neutral-100/30"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold mb-2 ${
                              isDark ? "text-light-300" : "text-gray-700"
                            }`}
                          >
                            Strike History:
                          </Text>
                          {paymentStatus.strikeHistory
                            .slice()
                            .reverse()
                            .slice(0, 3)
                            .map((strike, idx) => (
                              <View
                                key={idx}
                                className="flex-row items-start mb-2 last:mb-0"
                              >
                                <Text
                                  className={`text-xs ${
                                    isDark ? "text-light-400" : "text-gray-600"
                                  }`}
                                >
                                  <Text className="font-bold">
                                    Strike {strike.strikeNumber}:
                                  </Text>{" "}
                                  {new Date(strike.issuedAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )}{" "}
                                  - ₦{strike.commissionAmount.toLocaleString()}
                                </Text>
                              </View>
                            ))}
                        </View>
                      )}
                  </View>
                </View>
              </View>
            )}

          {/* Payment Blocked Warning */}
          {paymentStatus.isBlocked && !paymentStatus.accountDeactivated && (
            <View
              className="bg-red-500/20 border border-red-500/50 rounded-3xl p-5 mb-6"
              style={{
                shadowColor: "#FF3B30",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <View className="flex-row items-start">
                <View className="bg-red-500/30 rounded-2xl p-2.5 mr-3">
                  <Icons.action
                    name={IconNames.warning as any}
                    size={24}
                    color="#FF3B30"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-red-500 font-bold text-lg mb-2">
                    Account Blocked - Payment Overdue
                  </Text>
                  <Text
                    className={`text-sm leading-5 mb-3 ${
                      isDark ? "text-light-200" : "text-black"
                    }`}
                  >
                    Your account has been blocked due to overdue commission
                    payment. You cannot go online or accept new orders until
                    payment is resolved.
                    {paymentStatus.strikes > 0 && (
                      <Text className="font-semibold">
                        {" "}
                        You currently have {paymentStatus.strikes} strike
                        {paymentStatus.strikes !== 1 ? "s" : ""}.
                        {paymentStatus.strikes === 2
                          ? " One more strike will result in account deactivation."
                          : ""}
                      </Text>
                    )}
                  </Text>
                  {paymentStatus.blockedReason && (
                    <Text
                      className={`text-xs mb-3 ${
                        isDark ? "text-light-400" : "text-gray-600"
                      }`}
                    >
                      Reason: {paymentStatus.blockedReason}
                    </Text>
                  )}
                  <View
                    className={`border rounded-xl p-3 mb-3 ${
                      isDark
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <Text
                      className={`text-xs leading-4 ${
                        isDark ? "text-light-300" : "text-gray-700"
                      }`}
                    >
                      <Text className="font-bold">Legal Notice:</Text> Under
                      Nigerian Contract Law, failure to fulfill contractual
                      obligations (including commission payments) constitutes a
                      breach of contract. This may result in civil legal action,
                      contract termination, and potential claims for damages
                      under the Nigerian Contract Act and common law principles.
                    </Text>
                  </View>
                  <Text
                    className={`text-xs ${
                      isDark ? "text-light-400" : "text-gray-600"
                    }`}
                  >
                    Please contact support immediately to resolve this issue.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Payment Overdue Warning */}
          {!paymentStatus.isBlocked &&
            isOverdue &&
            currentWeek.totals.commission > 0 && (
              <View
                className="bg-orange-500/20 border border-orange-500/50 rounded-3xl p-5 mb-6"
                style={{
                  shadowColor: "#FF9500",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <View className="flex-row items-start">
                  <View className="bg-orange-500/30 rounded-2xl p-2.5 mr-3">
                    <Icons.action
                      name={IconNames.warning as any}
                      size={24}
                      color="#FF9500"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-orange-500 font-bold text-lg mb-2">
                      Payment Overdue
                    </Text>
                    <Text
                      className={`text-sm leading-5 mb-3 ${
                        isDark ? "text-light-200" : "text-black"
                      }`}
                    >
                      Your commission payment of ₦
                      {currentWeek.totals.commission.toLocaleString()} was due
                      on {paymentDueDate.toLocaleDateString()} (grace period
                      ended {graceDeadline.toLocaleDateString()}). Please make
                      payment immediately to avoid account suspension.
                    </Text>
                    <View
                      className={`border rounded-xl p-3 ${
                        isDark
                          ? "bg-orange-500/10 border-orange-500/30"
                          : "bg-orange-50 border-orange-200"
                      }`}
                    >
                      <Text
                        className={`text-xs leading-4 ${
                          isDark ? "text-light-300" : "text-gray-700"
                        }`}
                      >
                        <Text className="font-bold">Warning:</Text> Failure to
                        pay may result in account suspension and legal action
                        under Nigerian Contract Law for breach of contract.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

          {/* Saturday Payment Due Reminder */}
          {!paymentStatus.isBlocked &&
            !isOverdue &&
            !isInGracePeriod &&
            isSaturday &&
            currentWeek.totals.commission > 0 && (
              <View
                className="bg-warning/20 border border-warning/30 rounded-3xl p-5 mb-6"
                style={{
                  shadowColor: "#FF9500",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <View className="flex-row items-start">
                  <View className="bg-warning/30 rounded-2xl p-2.5 mr-3">
                    <Icons.money
                      name={MCIconNames.cashMultiple as any}
                      size={24}
                      color="#FF9500"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-warning font-bold text-lg mb-1">
                      Payment Due Today!
                    </Text>
                    <Text
                      className={`text-sm leading-5 ${
                        isDark ? "text-light-200" : "text-black"
                      }`}
                    >
                      Your commission payment of ₦
                      {currentWeek.totals.commission.toLocaleString()} is due
                      TODAY (Saturday) by 11:59 PM. You have until Sunday 11:59
                      PM to make payment.
                    </Text>
                  </View>
                </View>
              </View>
            )}

          {/* Grace Period Warning (Sunday) */}
          {!paymentStatus.isBlocked &&
            !isOverdue &&
            isInGracePeriod &&
            isSunday &&
            currentWeek.totals.commission > 0 && (
              <View
                className="bg-yellow-500/20 border border-yellow-500/50 rounded-3xl p-5 mb-6"
                style={{
                  shadowColor: "#FFCC00",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <View className="flex-row items-start">
                  <View className="bg-yellow-500/30 rounded-2xl p-2.5 mr-3">
                    <Icons.action
                      name={IconNames.warning as any}
                      size={24}
                      color="#FFCC00"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-yellow-600 font-bold text-lg mb-2">
                      Final Reminder - Grace Period Ends Today
                    </Text>
                    <Text
                      className={`text-sm leading-5 mb-3 ${
                        isDark ? "text-light-200" : "text-black"
                      }`}
                    >
                      Your commission payment of ₦
                      {currentWeek.totals.commission.toLocaleString()} was due
                      yesterday (Saturday 11:59 PM). This is your final reminder
                      - payment must be made by TODAY (Sunday) 11:59 PM to avoid
                      account suspension.
                      {daysUntilGraceDeadline === 0 && (
                        <Text className="font-bold">
                          {" "}
                          Less than 24 hours remaining!
                        </Text>
                      )}
                      {daysUntilGraceDeadline > 0 && (
                        <Text className="font-semibold">
                          {" "}
                          {daysUntilGraceDeadline} day
                          {daysUntilGraceDeadline !== 1 ? "s" : ""} remaining in
                          grace period.
                        </Text>
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            )}

          {/* Friday Reminder */}
          {!paymentStatus.isBlocked &&
            !isOverdue &&
            !isInGracePeriod &&
            isFriday &&
            currentWeek.totals.commission > 0 && (
              <View
                className="bg-blue-500/20 border border-blue-500/50 rounded-3xl p-5 mb-6"
                style={{
                  shadowColor: "#5AC8FA",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <View className="flex-row items-start">
                  <View className="bg-blue-500/30 rounded-2xl p-2.5 mr-3">
                    <Icons.money
                      name={MCIconNames.cashMultiple as any}
                      size={24}
                      color="#5AC8FA"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-blue-600 font-bold text-lg mb-1">
                      Payment Reminder - Tomorrow
                    </Text>
                    <Text
                      className={`text-sm leading-5 ${
                        isDark ? "text-light-200" : "text-black"
                      }`}
                    >
                      Your commission payment of ₦
                      {currentWeek.totals.commission.toLocaleString()} is due
                      tomorrow (Saturday) by 11:59 PM. You have until Sunday
                      11:59 PM to make payment.
                    </Text>
                  </View>
                </View>
              </View>
            )}

          {/* Current Week Summary */}
          <View
            className={`border rounded-3xl p-6 mb-6 ${
              isDark
                ? "bg-secondary border-neutral-100"
                : "bg-white border-gray-200"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View
                className={`rounded-xl p-2 mr-3 ${
                  isDark ? "bg-accent/20" : "bg-blue-900/20"
                }`}
              >
                <Icons.time
                  name={IconNames.calendarOutline as any}
                  size={20}
                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`text-lg font-bold mb-1 ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  This Week
                </Text>
                <Text
                  className={`text-xs ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  {weekStart.toLocaleDateString()} -{" "}
                  {new Date(weekEnd.getTime() - 1).toLocaleDateString()}{" "}
                  (Sun-Sat)
                </Text>
              </View>
              {/* Commission Payment Status Button */}
              {currentWeek.totals.commission > 0 && (
                <TouchableOpacity
                  className={`rounded-xl px-4 py-2 flex-row items-center ${
                    currentWeek.payout?.status === "paid"
                      ? isDark
                        ? "bg-green-500/20"
                        : "bg-green-100"
                      : isOverdue
                      ? isDark
                        ? "bg-red-500/20"
                        : "bg-red-100"
                      : isInGracePeriod
                      ? isDark
                        ? "bg-yellow-500/20"
                        : "bg-yellow-100"
                      : isPaymentDue
                      ? isDark
                        ? "bg-red-500/20"
                        : "bg-red-100"
                      : isDark
                      ? "bg-yellow-500/20"
                      : "bg-yellow-100"
                  }`}
                  style={{
                    shadowColor:
                      currentWeek.payout?.status === "paid"
                        ? "#30D158"
                        : isOverdue
                        ? "#FF3B30"
                        : isInGracePeriod
                        ? "#FFCC00"
                        : isPaymentDue
                        ? "#FF3B30"
                        : "#FFCC00",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <View
                    className={`w-2 h-2 rounded-full mr-2 ${
                      currentWeek.payout?.status === "paid"
                        ? "bg-green-500"
                        : isOverdue
                        ? "bg-red-500"
                        : isInGracePeriod
                        ? "bg-yellow-500"
                        : isPaymentDue
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      currentWeek.payout?.status === "paid"
                        ? isDark
                          ? "text-green-400"
                          : "text-green-700"
                        : isOverdue
                        ? isDark
                          ? "text-red-400"
                          : "text-red-700"
                        : isInGracePeriod
                        ? isDark
                          ? "text-yellow-400"
                          : "text-yellow-700"
                        : isPaymentDue
                        ? isDark
                          ? "text-red-400"
                          : "text-red-700"
                        : isDark
                        ? "text-yellow-400"
                        : "text-yellow-700"
                    }`}
                  >
                    {currentWeek.payout?.status === "paid"
                      ? "Paid"
                      : isOverdue
                      ? "Overdue"
                      : isInGracePeriod
                      ? daysUntilGraceDeadline > 0
                        ? `Grace: ${daysUntilGraceDeadline}d left`
                        : "Grace: Today"
                      : isPaymentDue
                      ? "Due Now"
                      : daysUntilDue > 0
                      ? `Due in ${daysUntilDue}d`
                      : "Pending"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View className="bg-dark-100/50 rounded-2xl p-4 mb-4">
              <Text
                className={`text-xs mb-2 ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                Net Earnings
              </Text>
              <View className="flex-row items-center">
                <Icons.money
                  name={MCIconNames.cash as any}
                  size={28}
                  color="#30D158"
                  style={{ marginRight: 8 }}
                />
                <Text
                  className={`text-4xl font-bold ${
                    isDark ? "text-accent" : "text-blue-900"
                  }`}
                >
                  ₦{currentWeek.totals.riderNet.toLocaleString()}
                </Text>
              </View>
            </View>
            <View className="pt-4 border-t border-neutral-100">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center">
                  <Icons.delivery
                    name={MCIconNames.delivery as any}
                    size={16}
                    color="#5AC8FA"
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Total Trips
                  </Text>
                </View>
                <Text
                  className={`font-bold text-base ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  {currentWeek.totals.count}
                </Text>
              </View>
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center">
                  <Icons.money
                    name={MCIconNames.cashMultiple as any}
                    size={16}
                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Gross Earnings
                  </Text>
                </View>
                <Text
                  className={`font-semibold text-base ${
                    isDark ? "text-light-200" : "text-black"
                  }`}
                >
                  ₦{currentWeek.totals.gross.toLocaleString()}
                </Text>
              </View>
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center">
                  <Icons.money
                    name={MCIconNames.cash as any}
                    size={16}
                    color="#FF3B30"
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Commission (10%)
                  </Text>
                </View>
                <Text className="text-danger font-semibold text-base">
                  -₦{currentWeek.totals.commission.toLocaleString()}
                </Text>
              </View>
              <View className="flex-row justify-between items-center pt-3 border-t border-neutral-100 mt-2">
                <Text
                  className={`font-bold text-base ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Your Net
                </Text>
                <Text
                  className={`font-bold text-xl ${
                    isDark ? "text-accent" : "text-blue-900"
                  }`}
                >
                  ₦{currentWeek.totals.riderNet.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Remittance Section - Clear breakdown */}
            <View className="mt-4 pt-4 border-t border-neutral-100">
              <View className="flex-row items-center mb-3">
                <View
                  className={`rounded-xl p-2 mr-3 ${
                    isDark ? "bg-warning/20" : "bg-orange-100"
                  }`}
                >
                  <Icons.money
                    name={MCIconNames.cash as any}
                    size={18}
                    color="#FF9500"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-base font-bold mb-0.5 ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    Remittance to Admin
                  </Text>
                  <Text
                    className={`text-xs ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Total commission to be paid to platform
                  </Text>
                </View>
              </View>
              <View
                className={`rounded-2xl p-4 ${
                  isDark ? "bg-warning/10" : "bg-orange-50"
                }`}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-600"
                    }`}
                  >
                    Total Commission (10%)
                  </Text>
                  <Text
                    className={`font-bold text-lg ${
                      isDark ? "text-warning" : "text-orange-600"
                    }`}
                  >
                    ₦{currentWeek.totals.commission.toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`text-xs ${
                      isDark ? "text-light-500" : "text-gray-500"
                    }`}
                  >
                    From {currentWeek.totals.count} delivery
                    {currentWeek.totals.count !== 1 ? "s" : ""}
                  </Text>
                  <Text
                    className={`text-xs ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    {currentWeek.totals.count > 0
                      ? `₦${Math.round(
                          currentWeek.totals.commission /
                            currentWeek.totals.count
                        ).toLocaleString()} per delivery`
                      : "No deliveries"}
                  </Text>
                </View>
              </View>
              <View className="mt-3 p-3 rounded-xl bg-dark-100/30">
                <Text
                  className={`text-xs leading-4 ${
                    isDark ? "text-light-400" : "text-gray-600"
                  }`}
                >
                  <Text className="font-semibold">Note:</Text> This amount (₦
                  {currentWeek.totals.commission.toLocaleString()}) represents
                  the platform commission that you must pay to the admin. This
                  is deducted from your gross earnings of ₦
                  {currentWeek.totals.gross.toLocaleString()}, leaving you with
                  net earnings of ₦
                  {currentWeek.totals.riderNet.toLocaleString()}.
                </Text>
              </View>
            </View>

            {currentWeek.payout && (
              <View className="mt-4 pt-4 border-t border-neutral-100">
                <View className="flex-row items-center mb-2">
                  <Icons.status
                    name={
                      currentWeek.payout.status === "paid"
                        ? (IconNames.checkmarkCircle as any)
                        : (IconNames.timeOutline as any)
                    }
                    size={16}
                    color={
                      currentWeek.payout.status === "paid"
                        ? "#30D158"
                        : "#FF9500"
                    }
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    className={`text-xs ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Payout Status
                  </Text>
                </View>
                <Text
                  className={`font-bold text-base ${
                    currentWeek.payout.status === "paid"
                      ? "text-active"
                      : "text-warning"
                  }`}
                >
                  {currentWeek.payout.status === "paid"
                    ? "✓ Paid"
                    : "⏳ Pending"}
                </Text>
                {currentWeek.payout.status === "paid" && (
                  <View className="mt-2">
                    <Text
                      className={`text-xs ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
                      Commission Paid: ₦
                      {currentWeek.totals.commission.toLocaleString()}
                    </Text>
                    {currentWeek.payout.paidAt && (
                      <Text
                        className={`text-xs mt-0.5 ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        Paid on:{" "}
                        {new Date(currentWeek.payout.paidAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </Text>
                    )}
                    <Text
                      className={`text-xs mt-0.5 ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
                      Week: {weekStart.toLocaleDateString()} -{" "}
                      {new Date(weekEnd.getTime() - 1).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {/* "I have paid" button - only show if pending */}
                {currentWeek.payout.status === "pending" && (
                  <TouchableOpacity
                    onPress={() => setShowPaymentModal(true)}
                    className={`mt-4 rounded-2xl py-4 px-6 flex-row items-center justify-center ${
                      isDark ? "bg-accent" : "bg-blue-900"
                    }`}
                    style={{
                      shadowColor: isDark ? "#AB8BFF" : "#1E3A8A",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    <Icons.money
                      name={MCIconNames.cash as any}
                      size={20}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-white font-bold text-base">
                      I Have Paid
                    </Text>
                  </TouchableOpacity>
                )}

                {/* View Payment History Button */}
                <TouchableOpacity
                  onPress={() => {
                    setShowHistory(true);
                    loadPaymentHistory();
                  }}
                  className={`mt-3 rounded-xl py-3 px-4 flex-row items-center justify-center border ${
                    isDark
                      ? "bg-dark-100 border-accent/30"
                      : "bg-gray-50 border-blue-900/30"
                  }`}
                >
                  <Icons.action
                    name={IconNames.timeOutline as any}
                    size={16}
                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className={`text-sm font-semibold ${
                      isDark ? "text-accent" : "text-blue-900"
                    }`}
                  >
                    View Payment History
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* All-Time Stats */}
          <View
            className={`border rounded-3xl p-6 mb-6 ${
              isDark
                ? "bg-secondary border-neutral-100"
                : "bg-white border-gray-200"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center mb-5">
              <View className="bg-info/20 rounded-xl p-2 mr-3">
                <Icons.status
                  name={IconNames.starOutline as any}
                  size={20}
                  color="#5AC8FA"
                />
              </View>
              <Text className="text-light-100 text-xl font-bold">
                All-Time Stats
              </Text>
            </View>
            <View className="gap-4">
              <View className="flex-row items-center justify-between bg-dark-100/50 rounded-xl p-3">
                <View className="flex-row items-center">
                  <Icons.delivery
                    name={MCIconNames.delivery as any}
                    size={18}
                    color="#5AC8FA"
                    style={{ marginRight: 10 }}
                  />
                  <Text className="text-light-300 text-sm">
                    Total Deliveries
                  </Text>
                </View>
                <Text
                  className={`font-bold text-base ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  {allTime.totals.count}
                </Text>
              </View>
              <View className="flex-row items-center justify-between bg-dark-100/50 rounded-xl p-3">
                <View className="flex-row items-center">
                  <Icons.money
                    name={MCIconNames.cashMultiple as any}
                    size={18}
                    color="#30D158"
                    style={{ marginRight: 10 }}
                  />
                  <Text className="text-light-300 text-sm">Total Earnings</Text>
                </View>
                <Text
                  className={`font-bold text-base ${
                    isDark ? "text-accent" : "text-blue-900"
                  }`}
                >
                  ₦{allTime.totals.riderNet.toLocaleString()}
                </Text>
              </View>
              <View className="flex-row items-center justify-between bg-dark-100/50 rounded-xl p-3">
                <View className="flex-row items-center">
                  <Icons.money
                    name={MCIconNames.cash as any}
                    size={18}
                    color="#FF3B30"
                    style={{ marginRight: 10 }}
                  />
                  <Text className="text-light-300 text-sm">
                    Total Commission
                  </Text>
                </View>
                <Text className="text-light-400 font-semibold text-sm">
                  ₦{allTime.totals.commission.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Trip Breakdown */}
          <View
            className="bg-secondary border border-neutral-100 rounded-3xl p-6 mb-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center mb-5">
              <View
                className={`rounded-xl p-2 mr-3 ${
                  isDark ? "bg-accent/20" : "bg-blue-900/20"
                }`}
              >
                <Icons.package
                  name={MCIconNames.packageVariant as any}
                  size={20}
                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                />
              </View>
              <Text className="text-light-100 text-xl font-bold">
                This Week's Trips
              </Text>
              {currentWeek.trips.length > 0 && (
                <View
                  className={`rounded-full px-3 py-1 ml-3 ${
                    isDark ? "bg-accent/20" : "bg-blue-900/20"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isDark ? "text-accent" : "text-blue-900"
                    }`}
                  >
                    {currentWeek.trips.length}
                  </Text>
                </View>
              )}
            </View>
            {currentWeek.trips.length === 0 ? (
              <View className="items-center py-6">
                <View className="bg-dark-100 rounded-full p-4 mb-3">
                  <Icons.delivery
                    name={MCIconNames.delivery as any}
                    size={32}
                    color="#9CA4AB"
                  />
                </View>
                <Text className="text-light-400 text-sm text-center">
                  No deliveries this week yet
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {currentWeek.trips.map((trip) => (
                  <TouchableOpacity
                    key={trip.orderId}
                    onPress={() =>
                      router.push(`/orders/${trip.orderId}` as any)
                    }
                    className="bg-dark-100 rounded-2xl p-4 border border-neutral-100 active:opacity-80"
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1 mr-3">
                        <View className="flex-row items-center mb-2">
                          <Icons.location
                            name={IconNames.locationOutline as any}
                            size={14}
                            color="#5AC8FA"
                            style={{ marginRight: 6 }}
                          />
                          <Text className="text-light-200 font-semibold text-sm flex-1">
                            {trip.pickup} → {trip.dropoff}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Icons.time
                            name={IconNames.timeOutline as any}
                            size={12}
                            color="#9CA4AB"
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            className={`text-xs ${
                              isDark ? "text-light-400" : "text-gray-500"
                            }`}
                          >
                            {new Date(trip.deliveredAt).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                      <View
                        className={`border rounded-xl px-3 py-2 ${
                          isDark
                            ? "bg-accent/20 border-accent/30"
                            : "bg-blue-900/20 border-blue-900/30"
                        }`}
                      >
                        <Text
                          className={`font-bold text-base ${
                            isDark ? "text-accent" : "text-blue-900"
                          }`}
                        >
                          ₦{trip.riderNetAmount.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center justify-between pt-3 border-t border-neutral-100">
                      <View className="flex-row items-center">
                        <Icons.money
                          name={MCIconNames.cashMultiple as any}
                          size={14}
                          color={isDark ? "#AB8BFF" : "#1E3A8A"}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          className={`text-xs ${
                            isDark ? "text-light-400" : "text-gray-500"
                          }`}
                        >
                          Gross: ₦{trip.grossAmount.toLocaleString()}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Icons.money
                          name={MCIconNames.cash as any}
                          size={14}
                          color="#FF3B30"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-danger text-xs">
                          -₦{trip.commissionAmount.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        {/* Bottom spacer to prevent content from going under tab bar */}
        <View
          style={{ height: contentBottomPadding, backgroundColor: "#030014" }}
        />
      </ScrollView>

      {/* Payment Proof Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <View
            className={`rounded-t-3xl p-6 ${
              isDark ? "bg-secondary" : "bg-white"
            }`}
            style={{ paddingBottom: insets.bottom + 20 }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text
                className={`text-xl font-bold ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Mark Payment as Paid
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentModal(false);
                  setPaymentProofUri(null);
                }}
              >
                <Icons.navigation
                  name={IconNames.arrowBack as any}
                  size={24}
                  color={isDark ? "#9CA4AB" : "#6E6E73"}
                />
              </TouchableOpacity>
            </View>

            <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
              <Text className="text-red-400 text-xs font-semibold mb-1">
                ⚠️ Required
              </Text>
              <Text
                className={`text-xs ${
                  isDark ? "text-light-300" : "text-gray-600"
                }`}
              >
                A screenshot of your payment receipt is required as proof of
                payment.
              </Text>
            </View>

            {/* Payment Proof Preview */}
            {paymentProofUri && (
              <View className="mb-4">
                <Image
                  source={{ uri: paymentProofUri || "" }}
                  className="w-full h-64 rounded-2xl mb-2"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => setPaymentProofUri(null)}
                  className="items-center"
                >
                  <Text
                    className={`text-xs ${
                      isDark ? "text-red-400" : "text-red-600"
                    }`}
                  >
                    Remove Image
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Pick Image Button */}
            {!paymentProofUri && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const { status } =
                      await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== "granted") {
                      Toast.show({
                        type: "error",
                        text1: "Permission needed",
                        text2: "Please grant camera roll access",
                      });
                      return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [4, 3],
                      quality: 0.8,
                    });
                    if (!result.canceled && result.assets[0]) {
                      setPaymentProofUri(result.assets[0].uri);
                    }
                  } catch (e: any) {
                    Toast.show({
                      type: "error",
                      text1: "Failed to pick image",
                      text2: e?.message,
                    });
                  }
                }}
                className={`rounded-2xl py-4 px-6 items-center border-2 border-dashed ${
                  isDark
                    ? "bg-dark-100 border-accent/50"
                    : "bg-gray-50 border-blue-900/30"
                }`}
              >
                <Icons.action
                  name={IconNames.addCircle as any}
                  size={32}
                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                  style={{ marginBottom: 8 }}
                />
                <Text
                  className={`text-sm font-semibold ${
                    isDark ? "text-light-300" : "text-gray-700"
                  }`}
                >
                  Upload Payment Proof
                </Text>
                <Text
                  className={`text-xs mt-1 ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Tap to select screenshot
                </Text>
              </TouchableOpacity>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={async () => {
                if (!currentWeek.payout || !paymentProofUri) return;
                setMarkingPaid(true);
                try {
                  await markPayoutPaid(currentWeek.payout.id, paymentProofUri);
                  Toast.show({
                    type: "success",
                    text1: "Payment Marked as Paid",
                    text2: "Your payment has been recorded. Admin will verify.",
                  });
                  setShowPaymentModal(false);
                  setPaymentProofUri(null);
                  await loadEarnings();
                  // Refresh payment history if modal is open
                  if (showHistory) {
                    await loadPaymentHistory();
                  }
                } catch (e: any) {
                  Toast.show({
                    type: "error",
                    text1: "Failed to mark payment",
                    text2: e?.response?.data?.error || e?.message,
                  });
                } finally {
                  setMarkingPaid(false);
                }
              }}
              disabled={markingPaid || !paymentProofUri}
              className={`rounded-2xl py-4 px-6 items-center mt-4 ${
                markingPaid || !paymentProofUri
                  ? isDark
                    ? "bg-accent/50"
                    : "bg-blue-900/50"
                  : isDark
                  ? "bg-accent"
                  : "bg-blue-900"
              }`}
            >
              {markingPaid ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-base">
                  {paymentProofUri
                    ? "Confirm Payment"
                    : "Upload Screenshot First"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment History Modal */}
      <Modal
        visible={showHistory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistory(false)}
      >
        <View className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View
            className={`flex-1 mt-20 rounded-t-3xl ${
              isDark ? "bg-secondary" : "bg-white"
            }`}
            style={{ paddingTop: insets.top + 10 }}
          >
            {/* Header */}
            <View className="px-6 pb-4 border-b border-neutral-100/40">
              <View className="flex-row items-center justify-between mb-4">
                <Text
                  className={`text-2xl font-bold ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Payment History
                </Text>
                <TouchableOpacity
                  onPress={() => setShowHistory(false)}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    isDark ? "bg-dark-100" : "bg-gray-100"
                  }`}
                >
                  <Icons.navigation
                    name={IconNames.arrowBack as any}
                    size={20}
                    color={isDark ? "#9CA4AB" : "#6E6E73"}
                  />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View
                className={`rounded-xl px-4 py-3 flex-row items-center ${
                  isDark ? "bg-dark-100" : "bg-gray-100"
                }`}
              >
                <Icons.action
                  name={IconNames.searchOutline as any}
                  size={18}
                  color={isDark ? "#9CA4AB" : "#6E6E73"}
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  placeholder="Search by week (e.g., Jan 2024)"
                  placeholderTextColor={isDark ? "#9CA4AB" : "#6E6E73"}
                  value={searchWeek}
                  onChangeText={setSearchWeek}
                  className={`flex-1 ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                />
                {searchWeek.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchWeek("")}>
                    <Icons.navigation
                      name={IconNames.close as any}
                      size={18}
                      color={isDark ? "#9CA4AB" : "#6E6E73"}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Payment History List */}
            <ScrollView className="flex-1 px-6 pt-4">
              {loadingHistory ? (
                <View className="items-center justify-center py-20">
                  <ActivityIndicator
                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                    size="large"
                  />
                </View>
              ) : paymentHistory.length === 0 ? (
                <View className="items-center justify-center py-20">
                  <View
                    className={`rounded-full p-6 mb-4 ${
                      isDark ? "bg-accent/10" : "bg-blue-900/10"
                    }`}
                  >
                    <Icons.money
                      name={MCIconNames.cash as any}
                      size={32}
                      color={isDark ? "#AB8BFF" : "#1E3A8A"}
                    />
                  </View>
                  <Text
                    className={`text-base font-semibold mb-2 ${
                      isDark ? "text-light-200" : "text-gray-700"
                    }`}
                  >
                    No Payment History
                  </Text>
                  <Text
                    className={`text-sm text-center ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Your payment history will appear here once you make payments
                  </Text>
                </View>
              ) : (
                <View>
                  {/* Table Header */}
                  <View
                    className={`flex-row items-center py-3 px-4 mb-2 rounded-xl ${
                      isDark ? "bg-dark-100" : "bg-gray-100"
                    }`}
                  >
                    <View className="w-12 items-center">
                      <Text
                        className={`text-xs font-bold ${
                          isDark ? "text-light-400" : "text-gray-600"
                        }`}
                      >
                        Status
                      </Text>
                    </View>
                    <View className="flex-1 ml-2">
                      <Text
                        className={`text-xs font-bold ${
                          isDark ? "text-light-400" : "text-gray-600"
                        }`}
                      >
                        Week Period
                      </Text>
                    </View>
                    <View className="w-24 items-end">
                      <Text
                        className={`text-xs font-bold ${
                          isDark ? "text-light-400" : "text-gray-600"
                        }`}
                      >
                        Amount
                      </Text>
                    </View>
                  </View>

                  {/* Table Rows */}
                  {paymentHistory
                    .filter((payout) => {
                      if (!searchWeek) return true;
                      const weekStartStr = new Date(
                        payout.weekStart
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      });
                      return weekStartStr
                        .toLowerCase()
                        .includes(searchWeek.toLowerCase());
                    })
                    .sort((a, b) => {
                      // Sort by weekStart descending (most recent first)
                      return (
                        new Date(b.weekStart).getTime() -
                        new Date(a.weekStart).getTime()
                      );
                    })
                    .map((payout, index) => {
                      const payoutWeekStart = new Date(payout.weekStart);
                      const payoutWeekEnd = new Date(payout.weekEnd);
                      const isPaid = payout.status === "paid";
                      const isCurrentWeek =
                        earnings &&
                        new Date(earnings.currentWeek.weekStart).getTime() ===
                          payoutWeekStart.getTime();

                      return (
                        <TouchableOpacity
                          key={payout._id}
                          onPress={() => {
                            if (isPaid && payout.paymentProofScreenshot) {
                              setSelectedScreenshot(
                                payout.paymentProofScreenshot
                              );
                            }
                          }}
                          activeOpacity={
                            isPaid && payout.paymentProofScreenshot ? 0.7 : 1
                          }
                          className={`flex-row items-center py-4 px-4 mb-2 rounded-xl border ${
                            isCurrentWeek
                              ? isDark
                                ? "bg-accent/10 border-accent/50"
                                : "bg-blue-50 border-blue-900/50"
                              : isPaid
                              ? isDark
                                ? "bg-green-500/10 border-green-500/30"
                                : "bg-green-50 border-green-200"
                              : isDark
                              ? "bg-warning/10 border-warning/30"
                              : "bg-orange-50 border-orange-200"
                          }`}
                        >
                          {/* Status Column */}
                          <View className="w-12 items-center">
                            {isPaid ? (
                              <View
                                className={`w-8 h-8 rounded-full items-center justify-center ${
                                  isDark ? "bg-green-500/20" : "bg-green-100"
                                }`}
                              >
                                <Icons.action
                                  name={IconNames.checkmarkCircle as any}
                                  size={20}
                                  color="#30D158"
                                />
                              </View>
                            ) : (
                              <View
                                className={`w-8 h-8 rounded-full items-center justify-center ${
                                  isDark ? "bg-warning/20" : "bg-orange-100"
                                }`}
                              >
                                <Icons.status
                                  name={IconNames.timeOutline as any}
                                  size={18}
                                  color="#FF9500"
                                />
                              </View>
                            )}
                            {isCurrentWeek && (
                              <Text
                                className={`text-[8px] font-bold mt-1 ${
                                  isDark ? "text-accent" : "text-blue-900"
                                }`}
                              >
                                Current
                              </Text>
                            )}
                          </View>

                          {/* Week Period Column */}
                          <View className="flex-1 ml-2">
                            <Text
                              className={`text-sm font-semibold mb-1 ${
                                isDark ? "text-light-100" : "text-black"
                              }`}
                            >
                              {payoutWeekStart.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              -{" "}
                              {new Date(
                                payoutWeekEnd.getTime() - 1
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </Text>
                            {isPaid && payout.paidAt && (
                              <Text
                                className={`text-xs ${
                                  isDark ? "text-light-400" : "text-gray-500"
                                }`}
                              >
                                Paid:{" "}
                                {new Date(payout.paidAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </Text>
                            )}
                            {!isPaid && (
                              <Text
                                className={`text-xs ${
                                  isDark ? "text-warning" : "text-orange-600"
                                }`}
                              >
                                Payment pending
                              </Text>
                            )}
                          </View>

                          {/* Amount Column */}
                          <View className="w-24 items-end">
                            <Text
                              className={`text-sm font-bold ${
                                isDark ? "text-warning" : "text-orange-600"
                              }`}
                            >
                              ₦{payout.totals.commission.toLocaleString()}
                            </Text>
                            {payout.markedPaidBy === "rider" && (
                              <View className="flex-row items-center mt-1">
                                <Icons.action
                                  name={IconNames.checkmarkCircle as any}
                                  size={10}
                                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                                  style={{ marginRight: 2 }}
                                />
                                <Text
                                  className={`text-[9px] ${
                                    isDark ? "text-light-500" : "text-gray-500"
                                  }`}
                                >
                                  You
                                </Text>
                              </View>
                            )}
                            {isPaid && payout.paymentProofScreenshot && (
                              <View className="flex-row items-center mt-1">
                                <Icons.action
                                  name={IconNames.eye as any}
                                  size={10}
                                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                                  style={{ marginRight: 2 }}
                                />
                                <Text
                                  className={`text-[9px] ${
                                    isDark ? "text-accent" : "text-blue-900"
                                  }`}
                                >
                                  Tap to view proof
                                </Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment Proof Screenshot Modal */}
      <Modal
        visible={selectedScreenshot !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedScreenshot(null)}
      >
        <View
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
        >
          <TouchableOpacity
            onPress={() => setSelectedScreenshot(null)}
            className="absolute top-12 right-6 z-10"
          >
            <View
              className={`w-10 h-10 rounded-full items-center justify-center ${
                isDark ? "bg-dark-100" : "bg-white"
              }`}
            >
              <Icons.navigation
                name={IconNames.close as any}
                size={24}
                color={isDark ? "#9CA4AB" : "#6E6E73"}
              />
            </View>
          </TouchableOpacity>
          {selectedScreenshot && (
            <Image
              source={{
                uri: selectedScreenshot.startsWith("http")
                  ? selectedScreenshot
                  : `${
                      process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000"
                    }${selectedScreenshot}`,
              }}
              className="w-full h-3/4"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
}
