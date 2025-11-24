import KYCWizard from "@/components/KYCWizard";
import TabBarSpacer from "@/components/TabBarSpacer";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { updateProfile } from "@/services/userApi";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function KYCWizardScreen() {
  const { user, checkAuthStatus } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  const [nin, setNin] = useState(user?.nin || "");
  const [address, setAddress] = useState(user?.address || "");
  const [driverLicenseNumber, setDriverLicenseNumber] = useState(
    user?.driverLicenseNumber || ""
  );
  const [driverLicensePicture, setDriverLicensePicture] = useState<
    string | undefined
  >(user?.driverLicensePicture || undefined);
  const [vehiclePicture, setVehiclePicture] = useState<string | undefined>(
    user?.vehiclePicture || undefined
  );

  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingVehicle, setUploadingVehicle] = useState(false);
  const [verifyingNin, setVerifyingNin] = useState(false);
  const [ninVerified, setNinVerified] = useState(user?.ninVerified || false);
  const [driverLicenseVerified, setDriverLicenseVerified] = useState(
    user?.driverLicenseVerified || false
  );

  // Auto-save debounce helper
  const debounce = (func: (...args: any[]) => any, wait: number) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function executedFunction(...args: any[]) {
      const later = () => {
        timeout = null;
        func(...args);
      };
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Auto-save function
  const autoSave = async (field: string, value: any) => {
    try {
      const updateData: any = { [field]: value };
      await updateProfile(updateData);
      await checkAuthStatus();
    } catch (error) {
      // Silent fail for auto-save
    }
  };

  // Debounced auto-save functions
  const autoSaveNin = React.useMemo(
    () => debounce((value: string) => autoSave("nin", value.trim()), 2000),
    []
  );
  const autoSaveAddress = React.useMemo(
    () => debounce((value: string) => autoSave("address", value.trim()), 2000),
    []
  );
  const autoSaveDriverLicenseNumber = React.useMemo(
    () =>
      debounce(
        (value: string) => autoSave("driverLicenseNumber", value.trim()),
        2000
      ),
    []
  );

  // Debounced verification function for NIN
  const verifyNinDebounced = React.useMemo(
    () =>
      debounce(async (ninValue: string) => {
        if (!ninValue || ninValue.trim().length === 0) {
          setNinVerified(false);
          return;
        }

        setVerifyingNin(true);
        try {
          const updateData: any = {
            nin: ninValue.trim(),
          };
          const response = await updateProfile(updateData);
          if (response?.user?.ninVerified) {
            setNinVerified(true);
            Toast.show({
              type: "success",
              text1: "NIN Verified",
              text2: "Your NIN has been successfully verified",
            });
          } else {
            setNinVerified(false);
          }
          await checkAuthStatus();
        } catch (error: any) {
          setNinVerified(false);
        } finally {
          setVerifyingNin(false);
        }
      }, 1500),
    [checkAuthStatus]
  );

  // Handle field changes with auto-save
  const handleNinChange = (value: string) => {
    setNin(value);
    setNinVerified(false);
    verifyNinDebounced(value);
    autoSaveNin(value);
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    autoSaveAddress(value);
  };

  const handleDriverLicenseNumberChange = async (value: string) => {
    setDriverLicenseNumber(value);
    autoSaveDriverLicenseNumber(value);
    // Check verification when number changes (if picture exists)
    if (value.trim().length > 0 && driverLicensePicture) {
      setTimeout(async () => {
        try {
          const updateData: any = {
            driverLicenseNumber: value.trim(),
          };
          const response = await updateProfile(updateData);
          if (response?.user?.driverLicenseVerified) {
            setDriverLicenseVerified(true);
          } else {
            setDriverLicenseVerified(false);
          }
          await checkAuthStatus();
        } catch (error) {
          // Silent fail
        }
      }, 1500);
    } else {
      setDriverLicenseVerified(false);
    }
  };

  const handleDriverLicensePictureChange = async (
    value: string | undefined
  ) => {
    setDriverLicensePicture(value);
    if (value) {
      // Auto-save will be handled by the upload function
    }
  };

  const handleVehiclePictureChange = async (value: string | undefined) => {
    setVehiclePicture(value);
    if (value) {
      // Auto-save will be handled by the upload function
    }
  };

  // Update local state when user data changes
  useEffect(() => {
    if (user) {
      if (user.nin) setNin(user.nin);
      if (user.address) setAddress(user.address);
      if (user.driverLicenseNumber)
        setDriverLicenseNumber(user.driverLicenseNumber);
      if (user.driverLicensePicture)
        setDriverLicensePicture(user.driverLicensePicture);
      if (user.vehiclePicture) setVehiclePicture(user.vehiclePicture);
      if (user.ninVerified !== undefined) setNinVerified(user.ninVerified);
      if (user.driverLicenseVerified !== undefined)
        setDriverLicenseVerified(user.driverLicenseVerified);
    }
  }, [user]);

  // Only show for riders
  if (user?.role !== "rider") {
    router.replace("/(tabs)/home");
    return null;
  }

  return (
    <SafeAreaView
      edges={["top"]}
      className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: 20,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1">
            <Text
              className={`text-2xl font-bold mb-2 ${
                isDark ? "text-light-100" : "text-black"
              }`}
            >
              Complete Your KYC
            </Text>
            <Text
              className={`text-sm ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              Verify your identity to start accepting deliveries
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/home")}
            className="ml-4"
          >
            <Text
              className={`text-sm ${
                isDark ? "text-light-300" : "text-gray-600"
              }`}
            >
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>

        {/* KYC Wizard Component */}
        <KYCWizard
          nin={nin}
          address={address}
          driverLicenseNumber={driverLicenseNumber}
          driverLicensePicture={driverLicensePicture}
          vehiclePicture={vehiclePicture}
          ninVerified={ninVerified}
          driverLicenseVerified={driverLicenseVerified}
          vehicleType={user?.vehicleType || undefined}
          onNinChange={handleNinChange}
          onAddressChange={handleAddressChange}
          onDriverLicenseNumberChange={handleDriverLicenseNumberChange}
          onDriverLicensePictureChange={handleDriverLicensePictureChange}
          onVehiclePictureChange={handleVehiclePictureChange}
          onNinVerifiedChange={setNinVerified}
          onDriverLicenseVerifiedChange={setDriverLicenseVerified}
          onCheckAuthStatus={checkAuthStatus}
          verifyingNin={verifyingNin}
          uploadingLicense={uploadingLicense}
          uploadingVehicle={uploadingVehicle}
          verifyNinDebounced={verifyNinDebounced}
          onUploadingLicenseChange={setUploadingLicense}
          onUploadingVehicleChange={setUploadingVehicle}
        />

        {/* Skip Button */}
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/home")}
          className={`mt-6 border rounded-xl py-3 items-center ${
            isDark
              ? "bg-dark-100 border-neutral-100"
              : "bg-gray-100 border-gray-200"
          }`}
        >
          <Text
            className={`font-semibold ${
              isDark ? "text-light-300" : "text-gray-600"
            }`}
          >
            Skip for now - Complete later
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <TabBarSpacer />
    </SafeAreaView>
  );
}
