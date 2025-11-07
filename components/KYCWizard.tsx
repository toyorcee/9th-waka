import { IconNames, Icons } from "@/constants/icons";
import { toAbsoluteUrl } from "@/services/url";
import {
  updateProfile,
  uploadDriverLicense,
  uploadVehiclePicture,
} from "@/services/userApi";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

interface KYCWizardProps {
  nin: string;
  bvn: string;
  address: string;
  driverLicenseNumber: string;
  driverLicensePicture?: string;
  vehiclePicture?: string;
  ninVerified: boolean;
  bvnVerified: boolean;
  driverLicenseVerified: boolean;
  vehicleType?: "motorcycle" | "car";

  onNinChange: (value: string) => void;
  onBvnChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onDriverLicenseNumberChange: (value: string) => void;
  onDriverLicensePictureChange: (value: string | undefined) => void;
  onVehiclePictureChange: (value: string | undefined) => void;
  onNinVerifiedChange: (value: boolean) => void;
  onBvnVerifiedChange: (value: boolean) => void;
  onDriverLicenseVerifiedChange: (value: boolean) => void;
  onCheckAuthStatus: () => Promise<void>;

  verifyingNin: boolean;
  verifyingBvn: boolean;
  uploadingLicense: boolean;
  uploadingVehicle: boolean;

  verifyNinDebounced: (value: string) => void;
  verifyBvnDebounced: (value: string) => void;

  // Optional callbacks for upload state management
  onUploadingLicenseChange?: (uploading: boolean) => void;
  onUploadingVehicleChange?: (uploading: boolean) => void;
}

export default function KYCWizard({
  nin,
  bvn,
  address,
  driverLicenseNumber,
  driverLicensePicture,
  vehiclePicture,
  ninVerified,
  bvnVerified,
  driverLicenseVerified,
  vehicleType,
  onNinChange,
  onBvnChange,
  onAddressChange,
  onDriverLicenseNumberChange,
  onDriverLicensePictureChange,
  onVehiclePictureChange,
  onNinVerifiedChange,
  onBvnVerifiedChange,
  onDriverLicenseVerifiedChange,
  onCheckAuthStatus,
  verifyingNin,
  verifyingBvn,
  uploadingLicense,
  uploadingVehicle,
  verifyNinDebounced,
  verifyBvnDebounced,
  onUploadingLicenseChange,
  onUploadingVehicleChange,
}: KYCWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Calculate completion status
  const kycSteps = {
    identity: nin.trim().length > 0 || bvn.trim().length > 0,
    address: address.trim().length > 0,
    driverLicense:
      driverLicenseNumber.trim().length > 0 &&
      !!driverLicensePicture &&
      driverLicenseVerified,
    vehicle: !!vehiclePicture,
    allComplete:
      (nin.trim().length > 0 || bvn.trim().length > 0) &&
      address.trim().length > 0 &&
      driverLicenseNumber.trim().length > 0 &&
      !!driverLicensePicture &&
      driverLicenseVerified &&
      !!vehiclePicture,
  };

  useEffect(() => {
    // Only set initial step on first load, don't auto-advance when steps complete
    if (!kycSteps.identity) {
      setCurrentStep(1);
    } else if (!kycSteps.address) {
      setCurrentStep(2);
    } else if (!kycSteps.driverLicense) {
      setCurrentStep(3);
    } else if (!kycSteps.vehicle) {
      setCurrentStep(4);
    } else {
      setCurrentStep(4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount, not when kycSteps change

  const pickLicenseImage = async () => {
    try {
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
        onDriverLicensePictureChange(uri);
        onUploadingLicenseChange?.(true);

        try {
          const response = await uploadDriverLicense(uri);
          if (response.driverLicensePicture) {
            onDriverLicensePictureChange(response.driverLicensePicture);
            if (response.user?.driverLicenseVerified) {
              onDriverLicenseVerifiedChange(true);
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
            await onCheckAuthStatus();
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
        } finally {
          onUploadingLicenseChange?.(false);
        }
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error?.message || "Failed to pick image",
      });
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
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        onVehiclePictureChange(uri);
        onUploadingVehicleChange?.(true);

        try {
          const response = await uploadVehiclePicture(uri);
          if (response.vehiclePicture) {
            onVehiclePictureChange(response.vehiclePicture);
            Toast.show({
              type: "success",
              text1: "Vehicle picture uploaded",
              text2: "Your vehicle picture has been uploaded",
            });
            await onCheckAuthStatus();
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
        } finally {
          onUploadingVehicleChange?.(false);
        }
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error?.message || "Failed to pick image",
      });
    }
  };

  const handleDriverLicenseNumberChange = async (text: string) => {
    onDriverLicenseNumberChange(text);
    if (text.trim().length > 0 && driverLicensePicture) {
      setTimeout(async () => {
        try {
          const updateData: any = {
            driverLicenseNumber: text.trim(),
          };
          const response = await updateProfile(updateData);
          if (response?.user?.driverLicenseVerified) {
            onDriverLicenseVerifiedChange(true);
          } else {
            onDriverLicenseVerifiedChange(false);
          }
          await onCheckAuthStatus();
        } catch (error) {
          // Silent fail
        }
      }, 1500);
    } else {
      onDriverLicenseVerifiedChange(false);
    }
  };

  return (
    <>
      {/* Step Wizard Header */}
      <View className="bg-secondary rounded-2xl p-4 mb-6 border border-neutral-100">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-light-100 text-base font-semibold">
            Step {currentStep} of 4
          </Text>
          {kycSteps.allComplete && (
            <View className="flex-row items-center bg-green-500/20 px-2 py-1 rounded-lg">
              <Icons.safety
                name={IconNames.checkmarkCircle as any}
                size={14}
                color="#10B981"
              />
              <Text className="text-green-400 text-xs font-semibold ml-1">
                Complete
              </Text>
            </View>
          )}
        </View>

        {/* Step Indicators */}
        <View className="flex-row items-center justify-between mb-2">
          {[1, 2, 3, 4].map((step) => {
            const isCompleted =
              (step === 1 && kycSteps.identity) ||
              (step === 2 && kycSteps.address) ||
              (step === 3 && kycSteps.driverLicense) ||
              (step === 4 && kycSteps.vehicle);
            const isCurrent = currentStep === step;

            return (
              <React.Fragment key={step}>
                <TouchableOpacity
                  onPress={() => setCurrentStep(step)}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    isCompleted
                      ? "bg-green-500"
                      : isCurrent
                      ? "bg-accent border-2 border-accent"
                      : "bg-dark-100 border-2 border-neutral-100"
                  }`}
                >
                  {isCompleted ? (
                    <Text className="text-white text-xs font-bold">✓</Text>
                  ) : (
                    <Text
                      className={`text-xs font-bold ${
                        isCurrent ? "text-primary" : "text-light-400"
                      }`}
                    >
                      {step}
                    </Text>
                  )}
                </TouchableOpacity>
                {step < 4 && (
                  <View
                    className={`flex-1 h-0.5 mx-2 ${
                      isCompleted ? "bg-green-500" : "bg-neutral-100"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Step Labels */}
        <View className="flex-row justify-between">
          <Text className="text-light-400 text-xs text-center flex-1">
            Identity
          </Text>
          <Text className="text-light-400 text-xs text-center flex-1">
            Address
          </Text>
          <Text className="text-light-400 text-xs text-center flex-1">
            License
          </Text>
          <Text className="text-light-400 text-xs text-center flex-1">
            Vehicle
          </Text>
        </View>
      </View>

      {/* Step 1: Identity Verification */}
      {currentStep === 1 && (
        <>
          <View className="bg-secondary rounded-2xl p-5 border border-neutral-100 mb-4">
            <Text className="text-light-100 text-lg font-semibold mb-1">
              Identity Verification
            </Text>
            <Text className="text-light-400 text-xs mb-4">
              Provide at least one: NIN or BVN (you can verify both if you
              prefer)
            </Text>
            <Text className="text-light-300 text-sm mb-2">
              NIN (National Identification Number)
            </Text>
            <View className="relative">
              <TextInput
                value={nin}
                onChangeText={(text) => {
                  onNinChange(text);
                  onNinVerifiedChange(false);
                  verifyNinDebounced(text);
                }}
                placeholder="Enter your NIN (optional)"
                placeholderTextColor="#9CA4AB"
                keyboardType="numeric"
                className={`text-light-100 bg-dark-100 rounded-xl px-4 py-3 text-base pr-12 ${
                  ninVerified ? "border-2 border-green-500" : ""
                }`}
              />
              {verifyingNin && (
                <View className="absolute right-4 top-3">
                  <ActivityIndicator size="small" color="#AB8BFF" />
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
              <Text className="text-light-400 text-xs mt-1">
                At least one is required (NIN or BVN). You can verify both if
                you want.
              </Text>
            )}
          </View>

          <View className="bg-secondary rounded-2xl p-5 border border-neutral-100 mb-4">
            <Text className="text-light-300 text-sm mb-2">
              BVN (Bank Verification Number)
            </Text>
            <View className="relative">
              <TextInput
                value={bvn}
                onChangeText={(text) => {
                  onBvnChange(text);
                  onBvnVerifiedChange(false);
                  verifyBvnDebounced(text);
                }}
                placeholder="Enter your BVN (optional)"
                placeholderTextColor="#9CA4AB"
                keyboardType="numeric"
                className={`text-light-100 bg-dark-100 rounded-xl px-4 py-3 text-base pr-12 ${
                  bvnVerified ? "border-2 border-green-500" : ""
                }`}
              />
              {verifyingBvn && (
                <View className="absolute right-4 top-3">
                  <ActivityIndicator size="small" color="#AB8BFF" />
                </View>
              )}
              {bvnVerified && !verifyingBvn && (
                <View className="absolute right-4 top-3">
                  <Icons.safety
                    name={IconNames.checkmarkCircle as any}
                    size={20}
                    color="#10B981"
                  />
                </View>
              )}
            </View>
            {bvnVerified && !verifyingBvn && (
              <View className="flex-row items-center mt-2">
                <Text className="text-green-400 text-xs font-semibold">
                  ✓ Verified
                </Text>
              </View>
            )}
            {!bvnVerified && !verifyingBvn && (
              <Text className="text-light-400 text-xs mt-1">
                At least one is required (NIN or BVN). You can verify both if
                you want.
              </Text>
            )}
          </View>
        </>
      )}

      {/* Step 2: Address */}
      {currentStep === 2 && (
        <View className="bg-secondary rounded-2xl p-5 border border-neutral-100 mb-4">
          <Text className="text-light-100 text-lg font-semibold mb-1">
            Address Information
          </Text>
          <Text className="text-light-400 text-xs mb-4">
            Add your residential or business address
          </Text>
          <Text className="text-light-300 text-sm mb-2">Address</Text>
          <TextInput
            value={address}
            onChangeText={onAddressChange}
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
      )}

      {/* Step 3: Driver License */}
      {currentStep === 3 && (
        <>
          <View className="bg-secondary rounded-2xl p-5 border border-neutral-100 mb-4">
            <Text className="text-light-100 text-lg font-semibold mb-1">
              Driver License Verification
            </Text>
            <Text className="text-light-400 text-xs mb-4">
              Add your license number and take a selfie with your license
            </Text>
            <Text className="text-light-300 text-sm mb-2">
              Driver License Number
            </Text>
            <View className="relative">
              <TextInput
                value={driverLicenseNumber}
                onChangeText={handleDriverLicenseNumberChange}
                placeholder="Enter your driver license number"
                placeholderTextColor="#9CA4AB"
                className={`text-light-100 bg-dark-100 rounded-xl px-4 py-3 text-base pr-12 ${
                  driverLicenseVerified ? "border-2 border-green-500" : ""
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
              <Text className="text-light-400 text-xs mt-1">
                {driverLicensePicture
                  ? "Add license number to verify"
                  : "Add both license number and selfie to verify"}
              </Text>
            )}
          </View>

          <View className="bg-secondary rounded-2xl p-5 border border-neutral-100 mb-4">
            <Text className="text-light-300 text-sm mb-3">
              Selfie with License
            </Text>
            <View className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-3">
              <Text className="text-blue-300 text-xs font-semibold mb-1">
                📸 Security Requirement
              </Text>
              <Text className="text-light-300 text-xs">
                Take a clear selfie holding your driver license next to your
                face. This helps us verify your identity and prevent fraud.
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
              <View className="mb-3 bg-dark-100 rounded-xl p-8 items-center justify-center border-2 border-dashed border-neutral-100">
                <Icons.media
                  name={IconNames.cameraOutline as any}
                  size={48}
                  color="#9CA4AB"
                />
                <Text className="text-light-400 text-xs mt-2 text-center">
                  No selfie uploaded
                </Text>
                <Text className="text-light-500 text-xs mt-1 text-center">
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
            <Text className="text-light-400 text-xs mt-2">
              Take a clear selfie holding your license next to your face. Make
              sure both your face and the license are clearly visible.
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

      {/* Step 4: Vehicle Picture */}
      {currentStep === 4 && (
        <View className="bg-secondary rounded-2xl p-5 border border-neutral-100 mb-4">
          <Text className="text-light-100 text-lg font-semibold mb-1">
            Vehicle Picture
          </Text>
          <Text className="text-light-400 text-xs mb-4">
            Upload a clear picture of your vehicle
          </Text>
          <Text className="text-light-300 text-sm mb-3">Vehicle Picture</Text>
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
                    <ActivityIndicator size="large" color="#AB8BFF" />
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View className="mb-3 bg-dark-100 rounded-xl p-8 items-center justify-center border-2 border-dashed border-neutral-100">
              <Icons.media
                name={IconNames.cameraOutline as any}
                size={48}
                color="#9CA4AB"
              />
              <Text className="text-light-400 text-xs mt-2 text-center">
                No vehicle picture uploaded
              </Text>
            </View>
          )}
          <TouchableOpacity
            onPress={pickVehicleImage}
            disabled={uploadingVehicle}
            className="bg-accent/20 border border-accent rounded-xl py-3 px-4 items-center"
          >
            {uploadingVehicle ? (
              <ActivityIndicator size="small" color="#AB8BFF" />
            ) : (
              <Text className="text-accent font-semibold">
                {vehiclePicture
                  ? "Change Vehicle Picture"
                  : "Upload Vehicle Picture"}
              </Text>
            )}
          </TouchableOpacity>
          <Text className="text-light-400 text-xs mt-2">
            Upload a clear picture of your{" "}
            {vehicleType === "motorcycle" ? "motorcycle" : "car/van"}
          </Text>
        </View>
      )}

      {/* Navigation Buttons */}
      <View className="flex-row gap-3 mt-4">
        {currentStep > 1 && (
          <TouchableOpacity
            onPress={() => setCurrentStep(currentStep - 1)}
            className="flex-1 bg-dark-100 border border-neutral-100 rounded-xl py-3 items-center"
          >
            <Text className="text-light-200 font-semibold">Previous</Text>
          </TouchableOpacity>
        )}
        {currentStep < 4 && (
          <TouchableOpacity
            onPress={() => {
              if (
                (currentStep === 1 && kycSteps.identity) ||
                (currentStep === 2 && kycSteps.address) ||
                (currentStep === 3 && kycSteps.driverLicense)
              ) {
                setCurrentStep(currentStep + 1);
              } else {
                Toast.show({
                  type: "info",
                  text1: "Complete this step first",
                  text2: "Please fill in the required information",
                });
              }
            }}
            className={`flex-1 rounded-xl py-3 items-center ${
              (currentStep === 1 && kycSteps.identity) ||
              (currentStep === 2 && kycSteps.address) ||
              (currentStep === 3 && kycSteps.driverLicense)
                ? "bg-accent"
                : "bg-accent/50"
            }`}
          >
            <Text className="text-primary font-bold">Next</Text>
          </TouchableOpacity>
        )}
        {currentStep === 4 && kycSteps.allComplete && (
          <View className="flex-1 bg-green-500/20 border border-green-500/30 rounded-xl py-3 items-center">
            <Text className="text-green-400 font-semibold">
              ✓ All Steps Complete
            </Text>
          </View>
        )}
      </View>
    </>
  );
}
