import { IconNames, Icons } from "@/constants/icons";
import { Routes } from "@/services/navigationHelper";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const getEmergencyContacts = () => {
  // 9th Waka Support
  const ninthwakaPhone =
    Constants.expoConfig?.extra?.ninthwakaSupportPhone ||
    process.env.EXPO_PUBLIC_NINTHWAKA_SUPPORT_PHONE ||
    "+2348107843355";

  const ninthwakaWhatsapp =
    Constants.expoConfig?.extra?.ninthwakaWhatsapp ||
    process.env.EXPO_PUBLIC_NINTHWAKA_WHATSAPP ||
    "2348108663443";

  const lasemaPrimary =
    Constants.expoConfig?.extra?.lasemaPrimary ||
    process.env.EXPO_PUBLIC_LASEMA_PRIMARY ||
    "112";

  const lasemaSecondary =
    Constants.expoConfig?.extra?.lasemaSecondary ||
    process.env.EXPO_PUBLIC_LASEMA_SECONDARY ||
    "767";

  const lasemaPhone1 =
    Constants.expoConfig?.extra?.lasemaPhone1 ||
    process.env.EXPO_PUBLIC_LASEMA_PHONE1 ||
    "+2348022887777";

  const lasemaPhone2 =
    Constants.expoConfig?.extra?.lasemaPhone2 ||
    process.env.EXPO_PUBLIC_LASEMA_PHONE2 ||
    "+2348022883678";

  return {
    ninthwaka: {
      name: "9th Waka Support",
      phone: ninthwakaPhone,
      whatsapp: ninthwakaWhatsapp,
    },
    lasema: {
      name: "Lagos State Emergency Management Agency (LASEMA)",
      description: "Coordinates emergency response across the state",
      numbers: [
        { label: "Emergency Line 1", phone: lasemaPrimary },
        { label: "Emergency Line 2", phone: lasemaSecondary },
        { label: "Phone Line 1", phone: lasemaPhone1 },
        { label: "Phone Line 2", phone: lasemaPhone2 },
      ],
    },
  };
};

export default function SOSScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const EMERGENCY_CONTACTS = getEmergencyContacts();

  const handleCall = async (phoneNumber: string, name: string) => {
    try {
      let formattedNumber = phoneNumber.trim();

      if (
        formattedNumber.length > 3 &&
        !formattedNumber.startsWith("+") &&
        !formattedNumber.startsWith("tel:")
      ) {
        if (formattedNumber.startsWith("0")) {
          formattedNumber = "+234" + formattedNumber.substring(1);
        } else if (!formattedNumber.startsWith("+")) {
          formattedNumber = "+234" + formattedNumber;
        }
      }

      const url = `tel:${formattedNumber}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Cannot make call",
          "Your device doesn't support making phone calls.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to make call. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const handleWhatsApp = async (phoneNumber: string) => {
    try {
      // Format: https://wa.me/2348123456789 (without + or 0)
      const url = `https://wa.me/${phoneNumber}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Cannot open WhatsApp",
          "Please make sure WhatsApp is installed on your device.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open WhatsApp. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  return (
    <View className="flex-1 bg-primary" style={{ paddingTop: insets.top + 12 }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Header */}
        <View className="px-6 pb-4 border-b border-neutral-100/40">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace(Routes.tabs.home as any);
                }
              }}
              className="w-9 h-9 rounded-full bg-dark-200 items-center justify-center"
            >
              <Icons.navigation
                name={IconNames.arrowBack as any}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <Text className="text-light-100 text-lg font-bold flex-1 text-center -ml-9">
              Emergency SOS
            </Text>

            <View className="w-9 h-9" />
          </View>
        </View>

        <View className="px-6 pt-6">
          {/* Warning Banner */}
          <View className="bg-danger/20 border border-danger rounded-2xl p-5 mb-6">
            <View className="flex-row items-center mb-2">
              <Icons.safety
                name={IconNames.alert as any}
                size={24}
                color="#FF3B30"
              />
              <Text className="text-danger font-bold text-lg ml-2">
                Emergency Assistance
              </Text>
            </View>
            <Text className="text-light-200 text-sm">
              Use these contacts in case of emergency. For immediate help, call
              the numbers below directly.
            </Text>
          </View>

          {/* 9th Waka Support */}
          <View className="mb-6">
            <Text className="text-light-200 text-base font-semibold mb-3">
              9th Waka Support
            </Text>
            <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-light-100 font-semibold text-base mb-1">
                    {EMERGENCY_CONTACTS.ninthwaka.name}
                  </Text>
                  <Text className="text-light-300 text-sm">
                    {EMERGENCY_CONTACTS.ninthwaka.phone}
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() =>
                    handleCall(
                      EMERGENCY_CONTACTS.ninthwaka.phone,
                      EMERGENCY_CONTACTS.ninthwaka.name
                    )
                  }
                  className="flex-1 bg-danger rounded-xl py-4 px-4 flex-row items-center justify-center"
                >
                  <Icons.call
                    name={IconNames.call as any}
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-light-100 font-bold text-base">
                    Call Now
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    handleWhatsApp(EMERGENCY_CONTACTS.ninthwaka.whatsapp)
                  }
                  className="flex-1 bg-success rounded-xl py-4 px-4 flex-row items-center justify-center"
                >
                  <Text className="text-light-100 font-bold text-lg mr-2">
                    💬
                  </Text>
                  <Text className="text-light-100 font-bold text-base">
                    WhatsApp
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* LASEMA - Lagos State Emergency Management Agency */}
          <View className="mb-6">
            <Text className="text-light-200 text-base font-semibold mb-3">
              Lagos State Emergency Services
            </Text>

            <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
              <View className="mb-4">
                <Text className="text-light-100 font-semibold text-base mb-1">
                  {EMERGENCY_CONTACTS.lasema.name}
                </Text>
                <Text className="text-light-400 text-xs mb-2">
                  {EMERGENCY_CONTACTS.lasema.description}
                </Text>
                <Text className="text-light-300 text-sm">
                  Available Numbers:{" "}
                  {EMERGENCY_CONTACTS.lasema.numbers
                    .map((n) => n.phone)
                    .join(", ")}
                </Text>
              </View>

              {/* LASEMA Emergency Numbers */}
              <View className="gap-3">
                {EMERGENCY_CONTACTS.lasema.numbers.map((number, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() =>
                      handleCall(number.phone, EMERGENCY_CONTACTS.lasema.name)
                    }
                    className="bg-accent rounded-xl py-3 px-4 flex-row items-center justify-between"
                  >
                    <View className="flex-1">
                      <Text className="text-primary font-semibold text-sm mb-1">
                        {number.label}
                      </Text>
                      <Text className="text-primary/80 text-xs">
                        {number.phone}
                      </Text>
                    </View>
                    <Icons.call
                      name={IconNames.call as any}
                      size={20}
                      color="#030014"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Safety Tips */}
          <View className="bg-dark-100 rounded-2xl p-5 border border-neutral-100">
            <Text className="text-light-100 font-semibold text-base mb-3">
              Safety Tips
            </Text>
            <View className="gap-2">
              <Text className="text-light-300 text-sm">
                • Stay calm and provide clear information about your location
              </Text>
              <Text className="text-light-300 text-sm">
                • Share your exact address or landmarks nearby
              </Text>
              <Text className="text-light-300 text-sm">
                • Keep your phone charged and accessible
              </Text>
              <Text className="text-light-300 text-sm">
                • If unable to speak, send a message via WhatsApp
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
