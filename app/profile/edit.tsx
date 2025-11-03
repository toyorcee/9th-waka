import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/apiClient";
import { toAbsoluteUrl } from "@/services/url";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
  const { user, isLoading, updateUser } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(
    toAbsoluteUrl((user?.profilePicture as string) || null)
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveSpinner, setShowSaveSpinner] = useState(false);

  const getMimeFromUri = (uri: string): string => {
    const ext = uri.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "webp":
        return "image/webp";
      case "gif":
        return "image/gif";
      default:
        return "image/jpeg";
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  React.useEffect(() => {
    if (!uploading) {
      const abs = toAbsoluteUrl((user?.profilePicture as string) || null);
      if (abs) setLocalPhotoUri(abs);
    }
  }, [user?.profilePicture]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const spinnerTimer = setTimeout(() => setShowSaveSpinner(true), 1000);
    try {
      const { data } = await apiClient.put("/user/profile", {
        fullName: fullName || null,
        phoneNumber: phoneNumber || null,
      });
      const updated = data?.user || {};
      updateUser({
        fullName: (updated.fullName ?? fullName) || null,
        phoneNumber: (updated.phoneNumber ?? phoneNumber) || null,
        profilePicture:
          (updated.profilePicture as string) ||
          localPhotoUri ||
          (user?.profilePicture as string) ||
          null,
      });
      router.back();
    } finally {
      clearTimeout(spinnerTimer);
      setShowSaveSpinner(false);
      setSaving(false);
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.length) {
      const picked = result.assets[0].uri;
      setLocalPhotoUri(picked); // instant preview
      // upload immediately
      try {
        setUploading(true);
        const form = new FormData();
        form.append("profilePicture", {
          uri: picked,
          name: `profile.${(picked.split(".").pop() || "jpg").toLowerCase()}`,
          type: getMimeFromUri(picked),
        } as any);
        const { data } = await apiClient.post("/user/profile-picture", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const url = data?.profilePicture || data?.url;
        if (url) {
          const abs = toAbsoluteUrl(url);
          setLocalPhotoUri(abs || url);
          updateUser({ profilePicture: abs || url });
          Toast.show({ type: "success", text1: "Profile photo updated" });
        } else {
          Toast.show({ type: "error", text1: "Upload failed" });
        }
      } catch (e: any) {
        Toast.show({
          type: "error",
          text1: e?.response?.data?.error || e?.message || "Upload failed",
        });
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <ScrollView className="flex-1 bg-primary">
      <View className="pt-20 px-6 pb-8">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Icons.navigation
              name={IconNames.arrowBack as any}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text className="text-light-100 text-3xl font-bold">
            Edit Profile
          </Text>
        </View>

        {/* Profile Form */}
        <View className="bg-secondary rounded-2xl p-6 border border-neutral-100">
          {/* Profile Picture */}
          <View className="items-center mb-6">
            <View className="w-24 h-24 rounded-full bg-accent items-center justify-center mb-4 overflow-hidden">
              {localPhotoUri ? (
                <Image
                  source={{ uri: localPhotoUri }}
                  style={{ width: 96, height: 96, borderRadius: 48 }}
                  contentFit="cover"
                />
              ) : (
                <Icons.user
                  name={IconNames.personCircle as any}
                  size={48}
                  color="#030014"
                />
              )}
              {uploading && (
                <View className="absolute inset-0 items-center justify-center bg-black/20">
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={pickPhoto}
              disabled={uploading}
              className={`bg-accent px-4 py-2 rounded-xl ${
                uploading ? "opacity-60" : ""
              }`}
            >
              {uploading ? (
                <ActivityIndicator color="#030014" />
              ) : (
                <Text className="text-primary font-semibold text-sm">
                  Change Photo
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View className="gap-4 mb-6">
            <View>
              <Text className="text-light-400 text-xs mb-2">Full Name</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#9CA4AB"
                className="bg-dark-100 rounded-xl p-4 text-light-100 border border-neutral-100"
              />
            </View>

            <View>
              <Text className="text-light-400 text-xs mb-2">Email</Text>
              <TextInput
                value={user?.email || ""}
                editable={false}
                className="bg-dark-200 rounded-xl p-4 text-light-400 border border-neutral-100"
              />
              <Text className="text-light-400 text-xs mt-1">
                Email cannot be changed
              </Text>
            </View>

            <View>
              <Text className="text-light-400 text-xs mb-2">Phone Number</Text>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter your phone number"
                placeholderTextColor="#9CA4AB"
                keyboardType="phone-pad"
                className="bg-dark-100 rounded-xl p-4 text-light-100 border border-neutral-100"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className={`bg-accent rounded-xl p-4 items-center ${
              saving ? "opacity-60" : ""
            }`}
          >
            {showSaveSpinner ? (
              <ActivityIndicator color="#030014" />
            ) : (
              <Text className="text-primary font-bold text-base">
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
