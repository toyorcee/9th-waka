import TabBarSpacer from "@/components/TabBarSpacer";
import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTabBarPadding } from "@/hooks/useTabBarPadding";
import { toAbsoluteUrl } from "@/services/url";
import {
  checkEmailAvailability,
  updateProfile,
  uploadDriverLicense,
  uploadProfilePicture,
  uploadVehiclePicture,
} from "@/services/userApi";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, { FadeInDown, SlideInRight } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function EditProfileScreen() {
  const { user, checkAuthStatus, updateUser } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tabBarPadding } = useTabBarPadding();
  const isDark = theme === "dark";
  const params = useLocalSearchParams<{ email?: string }>();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [email, setEmail] = useState(params.email || user?.email || "");
  const [profilePicture, setProfilePicture] = useState<string | undefined>(
    user?.profilePicture || undefined
  );
  const [nin, setNin] = useState(user?.nin || "");
  const [defaultAddress, setDefaultAddress] = useState(
    user?.defaultAddress || ""
  );
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
  const [uploading, setUploading] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingVehicle, setUploadingVehicle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifyingNin, setVerifyingNin] = useState(false);
  const [ninVerified, setNinVerified] = useState(user?.ninVerified || false);
  const [driverLicenseVerified, setDriverLicenseVerified] = useState(
    user?.driverLicenseVerified || false
  );
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [emailMessage, setEmailMessage] = useState<string>("");
  const [vehicleType, setVehicleType] = useState<
    "bicycle" | "motorbike" | "tricycle" | "car" | "van" | null
  >(
    (user?.vehicleType as
      | "bicycle"
      | "motorbike"
      | "tricycle"
      | "car"
      | "van"
      | null) || null
  );

  // Slide-in animation from right to left
  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (!hasAnimatedRef.current && user) {
      hasAnimatedRef.current = true;
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [user]);

  const stepAnimations = useMemo(
    () => ({
      identity: new Animated.Value(0),
      address: new Animated.Value(0),
      driverLicense: new Animated.Value(0),
      vehicle: new Animated.Value(0),
    }),
    []
  );

  // Check KYC completion status for riders
  const kycSteps = useMemo(() => {
    if (user?.role !== "rider") return null;
    const hasNin = nin.trim().length > 0;
    const hasAddress = address.trim().length > 0;
    const hasDriverLicense = driverLicenseNumber.trim().length > 0;
    const hasDriverLicensePic = !!driverLicensePicture;

    return {
      identity: hasNin, // NIN required
      address: hasAddress,
      driverLicense:
        hasDriverLicense && hasDriverLicensePic && driverLicenseVerified,
      vehicle: !!vehiclePicture,
      allComplete:
        hasNin &&
        hasAddress &&
        hasDriverLicense &&
        hasDriverLicensePic &&
        driverLicenseVerified &&
        !!vehiclePicture,
    };
  }, [
    user?.role,
    nin,
    address,
    driverLicenseNumber,
    driverLicensePicture,
    driverLicenseVerified,
    vehiclePicture,
  ]);

  useEffect(() => {
    if (!kycSteps) return;

    const animateStep = (
      step: keyof typeof stepAnimations,
      completed: boolean
    ) => {
      Animated.spring(stepAnimations[step], {
        toValue: completed ? 1 : 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    };

    animateStep("identity", kycSteps.identity);
    animateStep("address", kycSteps.address);
    animateStep("driverLicense", kycSteps.driverLicense);
    animateStep("vehicle", kycSteps.vehicle);
  }, [kycSteps, stepAnimations]);

  useEffect(() => {
    if (params.email) {
      setEmail(params.email);
    }
  }, [params.email]);

  useEffect(() => {
    if (user) {
      if (!fullName && user.fullName) setFullName(user.fullName);
      if (!phoneNumber && user.phoneNumber) setPhoneNumber(user.phoneNumber);
      if (!email && user.email) setEmail(user.email);
      if (user.profilePicture) setProfilePicture(user.profilePicture);
      if (user.role === "rider") {
        if (!nin && user.nin) setNin(user.nin);
        if (!address && user.address) setAddress(user.address);
        if (!driverLicenseNumber && user.driverLicenseNumber)
          setDriverLicenseNumber(user.driverLicenseNumber);
        if (user.driverLicensePicture)
          setDriverLicensePicture(user.driverLicensePicture);
        if (user.vehiclePicture) setVehiclePicture(user.vehiclePicture);
        if (user.ninVerified !== undefined) setNinVerified(user.ninVerified);
        if (user.driverLicenseVerified !== undefined)
          setDriverLicenseVerified(user.driverLicenseVerified);
        if (user.vehicleType !== undefined) setVehicleType(user.vehicleType);
      }
      if (user.role === "customer") {
        if (!defaultAddress && user.defaultAddress)
          setDefaultAddress(user.defaultAddress);
        // Load optional KYC fields for customers
        if (!nin && user.nin) setNin(user.nin);
        if (user.ninVerified !== undefined) setNinVerified(user.ninVerified);
      }
    }
  }, [user]);

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: "Permission needed",
          text2: "Please grant camera roll permissions to upload photos",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setProfilePicture(uri);
        setUploading(true);

        try {
          const response = await uploadProfilePicture(uri);
          if (response.profilePicture) {
            setProfilePicture(response.profilePicture);
            Toast.show({
              type: "success",
              text1: "Photo uploaded",
              text2: "Your profile picture has been updated",
            });
            await checkAuthStatus();
          }
        } catch (error: any) {
          Toast.show({
            type: "error",
            text1: "Upload failed",
            text2:
              error?.response?.data?.error ||
              error?.message ||
              "Failed to upload image",
          });
          setProfilePicture(user?.profilePicture || undefined);
        } finally {
          setUploading(false);
        }
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error?.message || "Failed to pick image",
      });
      setUploading(false);
    }
  };

  const pickVehicleImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: "Permission needed",
          text2: "Please grant camera roll permissions to upload photos",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Vehicle aspect ratio
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setVehiclePicture(uri);
        setUploadingVehicle(true);

        try {
          const response = await uploadVehiclePicture(uri);
          if (response.vehiclePicture) {
            setVehiclePicture(response.vehiclePicture);
            Toast.show({
              type: "success",
              text1: "Vehicle picture uploaded",
              text2: "Your vehicle picture has been uploaded",
            });
            await checkAuthStatus();
          }
        } catch (error: any) {
          Toast.show({
            type: "error",
            text1: "Upload failed",
            text2:
              error?.response?.data?.error ||
              error?.message ||
              "Failed to upload vehicle image",
          });
          setVehiclePicture(user?.vehiclePicture || undefined);
        } finally {
          setUploadingVehicle(false);
        }
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error?.message || "Failed to pick image",
      });
      setUploadingVehicle(false);
    }
  };

  const pickLicenseImage = async () => {
    try {
      // Request camera permissions
      const { status: cameraStatus } =
        await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== "granted") {
        Toast.show({
          type: "error",
          text1: "Camera permission needed",
          text2: "Please grant camera permissions to take a selfie",
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
        cameraType: ImagePicker.CameraType.front,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setDriverLicensePicture(uri);
        setUploadingLicense(true);

        try {
          const response = await uploadDriverLicense(uri);
          if (response.driverLicensePicture) {
            setDriverLicensePicture(response.driverLicensePicture);
            // Check if license is verified (both number and picture present)
            if (response.user?.driverLicenseVerified) {
              setDriverLicenseVerified(true);
              Toast.show({
                type: "success",
                text1: "License Verified",
                text2: "Your driver license has been verified",
              });
            } else {
              Toast.show({
                type: "success",
                text1: "Selfie uploaded",
                text2: "Add license number to complete verification",
              });
            }
            await checkAuthStatus();
          }
        } catch (error: any) {
          Toast.show({
            type: "error",
            text1: "Upload failed",
            text2:
              error?.response?.data?.error ||
              error?.message ||
              "Failed to upload license image",
          });
          setDriverLicensePicture(user?.driverLicensePicture || undefined);
        } finally {
          setUploadingLicense(false);
        }
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error?.message || "Failed to pick image",
      });
      setUploadingLicense(false);
    }
  };

  // Simple debounce helper
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
          // Don't show error toast for verification failures, just silently fail
        } finally {
          setVerifyingNin(false);
        }
      }, 1500), // Wait 1.5 seconds after user stops typing
    [checkAuthStatus]
  );

  // Debounced email availability check
  const checkEmailDebounced = React.useMemo(
    () =>
      debounce(async (emailValue: string) => {
        // Reset state if empty
        if (!emailValue || emailValue.trim().length === 0) {
          setEmailAvailable(null);
          setEmailValid(null);
          setEmailMessage("");
          return;
        }

        // Don't check if it's the same as current email
        if (emailValue.trim().toLowerCase() === user?.email?.toLowerCase()) {
          setEmailAvailable(true);
          setEmailValid(true);
          setEmailMessage("");
          return;
        }

        setCheckingEmail(true);
        try {
          const result = await checkEmailAvailability(emailValue.trim());
          setEmailValid(result.valid);
          setEmailAvailable(result.available);
          setEmailMessage(result.message);
        } catch (error: any) {
          setEmailValid(false);
          setEmailAvailable(false);
          setEmailMessage("Error checking email availability");
        } finally {
          setCheckingEmail(false);
        }
      }, 1000), // Wait 1 second after user stops typing
    [user?.email]
  );

  const handleSave = async () => {
    if (!fullName.trim() && !phoneNumber.trim()) {
      Toast.show({
        type: "error",
        text1: "Enter at least one field",
        text2: "Please fill in your name or phone number",
      });
      return;
    }

    setSaving(true);
    try {
      // Validate email if changed
      if (email.trim().toLowerCase() !== user?.email?.toLowerCase()) {
        if (emailAvailable === false || emailValid === false) {
          Toast.show({
            type: "error",
            text1: "Invalid email",
            text2: emailMessage || "Please enter a valid and available email",
          });
          return;
        }
      }

      const updateData: any = {
        fullName: fullName.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        email: email.trim() !== user?.email ? email.trim() : undefined,
      };

      if (user?.role === "rider") {
        updateData.nin = nin.trim() || undefined;
        updateData.address = address.trim() || undefined;
        updateData.driverLicenseNumber =
          driverLicenseNumber.trim() || undefined;
        updateData.vehicleType = vehicleType || undefined;
      } else if (user?.role === "customer") {
        updateData.defaultAddress = defaultAddress.trim() || undefined;
        updateData.nin = nin.trim() || undefined;
      }

      const response = await updateProfile(updateData);
      Toast.show({
        type: "success",
        text1: "Profile updated",
        text2: "Your profile information has been saved",
      });

      // Update user state directly from API response to avoid race conditions
      if (response?.user) {
        updateUser({
          email: response.user.email,
          fullName: response.user.fullName,
          phoneNumber: response.user.phoneNumber,
          profilePicture: response.user.profilePicture,
          vehicleType: response.user.vehicleType,
          nin: response.user.nin,
          ninVerified: response.user.ninVerified,
          defaultAddress: response.user.defaultAddress,
          address: response.user.address,
          driverLicenseNumber: response.user.driverLicenseNumber,
          driverLicenseVerified: response.user.driverLicenseVerified,
          termsAccepted: response.user.termsAccepted,
        });
      } else {
        // Fallback: refresh from server if response doesn't include user
        await checkAuthStatus();
      }

      // Navigate after state is updated
      if (router.canGoBack()) {
        router.back();
      } else {
        // Navigate based on user role
        const currentRole = response?.user?.role || user?.role;
        if (currentRole === "admin") {
          router.replace("/(tabs)/admin");
        } else {
          router.replace("/(tabs)/profile");
        }
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Update failed",
        text2:
          error?.response?.data?.error ||
          error?.message ||
          "Failed to update profile",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      edges={["top"]}
      className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
    >
      <Animated.View
        className="flex-1"
        style={{
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
        }}
      >
        {/* Fixed Header */}
        <Reanimated.View
          entering={FadeInDown.delay(0)}
          className={`absolute top-0 left-0 right-0 z-50 ${
            isDark ? "bg-primary" : "bg-white"
          }`}
          style={{
            paddingTop: insets.top + 10,
            paddingBottom: 12,
            paddingHorizontal: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "#3A3A3C" : "#E5E5EA",
          }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(tabs)/profile");
                }
              }}
              className="w-10 h-10 items-center justify-center"
              activeOpacity={0.7}
            >
              <Icons.navigation
                name={IconNames.arrowBack as any}
                size={20}
                color={isDark ? "#E6E6F0" : "#000000"}
              />
            </TouchableOpacity>
            <Text
              className={`text-lg font-bold flex-1 text-center ${
                isDark ? "text-light-100" : "text-black"
              }`}
            >
              {user?.role === "rider" ? "Complete Your KYC" : "Edit Profile"}
            </Text>
            <View className="w-10" />
          </View>
        </Reanimated.View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingTop: insets.top + 80,
            paddingBottom: 20,
            paddingHorizontal: 24,
          }}
        >
          <View style={{ paddingBottom: 20 }}>
            {/* Profile Picture Section */}
            <Reanimated.View
              entering={SlideInRight.delay(200).duration(400)}
              className={`rounded-2xl p-6 mb-6 border items-center ${
                isDark
                  ? "bg-secondary border-neutral-100"
                  : "bg-white border-gray-200"
              }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.1 : 0.05,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="relative mb-4">
                <View
                  className={`w-32 h-32 rounded-full items-center justify-center overflow-hidden ${
                    isDark ? "bg-accent" : "bg-blue-900"
                  }`}
                >
                  {profilePicture ? (
                    <Image
                      source={{
                        uri: profilePicture.startsWith("http")
                          ? profilePicture
                          : toAbsoluteUrl(profilePicture) || profilePicture,
                      }}
                      style={{ width: 128, height: 128, borderRadius: 64 }}
                      contentFit="cover"
                    />
                  ) : (
                    <Icons.user
                      name={IconNames.personCircle as any}
                      size={64}
                      color={isDark ? "#030014" : "#FFFFFF"}
                    />
                  )}
                </View>
                {uploading && (
                  <View className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                    <ActivityIndicator
                      size="large"
                      color={isDark ? "#AB8BFF" : "#1E3A8A"}
                    />
                  </View>
                )}
                <TouchableOpacity
                  onPress={pickImage}
                  disabled={uploading}
                  className={`absolute bottom-0 right-0 w-10 h-10 rounded-full items-center justify-center border-2 ${
                    isDark
                      ? "bg-accent border-primary"
                      : "bg-blue-900 border-white"
                  }`}
                >
                  <Icons.media
                    name={IconNames.camera as any}
                    size={20}
                    color={isDark ? "#030014" : "#FFFFFF"}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={pickImage}
                disabled={uploading}
                className={`px-4 py-2 rounded-xl ${
                  isDark ? "bg-accent/20" : "bg-blue-900/20"
                }`}
              >
                {uploading ? (
                  <ActivityIndicator
                    size="small"
                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                  />
                ) : (
                  <Text
                    className={`font-semibold ${
                      isDark ? "text-accent" : "text-blue-900"
                    }`}
                  >
                    Change Photo
                  </Text>
                )}
              </TouchableOpacity>
            </Reanimated.View>

            {/* KYC Progress Indicator for Riders */}
            {user?.role === "rider" && kycSteps && (
              <View
                className={`rounded-2xl p-5 mb-6 border ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.1 : 0.05,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text
                  className={`text-lg font-bold mb-4 ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  KYC Verification Progress
                </Text>
                <View className="gap-3">
                  {/* Step 1: Identity Verification */}
                  <Animated.View
                    className="flex-row items-center"
                    style={{
                      opacity: stepAnimations.identity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1],
                      }),
                      transform: [
                        {
                          scale: stepAnimations.identity.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.95, 1],
                          }),
                        },
                      ],
                    }}
                  >
                    <Animated.View
                      className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
                        kycSteps.identity
                          ? "bg-green-500"
                          : isDark
                          ? "bg-accent/30 border-2 border-accent"
                          : "bg-blue-900/30 border-2 border-blue-900"
                      }`}
                      style={{
                        transform: [
                          {
                            scale: stepAnimations.identity.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.2],
                            }),
                          },
                        ],
                      }}
                    >
                      {kycSteps.identity ? (
                        <Text className="text-white text-xs font-bold">✓</Text>
                      ) : (
                        <Text
                          className={`text-xs font-bold ${
                            isDark ? "text-accent" : "text-blue-900"
                          }`}
                        >
                          1
                        </Text>
                      )}
                    </Animated.View>
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-semibold ${
                          kycSteps.identity
                            ? "text-green-400"
                            : isDark
                            ? "text-light-200"
                            : "text-gray-700"
                        }`}
                      >
                        Identity Verification
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        {kycSteps.identity
                          ? "NIN added"
                          : "Add your NIN (required)"}
                      </Text>
                    </View>
                  </Animated.View>

                  {/* Step 2: Address */}
                  <Animated.View
                    className="flex-row items-center"
                    style={{
                      opacity: stepAnimations.address.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1],
                      }),
                      transform: [
                        {
                          scale: stepAnimations.address.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.95, 1],
                          }),
                        },
                      ],
                    }}
                  >
                    <Animated.View
                      className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
                        kycSteps.address
                          ? "bg-green-500"
                          : isDark
                          ? "bg-accent/30 border-2 border-accent"
                          : "bg-blue-900/30 border-2 border-blue-900"
                      }`}
                      style={{
                        transform: [
                          {
                            scale: stepAnimations.address.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.2],
                            }),
                          },
                        ],
                      }}
                    >
                      {kycSteps.address ? (
                        <Text className="text-white text-xs font-bold">✓</Text>
                      ) : (
                        <Text
                          className={`text-xs font-bold ${
                            isDark ? "text-accent" : "text-blue-900"
                          }`}
                        >
                          2
                        </Text>
                      )}
                    </Animated.View>
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-semibold ${
                          kycSteps.address
                            ? "text-green-400"
                            : isDark
                            ? "text-light-200"
                            : "text-gray-700"
                        }`}
                      >
                        Address Information
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        {kycSteps.address
                          ? "Address added"
                          : "Add your residential address"}
                      </Text>
                    </View>
                  </Animated.View>

                  {/* Step 3: Driver License */}
                  <Animated.View
                    className="flex-row items-center"
                    style={{
                      opacity: stepAnimations.driverLicense.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1],
                      }),
                      transform: [
                        {
                          scale: stepAnimations.driverLicense.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.95, 1],
                          }),
                        },
                      ],
                    }}
                  >
                    <Animated.View
                      className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
                        kycSteps.driverLicense
                          ? "bg-green-500"
                          : isDark
                          ? "bg-accent/30 border-2 border-accent"
                          : "bg-blue-900/30 border-2 border-blue-900"
                      }`}
                      style={{
                        transform: [
                          {
                            scale: stepAnimations.driverLicense.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.2],
                            }),
                          },
                        ],
                      }}
                    >
                      {kycSteps.driverLicense ? (
                        <Text className="text-white text-xs font-bold">✓</Text>
                      ) : (
                        <Text
                          className={`text-xs font-bold ${
                            isDark ? "text-accent" : "text-blue-900"
                          }`}
                        >
                          3
                        </Text>
                      )}
                    </Animated.View>
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-semibold ${
                          kycSteps.driverLicense
                            ? "text-green-400"
                            : isDark
                            ? "text-light-200"
                            : "text-gray-700"
                        }`}
                      >
                        Driver License
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        {kycSteps.driverLicense
                          ? "License number and picture added"
                          : "Add license number and picture"}
                      </Text>
                    </View>
                  </Animated.View>

                  {/* Step 4: Vehicle Picture */}
                  <Animated.View
                    className="flex-row items-center"
                    style={{
                      opacity: stepAnimations.vehicle.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1],
                      }),
                      transform: [
                        {
                          scale: stepAnimations.vehicle.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.95, 1],
                          }),
                        },
                      ],
                    }}
                  >
                    <Animated.View
                      className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
                        kycSteps.vehicle
                          ? "bg-green-500"
                          : isDark
                          ? "bg-accent/30 border-2 border-accent"
                          : "bg-blue-900/30 border-2 border-blue-900"
                      }`}
                      style={{
                        transform: [
                          {
                            scale: stepAnimations.vehicle.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.2],
                            }),
                          },
                        ],
                      }}
                    >
                      {kycSteps.vehicle ? (
                        <Text className="text-white text-xs font-bold">✓</Text>
                      ) : (
                        <Text
                          className={`text-xs font-bold ${
                            isDark ? "text-accent" : "text-blue-900"
                          }`}
                        >
                          4
                        </Text>
                      )}
                    </Animated.View>
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-semibold ${
                          kycSteps.vehicle
                            ? "text-green-400"
                            : isDark
                            ? "text-light-200"
                            : "text-gray-700"
                        }`}
                      >
                        Vehicle Picture
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        {kycSteps.vehicle
                          ? "Vehicle picture uploaded"
                          : "Upload a picture of your vehicle"}
                      </Text>
                    </View>
                  </Animated.View>
                </View>

                {kycSteps.allComplete && (
                  <View
                    className={`mt-4 pt-4 border-t ${
                      isDark ? "border-neutral-100" : "border-gray-200"
                    }`}
                  >
                    <View className="flex-row items-center bg-green-500/20 rounded-xl p-3">
                      <Icons.safety
                        name={IconNames.checkmarkCircle as any}
                        size={20}
                        color="#10B981"
                      />
                      <Text className="text-green-400 font-semibold ml-2">
                        KYC Verification Complete! You can now accept orders.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Form Fields */}
            <View className="gap-4 mb-6">
              <View
                className={`rounded-2xl p-5 border ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.05 : 0.03,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  className={`text-sm mb-2 ${
                    isDark ? "text-light-300" : "text-gray-600"
                  }`}
                >
                  Email
                </Text>
                <View className="relative">
                  <TextInput
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setEmailAvailable(null);
                      setEmailValid(null);
                      setEmailMessage("");
                      checkEmailDebounced(text);
                    }}
                    placeholder="your@email.com"
                    placeholderTextColor="#9CA4AB"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className={`rounded-xl px-4 py-3 text-base pr-12 ${
                      isDark
                        ? "text-light-100 bg-dark-100"
                        : "text-black bg-white border border-gray-200"
                    } ${
                      emailAvailable === true
                        ? "border-2 border-green-500"
                        : emailAvailable === false
                        ? "border-2 border-red-500"
                        : ""
                    }`}
                  />
                  {checkingEmail && (
                    <View className="absolute right-4 top-3">
                      <ActivityIndicator
                        size="small"
                        color={isDark ? "#AB8BFF" : "#1E3A8A"}
                      />
                    </View>
                  )}
                  {!checkingEmail && emailAvailable === true && (
                    <View className="absolute right-4 top-3">
                      <Icons.safety
                        name={IconNames.checkmarkCircle as any}
                        size={20}
                        color="#10B981"
                      />
                    </View>
                  )}
                  {!checkingEmail && emailAvailable === false && (
                    <View className="absolute right-4 top-3">
                      <Icons.safety
                        name={IconNames.closeCircle as any}
                        size={20}
                        color="#EF4444"
                      />
                    </View>
                  )}
                </View>
                {emailMessage && (
                  <Text
                    className={`text-xs mt-1 ${
                      emailAvailable === true
                        ? "text-green-400"
                        : emailAvailable === false
                        ? "text-red-400"
                        : "text-light-400"
                    }`}
                  >
                    {emailMessage}
                  </Text>
                )}
                {!emailMessage && (
                  <Text
                    className={`text-xs mt-1 ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    {email === user?.email
                      ? "Your current email address"
                      : "Enter a new email address to change it"}
                  </Text>
                )}
              </View>

              <View
                className={`rounded-2xl p-5 border ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.05 : 0.03,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  className={`text-sm mb-2 ${
                    isDark ? "text-light-300" : "text-gray-600"
                  }`}
                >
                  Full Name
                </Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA4AB"
                  className={`rounded-xl px-4 py-3 text-base ${
                    isDark
                      ? "text-light-100 bg-dark-100"
                      : "text-black bg-white border border-gray-200"
                  }`}
                />
              </View>

              <View
                className={`rounded-2xl p-5 border ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.05 : 0.03,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  className={`text-sm mb-2 ${
                    isDark ? "text-light-300" : "text-gray-600"
                  }`}
                >
                  Phone Number
                </Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#9CA4AB"
                  keyboardType="phone-pad"
                  className={`rounded-xl px-4 py-3 text-base ${
                    isDark
                      ? "text-light-100 bg-dark-100"
                      : "text-black bg-white border border-gray-200"
                  }`}
                />
              </View>

              {/* Vehicle Type (Riders only - Editable selector) */}
              {user?.role === "rider" && (
                <View
                  className={`rounded-2xl p-5 border ${
                    isDark
                      ? "bg-secondary border-neutral-100"
                      : "bg-white border-gray-200"
                  }`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.05 : 0.03,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Text
                    className={`text-sm mb-3 ${
                      isDark ? "text-light-300" : "text-gray-600"
                    }`}
                  >
                    Vehicle Type
                  </Text>
                  <View className="gap-2">
                    {[
                      { value: "bicycle", label: "Bicycle", icon: "🚲" },
                      { value: "motorbike", label: "Motorbike", icon: "🏍️" },
                      { value: "tricycle", label: "Tricycle", icon: "🛺" },
                      { value: "car", label: "Car", icon: "🚗" },
                      { value: "van", label: "Van", icon: "🚐" },
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        onPress={() => setVehicleType(type.value as any)}
                        className={`py-3 px-4 rounded-xl border-2 ${
                          vehicleType === type.value
                            ? isDark
                              ? "bg-accent border-accent"
                              : "bg-blue-900 border-blue-900"
                            : isDark
                            ? "bg-dark-100 border-neutral-100"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <Text
                          className={`text-center font-semibold text-sm ${
                            vehicleType === type.value
                              ? isDark
                                ? "text-primary"
                                : "text-white"
                              : isDark
                              ? "text-light-300"
                              : "text-gray-600"
                          }`}
                        >
                          {type.icon} {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text
                    className={`text-xs mt-2 ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Select your vehicle type for deliveries
                  </Text>
                </View>
              )}

              {/* Vehicle Picture Upload (Riders only) */}
              {user?.role === "rider" && (
                <View
                  className={`rounded-2xl p-5 border ${
                    isDark
                      ? "bg-secondary border-neutral-100"
                      : "bg-white border-gray-200"
                  }`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.05 : 0.03,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Text
                    className={`text-sm mb-3 ${
                      isDark ? "text-light-300" : "text-gray-600"
                    }`}
                  >
                    Vehicle Picture
                  </Text>
                  {vehiclePicture ? (
                    <View className="mb-3">
                      <View className="relative">
                        <Image
                          source={{
                            uri: vehiclePicture.startsWith("http")
                              ? vehiclePicture
                              : toAbsoluteUrl(vehiclePicture) || vehiclePicture,
                          }}
                          style={{
                            width: "100%",
                            height: 200,
                            borderRadius: 12,
                          }}
                          contentFit="cover"
                        />
                        {uploadingVehicle && (
                          <View className="absolute inset-0 bg-black/50 rounded-xl items-center justify-center">
                            <ActivityIndicator
                              size="large"
                              color={isDark ? "#AB8BFF" : "#1E3A8A"}
                            />
                          </View>
                        )}
                      </View>
                    </View>
                  ) : (
                    <View
                      className={`mb-3 rounded-xl p-8 items-center justify-center border-2 border-dashed ${
                        isDark
                          ? "bg-dark-100 border-neutral-100"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <Icons.media
                        name={IconNames.cameraOutline as any}
                        size={48}
                        color="#9CA4AB"
                      />
                      <Text
                        className={`text-xs mt-2 text-center ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        No vehicle picture uploaded
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={pickVehicleImage}
                    disabled={uploadingVehicle}
                    className={`border rounded-xl py-3 px-4 items-center ${
                      isDark
                        ? "bg-accent/20 border-accent"
                        : "bg-blue-900/20 border-blue-900"
                    }`}
                  >
                    {uploadingVehicle ? (
                      <ActivityIndicator
                        size="small"
                        color={isDark ? "#AB8BFF" : "#1E3A8A"}
                      />
                    ) : (
                      <Text
                        className={`font-semibold ${
                          isDark ? "text-accent" : "text-blue-900"
                        }`}
                      >
                        {vehiclePicture
                          ? "Change Vehicle Picture"
                          : "Upload Vehicle Picture"}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <Text
                    className={`text-xs mt-2 ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Upload a clear picture of your{" "}
                    {vehicleType === "bicycle"
                      ? "bicycle"
                      : vehicleType === "motorbike"
                      ? "motorbike"
                      : vehicleType === "tricycle"
                      ? "tricycle"
                      : vehicleType === "car"
                      ? "car"
                      : vehicleType === "van"
                      ? "van"
                      : "vehicle"}
                  </Text>
                </View>
              )}

              {/* KYC Fields for Riders */}
              {user?.role === "rider" && (
                <>
                  <View
                    className={`rounded-2xl p-5 border ${
                      isDark
                        ? "bg-secondary border-neutral-100"
                        : "bg-white border-gray-200"
                    }`}
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isDark ? 0.05 : 0.03,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Text
                      className={`text-sm mb-2 ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      NIN (National Identification Number)
                    </Text>
                    <View className="relative">
                      <TextInput
                        value={nin}
                        onChangeText={(text) => {
                          setNin(text);
                          setNinVerified(false);
                          verifyNinDebounced(text);
                        }}
                        placeholder="Enter your NIN"
                        placeholderTextColor="#9CA4AB"
                        keyboardType="numeric"
                        className={`rounded-xl px-4 py-3 text-base pr-12 ${
                          isDark
                            ? "text-light-100 bg-dark-100"
                            : "text-black bg-white border border-gray-200"
                        } ${ninVerified ? "border-2 border-green-500" : ""}`}
                      />
                      {verifyingNin && (
                        <View className="absolute right-4 top-3">
                          <ActivityIndicator
                            size="small"
                            color={isDark ? "#AB8BFF" : "#1E3A8A"}
                          />
                        </View>
                      )}
                      {ninVerified && !verifyingNin && (
                        <View className="absolute right-4 top-3">
                          <Icons.safety
                            name={IconNames.checkmarkCircle as any}
                            size={20}
                            color="#10B981"
                          />
                        </View>
                      )}
                    </View>
                    {ninVerified && !verifyingNin && (
                      <View className="flex-row items-center mt-2">
                        <Text className="text-green-400 text-xs font-semibold">
                          ✓ Verified
                        </Text>
                      </View>
                    )}
                    {!ninVerified && !verifyingNin && (
                      <Text
                        className={`text-xs mt-1 ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        Required to accept delivery orders. Provide either NIN
                        or BVN.
                      </Text>
                    )}
                  </View>

                  <View
                    className={`rounded-2xl p-5 border ${
                      isDark
                        ? "bg-secondary border-neutral-100"
                        : "bg-white border-gray-200"
                    }`}
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isDark ? 0.05 : 0.03,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Text
                      className={`text-sm mb-2 ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      Address
                    </Text>
                    <TextInput
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Enter your address"
                      placeholderTextColor="#9CA4AB"
                      multiline
                      numberOfLines={3}
                      className={`rounded-xl px-4 py-3 text-base ${
                        isDark
                          ? "text-light-100 bg-dark-100"
                          : "text-black bg-white border border-gray-200"
                      }`}
                      textAlignVertical="top"
                    />
                    <Text
                      className={`text-xs mt-1 ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
                      Your residential or business address
                    </Text>
                  </View>

                  <View
                    className={`rounded-2xl p-5 border ${
                      isDark
                        ? "bg-secondary border-neutral-100"
                        : "bg-white border-gray-200"
                    }`}
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isDark ? 0.05 : 0.03,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Text
                      className={`text-sm mb-2 ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      Driver License Number
                    </Text>
                    <View className="relative">
                      <TextInput
                        value={driverLicenseNumber}
                        onChangeText={(text) => {
                          setDriverLicenseNumber(text);
                          // Check verification when number changes (if picture exists)
                          if (text.trim().length > 0 && driverLicensePicture) {
                            // Trigger verification check by updating profile
                            setTimeout(async () => {
                              try {
                                const updateData: any = {
                                  driverLicenseNumber: text.trim(),
                                };
                                const response = await updateProfile(
                                  updateData
                                );
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
                        }}
                        placeholder="Enter your driver license number"
                        placeholderTextColor="#9CA4AB"
                        className={`rounded-xl px-4 py-3 text-base pr-12 ${
                          isDark
                            ? "text-light-100 bg-dark-100"
                            : "text-black bg-white border border-gray-200"
                        } ${
                          driverLicenseVerified
                            ? "border-2 border-green-500"
                            : ""
                        }`}
                      />
                      {driverLicenseVerified && (
                        <View className="absolute right-4 top-3">
                          <Icons.safety
                            name={IconNames.checkmarkCircle as any}
                            size={20}
                            color="#10B981"
                          />
                        </View>
                      )}
                    </View>
                    {driverLicenseVerified && (
                      <View className="flex-row items-center mt-2">
                        <Text className="text-green-400 text-xs font-semibold">
                          ✓ Verified
                        </Text>
                      </View>
                    )}
                    {!driverLicenseVerified && (
                      <Text
                        className={`text-xs mt-1 ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        {driverLicensePicture
                          ? "Add license number to verify"
                          : "Add both license number and selfie to verify"}
                      </Text>
                    )}
                  </View>

                  {/* Driver License Selfie Upload */}
                  <View
                    className={`rounded-2xl p-5 border ${
                      isDark
                        ? "bg-secondary border-neutral-100"
                        : "bg-white border-gray-200"
                    }`}
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isDark ? 0.05 : 0.03,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Text
                      className={`text-sm mb-3 ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      Selfie with License
                    </Text>
                    <View className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-3">
                      <Text className="text-blue-300 text-xs font-semibold mb-1">
                        📸 Security Requirement
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-300" : "text-gray-600"
                        }`}
                      >
                        Take a clear selfie holding your driver license next to
                        your face. This helps us verify your identity and
                        prevent fraud.
                      </Text>
                    </View>
                    {driverLicensePicture ? (
                      <View className="mb-3">
                        <View className="relative">
                          <Image
                            source={{
                              uri: driverLicensePicture.startsWith("http")
                                ? driverLicensePicture
                                : toAbsoluteUrl(driverLicensePicture) ||
                                  driverLicensePicture,
                            }}
                            style={{
                              width: "100%",
                              height: 200,
                              borderRadius: 12,
                            }}
                            contentFit="cover"
                          />
                          {uploadingLicense && (
                            <View className="absolute inset-0 bg-black/50 rounded-xl items-center justify-center">
                              <ActivityIndicator size="large" color="#AB8BFF" />
                            </View>
                          )}
                        </View>
                      </View>
                    ) : (
                      <View
                        className={`mb-3 rounded-xl p-8 items-center justify-center border-2 border-dashed ${
                          isDark
                            ? "bg-dark-100 border-neutral-100"
                            : "bg-white border-gray-300"
                        }`}
                      >
                        <Icons.media
                          name={IconNames.cameraOutline as any}
                          size={48}
                          color="#9CA4AB"
                        />
                        <Text
                          className={`text-xs mt-2 text-center ${
                            isDark ? "text-light-400" : "text-gray-500"
                          }`}
                        >
                          No selfie uploaded
                        </Text>
                        <Text
                          className={`text-xs mt-1 text-center ${
                            isDark ? "text-light-500" : "text-gray-400"
                          }`}
                        >
                          Hold your license next to your face
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={pickLicenseImage}
                      disabled={uploadingLicense}
                      className="bg-accent/20 border border-accent rounded-xl py-3 px-4 items-center"
                    >
                      {uploadingLicense ? (
                        <ActivityIndicator size="small" color="#AB8BFF" />
                      ) : (
                        <Text className="text-accent font-semibold">
                          {driverLicensePicture
                            ? "Retake Selfie"
                            : "Take Selfie with License"}
                        </Text>
                      )}
                    </TouchableOpacity>
                    <Text
                      className={`text-xs mt-2 ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
                      Take a clear selfie holding your license next to your
                      face. Make sure both your face and the license are clearly
                      visible.
                    </Text>
                    {driverLicenseVerified && (
                      <View className="flex-row items-center mt-2 bg-green-500/20 rounded-xl p-2">
                        <Icons.safety
                          name={IconNames.checkmarkCircle as any}
                          size={16}
                          color="#10B981"
                        />
                        <Text className="text-green-400 text-xs font-semibold ml-2">
                          License verified (number + selfie)
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* KYC Fields for Customers */}
              {user?.role === "customer" && (
                <>
                  <View
                    className={`rounded-2xl p-5 border ${
                      isDark
                        ? "bg-secondary border-neutral-100"
                        : "bg-white border-gray-200"
                    }`}
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isDark ? 0.05 : 0.03,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Text
                      className={`text-sm mb-2 ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      Default Address
                    </Text>
                    <TextInput
                      value={defaultAddress}
                      onChangeText={setDefaultAddress}
                      placeholder="Enter your default delivery address"
                      placeholderTextColor="#9CA4AB"
                      multiline
                      numberOfLines={3}
                      className={`rounded-xl px-4 py-3 text-base ${
                        isDark
                          ? "text-light-100 bg-dark-100"
                          : "text-black bg-white border border-gray-200"
                      }`}
                      textAlignVertical="top"
                    />
                    <Text
                      className={`text-xs mt-1 ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
                      💡 Tip: Save your address here to quickly fill it when
                      creating orders. You can use the checkbox when placing an
                      order to auto-fill your pickup address.
                    </Text>
                  </View>

                  {/* Optional Identity Verification for Customers */}
                  <View
                    className={`rounded-2xl p-5 border ${
                      isDark
                        ? "bg-secondary border-neutral-100"
                        : "bg-white border-gray-200"
                    }`}
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isDark ? 0.05 : 0.03,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <View className="flex-row items-center mb-3">
                      <Text
                        className={`text-base font-semibold flex-1 ${
                          isDark ? "text-light-100" : "text-black"
                        }`}
                      >
                        Identity Verification (Optional)
                      </Text>
                    </View>
                    <View className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-4">
                      <Text className="text-blue-300 text-xs font-semibold mb-1">
                        🔒 Security & Dispute Protection
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-300" : "text-gray-600"
                        }`}
                      >
                        Verify your identity to protect your account and enable
                        faster dispute resolution. This is optional but
                        recommended for your security.
                      </Text>
                    </View>

                    <Text
                      className={`text-sm mb-2 ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      NIN (National Identification Number)
                    </Text>
                    <View className="relative">
                      <TextInput
                        value={nin}
                        onChangeText={(text) => {
                          setNin(text);
                          setNinVerified(false);
                          verifyNinDebounced(text);
                        }}
                        placeholder="Enter your NIN (optional)"
                        placeholderTextColor="#9CA4AB"
                        keyboardType="numeric"
                        className={`rounded-xl px-4 py-3 text-base pr-12 ${
                          isDark
                            ? "text-light-100 bg-dark-100"
                            : "text-black bg-white border border-gray-200"
                        } ${ninVerified ? "border-2 border-green-500" : ""}`}
                      />
                      {verifyingNin && (
                        <View className="absolute right-4 top-3">
                          <ActivityIndicator
                            size="small"
                            color={isDark ? "#AB8BFF" : "#1E3A8A"}
                          />
                        </View>
                      )}
                      {ninVerified && !verifyingNin && (
                        <View className="absolute right-4 top-3">
                          <Icons.safety
                            name={IconNames.checkmarkCircle as any}
                            size={20}
                            color="#10B981"
                          />
                        </View>
                      )}
                    </View>
                    {ninVerified && !verifyingNin && (
                      <View className="flex-row items-center mt-2">
                        <Text className="text-green-400 text-xs font-semibold">
                          ✓ Verified
                        </Text>
                      </View>
                    )}
                    {!ninVerified && !verifyingNin && (
                      <Text
                        className={`text-xs mt-1 ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        Optional: Helps with account security and dispute
                        resolution
                      </Text>
                    )}
                  </View>
                </>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className={`rounded-2xl py-4 items-center ${
                isDark ? "bg-accent" : "bg-blue-900"
              }`}
            >
              {saving ? (
                <ActivityIndicator color={isDark ? "#030014" : "#FFFFFF"} />
              ) : (
                <Text
                  className={`font-bold text-base ${
                    isDark ? "text-primary" : "text-white"
                  }`}
                >
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
        <TabBarSpacer />
      </Animated.View>
    </SafeAreaView>
  );
}
