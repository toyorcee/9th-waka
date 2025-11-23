import { IconNames, Icons } from "@/constants/icons";
import { useTheme } from "@/contexts/ThemeContext";
import { createRating } from "@/services/orderApi";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, { FadeInDown, SlideInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  riderId?: string;
  existingRating?: {
    rating: number;
    comment?: string | null;
  } | null;
  onRatingSubmitted?: () => void;
}

export default function RatingModal({
  visible,
  onClose,
  orderId,
  riderId,
  existingRating,
  onRatingSubmitted,
}: RatingModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingRating?.comment || "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setRating(existingRating?.rating || 0);
      setComment(existingRating?.comment || "");
      setHoveredRating(0);
    }
  }, [visible, existingRating]);

  const handleSubmit = async () => {
    if (rating === 0) {
      Toast.show({
        type: "error",
        text1: "Rating Required",
        text2: "Please select a rating before submitting",
      });
      return;
    }

    setSubmitting(true);
    try {
      await createRating(orderId, rating, comment.trim() || null);

      Toast.show({
        type: "success",
        text1: existingRating ? "Rating Updated" : "Rating Submitted",
        text2: "Thank you for your feedback!",
      });

      onRatingSubmitted?.();
      onClose();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2:
          error.response?.data?.error ||
          error.message ||
          "Failed to submit rating",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const StarButton = ({ value }: { value: number }) => {
    const isActive = value <= rating;
    const isHovered = hoveredRating > 0 && value <= hoveredRating;
    const shouldShow = isActive || isHovered;

    return (
      <TouchableOpacity
        onPress={() => {
          setRating(value);
          setHoveredRating(0); // Clear hover after selection
        }}
        onPressIn={() => setHoveredRating(value)}
        onPressOut={() => {
          // Only clear hover if no rating is selected yet
          if (rating === 0) {
            setHoveredRating(0);
          }
        }}
        activeOpacity={0.6}
        style={{
          marginHorizontal: 6,
          padding: 4,
        }}
      >
        <Icons.action
          name={IconNames.star as any}
          size={52}
          color={
            shouldShow
              ? isDark
                ? "#FBBF24" // Gold for dark mode
                : "#F59E0B" // Amber for light mode
              : isDark
              ? "#4B5563" // Gray for dark mode
              : "#D1D5DB" // Light gray for light mode
          }
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-end"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
      >
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={onClose}
        />
        <Reanimated.View
          entering={SlideInUp.springify()}
          className={`rounded-t-3xl ${isDark ? "bg-secondary" : "bg-white"}`}
          style={{
            paddingBottom: insets.bottom + 20,
            maxHeight: "80%",
          }}
        >
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 24 }}
          >
            {/* Header */}
            <Reanimated.View entering={FadeInDown.delay(100)}>
              <View className="flex-row items-center justify-between mb-6">
                <View className="flex-1">
                  <Text
                    className={`text-2xl font-bold ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    {existingRating ? "Update Rating" : "Rate Your Rider"}
                  </Text>
                  <Text
                    className={`text-sm mt-1 ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    {existingRating
                      ? "Update your rating for this delivery"
                      : "How was your delivery experience?"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  className={`p-2 rounded-full ${
                    isDark ? "bg-dark-100" : "bg-gray-100"
                  }`}
                >
                  <Icons.action
                    name={IconNames.close as any}
                    size={24}
                    color={isDark ? "#E6E6F0" : "#1F2937"}
                  />
                </TouchableOpacity>
              </View>
            </Reanimated.View>

            {/* Star Rating */}
            <Reanimated.View
              entering={FadeInDown.delay(200)}
              className="items-center mb-6"
            >
              <Text
                className={`text-sm mb-4 ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                Tap a star to rate
              </Text>
              <View className="flex-row items-center justify-center mb-4">
                {[1, 2, 3, 4, 5].map((value) => (
                  <StarButton key={value} value={value} />
                ))}
              </View>
              {rating > 0 && (
                <View className="items-center">
                  <Text
                    className={`text-2xl font-bold mb-1 ${
                      isDark ? "text-accent" : "text-blue-600"
                    }`}
                  >
                    {rating}/5
                  </Text>
                  <Text
                    className={`text-base font-semibold ${
                      isDark ? "text-light-200" : "text-gray-700"
                    }`}
                  >
                    {rating === 1
                      ? "Poor"
                      : rating === 2
                      ? "Fair"
                      : rating === 3
                      ? "Good"
                      : rating === 4
                      ? "Very Good"
                      : "Excellent"}
                  </Text>
                </View>
              )}
            </Reanimated.View>

            {/* Comment Input */}
            <Reanimated.View entering={FadeInDown.delay(300)}>
              <Text
                className={`text-sm font-semibold mb-2 ${
                  isDark ? "text-light-200" : "text-gray-700"
                }`}
              >
                Add a comment (optional)
              </Text>
              <TextInput
                className={`rounded-xl p-4 border ${
                  isDark
                    ? "bg-dark-100 border-neutral-800 text-light-100"
                    : "bg-gray-50 border-gray-200 text-black"
                }`}
                placeholder="Share your experience..."
                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                maxLength={500}
                style={{
                  textAlignVertical: "top",
                  minHeight: 100,
                }}
              />
              <Text
                className={`text-xs mt-1 text-right ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                {comment.length}/500
              </Text>
            </Reanimated.View>

            {/* Submit Button */}
            <Reanimated.View entering={FadeInDown.delay(400)} className="mt-6">
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting || rating === 0}
                className={`rounded-xl py-4 items-center justify-center ${
                  rating === 0 || submitting
                    ? isDark
                      ? "bg-gray-700"
                      : "bg-gray-300"
                    : isDark
                    ? "bg-accent"
                    : "bg-blue-600"
                }`}
                activeOpacity={0.7}
              >
                {submitting ? (
                  <ActivityIndicator
                    size="small"
                    color={isDark ? "#030014" : "#FFFFFF"}
                  />
                ) : (
                  <Text
                    className={`font-bold text-base ${
                      rating === 0 || submitting
                        ? isDark
                          ? "text-gray-400"
                          : "text-gray-500"
                        : isDark
                        ? "text-primary"
                        : "text-white"
                    }`}
                  >
                    {existingRating ? "Update Rating" : "Submit Rating"}
                  </Text>
                )}
              </TouchableOpacity>
            </Reanimated.View>
          </ScrollView>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
