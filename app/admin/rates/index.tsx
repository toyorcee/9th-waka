import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
    getSettings,
    SystemSettings,
    updateSettings,
} from "@/services/adminApi";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function AdminRatesScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<SystemSettings>>({});

  const loadSettings = useCallback(async () => {
    if (!user || user.role !== "admin") return;
    setLoading(true);
    try {
      const response = await getSettings();
      setSettings(response.settings);
      setFormData(response.settings);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load settings",
        text2: error?.message || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role === "admin" && !authLoading) {
      loadSettings();
    }
  }, [user, authLoading, loadSettings]);

  const handleSave = async () => {
    if (!user || user.role !== "admin") return;

    Alert.alert(
      "Confirm Changes",
      "Are you sure you want to update the delivery rates? This will affect all future orders.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async () => {
            setSaving(true);
            try {
              const response = await updateSettings(formData);
              setSettings(response.settings);
              Toast.show({
                type: "success",
                text1: "Settings Updated",
                text2:
                  response.message || "Rates have been updated successfully",
              });
            } catch (error: any) {
              Toast.show({
                type: "error",
                text1: "Failed to update settings",
                text2: error?.message || "Please try again",
              });
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const updateFormData = (path: string, value: number | boolean) => {
    const keys = path.split(".");
    setFormData((prev) => {
      const newData = { ...prev };
      let current: any = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  if (authLoading || loading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-black" : "bg-white"
        }`}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? "#AB8BFF" : "#1E3A8A"}
        />
      </View>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        className={`flex-1 items-center justify-center px-6 ${
          isDark ? "bg-black" : "bg-white"
        }`}
      >
        <Text
          className={`text-xl font-bold mt-4 ${
            isDark ? "text-light-100" : "text-gray-900"
          }`}
        >
          Admin Access Required
        </Text>
      </SafeAreaView>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <SafeAreaView
      edges={["bottom"]}
      className={`flex-1 ${isDark ? "bg-black" : "bg-white"}`}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 24,
          paddingBottom: 32,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Base Pricing */}
        <Reanimated.View entering={FadeInDown.delay(100)}>
          <View
            className={`rounded-2xl p-6 mb-6 ${
              isDark ? "bg-secondary" : "bg-white"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text
              className={`text-xl font-bold mb-4 ${
                isDark ? "text-light-100" : "text-gray-900"
              }`}
            >
              Base Pricing
            </Text>

            <View className="mb-4">
              <Text
                className={`text-sm font-semibold mb-2 ${
                  isDark ? "text-light-300" : "text-gray-700"
                }`}
              >
                Minimum Fare (₦)
              </Text>
              <TextInput
                className={`rounded-xl px-4 py-3 border ${
                  isDark
                    ? "bg-dark-100 border-neutral-100/30 text-light-100"
                    : "bg-gray-50 border-gray-300 text-gray-900"
                }`}
                value={String(
                  formData.pricing?.minFare ?? settings.pricing.minFare
                )}
                onChangeText={(text) =>
                  updateFormData("pricing.minFare", Number(text) || 0)
                }
                keyboardType="numeric"
                placeholder="800"
              />
            </View>

            <View className="mb-4">
              <Text
                className={`text-sm font-semibold mb-2 ${
                  isDark ? "text-light-300" : "text-gray-700"
                }`}
              >
                Short Distance Max (km)
              </Text>
              <TextInput
                className={`rounded-xl px-4 py-3 border ${
                  isDark
                    ? "bg-dark-100 border-neutral-100/30 text-light-100"
                    : "bg-gray-50 border-gray-300 text-gray-900"
                }`}
                value={String(
                  formData.pricing?.shortDistanceMax ??
                    settings.pricing.shortDistanceMax
                )}
                onChangeText={(text) =>
                  updateFormData("pricing.shortDistanceMax", Number(text) || 0)
                }
                keyboardType="numeric"
                placeholder="8"
              />
            </View>

            <View className="mb-4">
              <Text
                className={`text-sm font-semibold mb-2 ${
                  isDark ? "text-light-300" : "text-gray-700"
                }`}
              >
                Per KM - Short (₦/km, 0-
                {formData.pricing?.shortDistanceMax ??
                  settings.pricing.shortDistanceMax}
                km)
              </Text>
              <TextInput
                className={`rounded-xl px-4 py-3 border ${
                  isDark
                    ? "bg-dark-100 border-neutral-100/30 text-light-100"
                    : "bg-gray-50 border-gray-300 text-gray-900"
                }`}
                value={String(
                  formData.pricing?.perKmShort ?? settings.pricing.perKmShort
                )}
                onChangeText={(text) =>
                  updateFormData("pricing.perKmShort", Number(text) || 0)
                }
                keyboardType="numeric"
                placeholder="100"
              />
            </View>

            <View className="mb-4">
              <Text
                className={`text-sm font-semibold mb-2 ${
                  isDark ? "text-light-300" : "text-gray-700"
                }`}
              >
                Medium Distance Max (km)
              </Text>
              <TextInput
                className={`rounded-xl px-4 py-3 border ${
                  isDark
                    ? "bg-dark-100 border-neutral-100/30 text-light-100"
                    : "bg-gray-50 border-gray-300 text-gray-900"
                }`}
                value={String(
                  formData.pricing?.mediumDistanceMax ??
                    settings.pricing.mediumDistanceMax
                )}
                onChangeText={(text) =>
                  updateFormData("pricing.mediumDistanceMax", Number(text) || 0)
                }
                keyboardType="numeric"
                placeholder="15"
              />
            </View>

            <View className="mb-4">
              <Text
                className={`text-sm font-semibold mb-2 ${
                  isDark ? "text-light-300" : "text-gray-700"
                }`}
              >
                Per KM - Medium (₦/km,{" "}
                {formData.pricing?.shortDistanceMax ??
                  settings.pricing.shortDistanceMax + 1}
                -
                {formData.pricing?.mediumDistanceMax ??
                  settings.pricing.mediumDistanceMax}
                km)
              </Text>
              <TextInput
                className={`rounded-xl px-4 py-3 border ${
                  isDark
                    ? "bg-dark-100 border-neutral-100/30 text-light-100"
                    : "bg-gray-50 border-gray-300 text-gray-900"
                }`}
                value={String(
                  formData.pricing?.perKmMedium ?? settings.pricing.perKmMedium
                )}
                onChangeText={(text) =>
                  updateFormData("pricing.perKmMedium", Number(text) || 0)
                }
                keyboardType="numeric"
                placeholder="140"
              />
            </View>

            <View className="mb-4">
              <Text
                className={`text-sm font-semibold mb-2 ${
                  isDark ? "text-light-300" : "text-gray-700"
                }`}
              >
                Per KM - Long (₦/km,{" "}
                {formData.pricing?.mediumDistanceMax
                  ? formData.pricing.mediumDistanceMax + 1
                  : settings.pricing.mediumDistanceMax + 1}
                km+)
              </Text>
              <TextInput
                className={`rounded-xl px-4 py-3 border ${
                  isDark
                    ? "bg-dark-100 border-neutral-100/30 text-light-100"
                    : "bg-gray-50 border-gray-300 text-gray-900"
                }`}
                value={String(
                  formData.pricing?.perKmLong ?? settings.pricing.perKmLong
                )}
                onChangeText={(text) =>
                  updateFormData("pricing.perKmLong", Number(text) || 0)
                }
                keyboardType="numeric"
                placeholder="200"
              />
            </View>
          </View>
        </Reanimated.View>

        {/* Vehicle Multipliers */}
        <Reanimated.View entering={FadeInDown.delay(200)}>
          <View
            className={`rounded-2xl p-6 mb-6 ${
              isDark ? "bg-secondary" : "bg-white"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text
              className={`text-xl font-bold mb-4 ${
                isDark ? "text-light-100" : "text-gray-900"
              }`}
            >
              Vehicle Type Multipliers
            </Text>
            <Text
              className={`text-sm mb-4 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              Multipliers applied to base price based on vehicle type
            </Text>

            {["bicycle", "motorbike", "tricycle", "car", "van"].map(
              (vehicle) => (
                <View key={vehicle} className="mb-4">
                  <Text
                    className={`text-sm font-semibold mb-2 capitalize ${
                      isDark ? "text-light-300" : "text-gray-700"
                    }`}
                  >
                    {vehicle} Multiplier
                  </Text>
                  <TextInput
                    className={`rounded-xl px-4 py-3 border ${
                      isDark
                        ? "bg-dark-100 border-neutral-100/30 text-light-100"
                        : "bg-gray-50 border-gray-300 text-gray-900"
                    }`}
                    value={String(
                      formData.pricing?.vehicleMultipliers?.[
                        vehicle as keyof typeof settings.pricing.vehicleMultipliers
                      ] ??
                        settings.pricing.vehicleMultipliers[
                          vehicle as keyof typeof settings.pricing.vehicleMultipliers
                        ]
                    )}
                    onChangeText={(text) =>
                      updateFormData(
                        `pricing.vehicleMultipliers.${vehicle}`,
                        Number(text) || 0
                      )
                    }
                    keyboardType="numeric"
                    placeholder="1.0"
                  />
                </View>
              )
            )}
          </View>
        </Reanimated.View>

        {/* Commission Rate */}
        <Reanimated.View entering={FadeInDown.delay(300)}>
          <View
            className={`rounded-2xl p-6 mb-6 ${
              isDark ? "bg-secondary" : "bg-white"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text
              className={`text-xl font-bold mb-4 ${
                isDark ? "text-light-100" : "text-gray-900"
              }`}
            >
              Commission Rate
            </Text>
            <View className="mb-4">
              <Text
                className={`text-sm font-semibold mb-2 ${
                  isDark ? "text-light-300" : "text-gray-700"
                }`}
              >
                Commission Percentage (%)
              </Text>
              <TextInput
                className={`rounded-xl px-4 py-3 border ${
                  isDark
                    ? "bg-dark-100 border-neutral-100/30 text-light-100"
                    : "bg-gray-50 border-gray-300 text-gray-900"
                }`}
                value={String(
                  formData.commissionRate ?? settings.commissionRate
                )}
                onChangeText={(text) =>
                  updateFormData("commissionRate", Number(text) || 0)
                }
                keyboardType="numeric"
                placeholder="10"
              />
            </View>
          </View>
        </Reanimated.View>

        {/* System Settings */}
        <Reanimated.View entering={FadeInDown.delay(400)}>
          <View
            className={`rounded-2xl p-6 mb-6 ${
              isDark ? "bg-secondary" : "bg-white"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text
              className={`text-xl font-bold mb-4 ${
                isDark ? "text-light-100" : "text-gray-900"
              }`}
            >
              System Settings
            </Text>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text
                  className={`text-sm font-semibold mb-1 ${
                    isDark ? "text-light-300" : "text-gray-700"
                  }`}
                >
                  Use Database Rates
                </Text>
                <Text
                  className={`text-xs ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  When enabled, rates from database are used. When disabled,
                  environment variables are used.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  updateFormData(
                    "system.useDatabaseRates",
                    !(
                      formData.system?.useDatabaseRates ??
                      settings.system.useDatabaseRates
                    )
                  )
                }
                className={`ml-4 w-16 h-8 rounded-full ${
                  formData.system?.useDatabaseRates ??
                  settings.system.useDatabaseRates
                    ? isDark
                      ? "bg-accent"
                      : "bg-blue-600"
                    : isDark
                    ? "bg-dark-100"
                    : "bg-gray-300"
                }`}
              >
                <View
                  className={`w-7 h-7 rounded-full bg-white mt-0.5 ${
                    formData.system?.useDatabaseRates ??
                    settings.system.useDatabaseRates
                      ? "ml-8"
                      : "ml-0.5"
                  }`}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Reanimated.View>

        {/* Save Button */}
        <Reanimated.View entering={FadeInDown.delay(500)}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className={`rounded-2xl p-4 ${
              saving
                ? isDark
                  ? "bg-gray-700"
                  : "bg-gray-400"
                : isDark
                ? "bg-accent"
                : "bg-blue-600"
            }`}
            activeOpacity={0.7}
          >
            {saving ? (
              <View className="flex-row items-center justify-center">
                <ActivityIndicator
                  size="small"
                  color={isDark ? "#AB8BFF" : "#FFFFFF"}
                />
                <Text
                  className={`ml-2 text-lg font-bold ${
                    isDark ? "text-primary" : "text-white"
                  }`}
                >
                  Saving...
                </Text>
              </View>
            ) : (
              <Text
                className={`text-center text-lg font-bold ${
                  isDark ? "text-primary" : "text-white"
                }`}
              >
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </Reanimated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
