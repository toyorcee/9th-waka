import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function EditProfileScreen() {
  const { user, isLoading, updateUser } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");

  if (isLoading) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  const handleSave = () => {
    updateUser({
      fullName: fullName || null,
      phoneNumber: phoneNumber || null,
    });
    router.back();
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
            <View className="w-24 h-24 rounded-full bg-accent items-center justify-center mb-4">
              {user?.profilePicture ? (
                <Text className="text-primary text-2xl">👤</Text>
              ) : (
                <Icons.user
                  name={IconNames.personCircle as any}
                  size={48}
                  color="#030014"
                />
              )}
            </View>
            <TouchableOpacity className="bg-accent px-4 py-2 rounded-xl">
              <Text className="text-primary font-semibold text-sm">
                Change Photo
              </Text>
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
            className="bg-accent rounded-xl p-4 items-center"
          >
            <Text className="text-primary font-bold text-base">
              Save Changes
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
