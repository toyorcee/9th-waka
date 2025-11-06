import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { toAbsoluteUrl } from "@/services/url";
import { updateProfile, uploadProfilePicture } from "@/services/userApi";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function EditProfileScreen() {
  const { user, checkAuthStatus } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [email, setEmail] = useState(params.email || user?.email || "");
  const [profilePicture, setProfilePicture] = useState<string | undefined>(
    user?.profilePicture || undefined
  );
  // KYC fields
  const [nin, setNin] = useState(user?.nin || "");
  const [bvn, setBvn] = useState(user?.bvn || "");
  const [defaultAddress, setDefaultAddress] = useState(
    user?.defaultAddress || ""
  );
  const [address, setAddress] = useState(user?.address || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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
        if (!bvn && user.bvn) setBvn(user.bvn);
        if (!address && user.address) setAddress(user.address);
      }
      if (user.role === "customer") {
        if (!defaultAddress && user.defaultAddress)
          setDefaultAddress(user.defaultAddress);
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

  const handleSave = async () => {
    // Basic validation - at least name or phone
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
      const updateData: any = {
        fullName: fullName.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
      };

      // Add role-specific KYC fields
      if (user?.role === "rider") {
        updateData.nin = nin.trim() || undefined;
        updateData.bvn = bvn.trim() || undefined;
        updateData.address = address.trim() || undefined;
      } else if (user?.role === "customer") {
        updateData.defaultAddress = defaultAddress.trim() || undefined;
      }

      await updateProfile(updateData);
      Toast.show({
        type: "success",
        text1: "Profile updated",
        text2: "Your profile information has been saved",
      });
      await checkAuthStatus();
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/profile");
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
    <ScrollView className="flex-1 bg-primary">
      <View className="pt-20 px-6 pb-10">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/profile");
              }
            }}
            className="w-10 h-10 items-center justify-center"
          >
            <Icons.navigation
              name={IconNames.arrowBack as any}
              size={24}
              color="#E6E6F0"
            />
          </TouchableOpacity>
          <Text className="text-light-100 text-2xl font-bold">
            Edit Profile
          </Text>
          <View className="w-10" />
        </View>

        {/* Profile Picture Section */}
        <View className="bg-secondary rounded-2xl p-6 mb-6 border border-neutral-100 items-center">
          <View className="relative mb-4">
            <View className="w-32 h-32 rounded-full bg-accent items-center justify-center overflow-hidden">
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
                  color="#030014"
                />
              )}
            </View>
            {uploading && (
              <View className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                <ActivityIndicator size="large" color="#AB8BFF" />
              </View>
            )}
            <TouchableOpacity
              onPress={pickImage}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-10 h-10 bg-accent rounded-full items-center justify-center border-2 border-primary"
            >
              <Icons.media
                name={IconNames.camera as any}
                size={20}
                color="#030014"
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={pickImage}
            disabled={uploading}
            className="bg-accent/20 px-4 py-2 rounded-xl"
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#AB8BFF" />
            ) : (
              <Text className="text-accent font-semibold">Change Photo</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View className="gap-4 mb-6">
          <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
            <Text className="text-light-300 text-sm mb-2">Email</Text>
            <TextInput
              value={email}
              editable={false}
              placeholder="your@email.com"
              placeholderTextColor="#9CA4AB"
              className="text-light-400 bg-dark-100 rounded-xl px-4 py-3 text-base opacity-60"
            />
            <Text className="text-light-400 text-xs mt-1">
              Email cannot be changed
            </Text>
          </View>

          <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
            <Text className="text-light-300 text-sm mb-2">Full Name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor="#9CA4AB"
              className="text-light-100 bg-dark-100 rounded-xl px-4 py-3 text-base"
            />
          </View>

          <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
            <Text className="text-light-300 text-sm mb-2">Phone Number</Text>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Enter your phone number"
              placeholderTextColor="#9CA4AB"
              keyboardType="phone-pad"
              className="text-light-100 bg-dark-100 rounded-xl px-4 py-3 text-base"
            />
          </View>

          {/* Vehicle Type (Riders only - Read-only display) */}
          {user?.role === "rider" && user?.vehicleType && (
            <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
              <Text className="text-light-300 text-sm mb-2">Vehicle Type</Text>
              <View className="bg-dark-100 rounded-xl px-4 py-3 border border-accent/30">
                <Text className="text-accent font-semibold text-base">
                  {user.vehicleType === "motorcycle"
                    ? "🏍️ Motorcycle"
                    : "🚗 Car/Van"}
                </Text>
              </View>
              <Text className="text-light-400 text-xs mt-2">
                You can change this in Settings
              </Text>
            </View>
          )}

          {/* KYC Fields for Riders */}
          {user?.role === "rider" && (
            <>
              <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
                <Text className="text-light-300 text-sm mb-2">
                  NIN (National Identification Number)
                </Text>
                <TextInput
                  value={nin}
                  onChangeText={setNin}
                  placeholder="Enter your NIN (optional)"
                  placeholderTextColor="#9CA4AB"
                  keyboardType="numeric"
                  className="text-light-100 bg-dark-100 rounded-xl px-4 py-3 text-base"
                />
                <Text className="text-light-400 text-xs mt-1">
                  Required to accept delivery orders. Provide either NIN or BVN.
                </Text>
              </View>

              <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
                <Text className="text-light-300 text-sm mb-2">
                  BVN (Bank Verification Number)
                </Text>
                <TextInput
                  value={bvn}
                  onChangeText={setBvn}
                  placeholder="Enter your BVN (optional)"
                  placeholderTextColor="#9CA4AB"
                  keyboardType="numeric"
                  className="text-light-100 bg-dark-100 rounded-xl px-4 py-3 text-base"
                />
                <Text className="text-light-400 text-xs mt-1">
                  Required to accept delivery orders. Provide either NIN or BVN.
                </Text>
              </View>

              <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
                <Text className="text-light-300 text-sm mb-2">Address</Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter your address"
                  placeholderTextColor="#9CA4AB"
                  multiline
                  numberOfLines={3}
                  className="text-light-100 bg-dark-100 rounded-xl px-4 py-3 text-base"
                  textAlignVertical="top"
                />
                <Text className="text-light-400 text-xs mt-1">
                  Your residential or business address
                </Text>
              </View>
            </>
          )}

          {/* KYC Fields for Customers */}
          {user?.role === "customer" && (
            <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
              <Text className="text-light-300 text-sm mb-2">
                Default Address
              </Text>
              <TextInput
                value={defaultAddress}
                onChangeText={setDefaultAddress}
                placeholder="Enter your default delivery address"
                placeholderTextColor="#9CA4AB"
                multiline
                numberOfLines={3}
                className="text-light-100 bg-dark-100 rounded-xl px-4 py-3 text-base"
                textAlignVertical="top"
              />
              <Text className="text-light-400 text-xs mt-1">
                💡 Tip: Save your address here to quickly fill it when creating
                orders. You can use the checkbox when placing an order to
                auto-fill your pickup address.
              </Text>
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="bg-accent rounded-2xl py-4 items-center"
        >
          {saving ? (
            <ActivityIndicator color="#030014" />
          ) : (
            <Text className="text-primary font-bold text-base">
              Save Changes
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
