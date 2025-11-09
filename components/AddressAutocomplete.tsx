import { IconNames, Icons } from "@/constants/icons";
import { useTheme } from "@/contexts/ThemeContext";
import {
  AddressSuggestion,
  getAddressSuggestions,
} from "@/services/geocodingApi";
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder = "Enter address...",
  editable = true,
  className = "",
}: AddressAutocompleteProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSelected, setHasSelected] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const debounceTimer = useRef<number | null>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!value || value.trim().length < 10) {
      setSuggestions([]);
      setShowSuggestions(false);
      setNoResults(false);
      if (value.trim().length === 0) {
        setHasSelected(false);
      }
      return;
    }

    if (hasSelected) {
      return;
    }

    setLoading(true);
    setNoResults(false);
    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await getAddressSuggestions(value.trim(), 10);
        setSuggestions(results);
        if (results.length > 0) {
          setShowSuggestions(true);
          setNoResults(false);
        } else {
          setShowSuggestions(false);
          if (value.trim().length >= 10) {
            setNoResults(true);
          }
        }
      } catch (error) {
        console.error("[AUTOCOMPLETE] Failed to get suggestions:", error);
        setSuggestions([]);
        setShowSuggestions(false);
        setNoResults(false);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [value, hasSelected, isFocused]);

  const handleSelect = (suggestion: AddressSuggestion) => {
    const selectedAddress = suggestion.displayAddress || suggestion.address;

    // Update the input value immediately so user sees the selected address
    onChangeText(selectedAddress);

    // Call onSelect to set coordinates in parent component
    onSelect(suggestion);

    // Mark as selected and hide suggestions
    setHasSelected(true);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleOutsidePress = () => {
    if (showSuggestions) {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  return (
    <View
      className="relative"
      style={{
        zIndex: 1000, // High z-index for the container
        overflow: "visible",
      }}
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          if (hasSelected) {
            setHasSelected(false);
          }
          setNoResults(false);
        }}
        onLayout={(e) => {
          const { height } = e.nativeEvent.layout;
          setInputHeight(height);
        }}
        onFocus={() => {
          setIsFocused(true);
          // If we have existing suggestions, show them immediately
          if (!hasSelected && suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        onBlur={() => {
          // Delay blur to allow selection
          setTimeout(() => {
            setIsFocused(false);
            // Only hide if user hasn't selected (they might be clicking a suggestion)
            if (!hasSelected) {
              setShowSuggestions(false);
            }
          }, 300);
        }}
        placeholder={placeholder}
        placeholderTextColor="#9CA4AB"
        editable={editable}
        className={`rounded-xl px-4 py-3.5 border ${
          isDark
            ? "text-light-100 bg-dark-100 border-neutral-100"
            : "text-black bg-gray-100 border-gray-200"
        } ${className}`}
      />

      {/* Suggestions Dropdown - Using Modal for proper layering */}
      <Modal
        visible={showSuggestions && suggestions.length > 0}
        transparent={true}
        animationType="fade"
        onRequestClose={handleOutsidePress}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.1)" }}
          onPress={handleOutsidePress}
        >
          <View style={{ flex: 1 }} />
        </Pressable>
      </Modal>

      {/* Suggestions Dropdown - Positioned absolutely below input */}
      {showSuggestions && suggestions.length > 0 && (
        <View
          className={`absolute left-0 right-0 border rounded-2xl max-h-64 ${
            isDark
              ? "bg-secondary border-neutral-100"
              : "bg-white border-gray-200"
          }`}
          style={{
            top: inputHeight > 0 ? inputHeight + 8 : 56, // Position below input field with 8px margin
            zIndex: 10000, // Very high z-index to appear above everything
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0.3 : 0.2,
            shadowRadius: 16,
            elevation: 50, // Very high elevation for Android
            position: "absolute",
          }}
        >
          <ScrollView
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <View className="px-4 py-3 items-center">
                <Text
                  className={`text-sm ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Searching...
                </Text>
              </View>
            ) : (
              suggestions.map((item, index) => (
                <TouchableOpacity
                  key={`${item.address}-${item.lat}-${item.lng}-${index}`}
                  onPress={() => handleSelect(item)}
                  className={`px-4 py-3.5 ${
                    index < suggestions.length - 1
                      ? isDark
                        ? "border-b border-neutral-100/30"
                        : "border-b border-gray-200/50"
                      : ""
                  } active:opacity-70 ${
                    isDark ? "active:bg-dark-100" : "active:bg-gray-50"
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start">
                    <View className="bg-info/20 rounded-lg p-2 mr-3 mt-0.5">
                      <Icons.location
                        name={IconNames.locationOutline as any}
                        size={18}
                        color="#5AC8FA"
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-semibold mb-1 ${
                          isDark ? "text-light-100" : "text-black"
                        }`}
                      >
                        {item.displayAddress || item.address}
                      </Text>
                      {item.components.city || item.components.state ? (
                        <Text
                          className={`text-xs mt-0.5 ${
                            isDark ? "text-light-400" : "text-gray-500"
                          }`}
                        >
                          {[
                            item.components.city || item.components.town,
                            item.components.state,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* No Results Error Message */}
      {noResults && !loading && value.trim().length >= 10 && (
        <View className="mt-2">
          <Text className="text-red-500 text-xs">
            ❌ No results found for "{value.trim()}". Please be more specific
            (e.g., "Lekki Phase 1, Lagos" instead of just "Lekki").
          </Text>
        </View>
      )}
    </View>
  );
}
