import { IconNames, Icons } from "@/constants/icons";
import { useTheme } from "@/contexts/ThemeContext";
import {
  AddressSuggestion,
  getAddressSuggestions,
} from "@/services/geocodingApi";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  fetchSuggestions?: (query: string) => Promise<AddressSuggestion[]>;
}

export default function AddressAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder = "Enter address...",
  editable = true,
  className = "",
  fetchSuggestions,
}: AddressAutocompleteProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const lastSelectedValueRef = useRef<string | null>(null); // Track last selected value
  const userTypingRef = useRef(false); // Track if user is actively typing

  /** ============================
   *  FETCH SUGGESTIONS (DEBOUNCED)
   * ============================ */
  useEffect(() => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const text = value.trim();

    // If empty, clear suggestions immediately
    if (!text) {
      setSuggestions([]);
      setShowSuggestions(false);
      lastSelectedValueRef.current = null;
      return;
    }

    if (text === lastSelectedValueRef.current && !userTypingRef.current) {
      return;
    }

    userTypingRef.current = false;

    debounceRef.current = setTimeout(async () => {
      setLoading(true);

      try {
        const result = fetchSuggestions
          ? await fetchSuggestions(text)
          : await getAddressSuggestions(text, 8);

        setSuggestions(result || []);
        setShowSuggestions((result || []).length > 0);
      } catch (error) {
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setLoading(false);
      }
    }, 600); // 600ms debounce - mobile-friendly

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, fetchSuggestions]);

  /** ============================
   *  SELECT A SUGGESTION
   * ============================ */
  const handleSelect = (item: AddressSuggestion) => {
    const finalText = item.displayAddress || item.address;

    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Hide suggestions immediately
    setShowSuggestions(false);
    setSuggestions([]);
    setLoading(false);

    // Mark this as the last selected value
    lastSelectedValueRef.current = finalText;
    userTypingRef.current = false;

    // Update the input value
    onChangeText(finalText);
    onSelect(item);

    // Keep input focused so user can continue typing if needed
    // Don't blur - let user edit if they want
  };

  /** ============================
   *  HANDLE USER TYPING
   * ============================ */
  const handleChangeText = (text: string) => {
    // Mark that user is actively typing
    userTypingRef.current = true;

    // If user is typing something different from last selection, clear the ref
    if (text !== lastSelectedValueRef.current) {
      lastSelectedValueRef.current = null;
    }

    // Update parent state
    onChangeText(text);
  };

  return (
    <View style={{ zIndex: 999, position: "relative" }}>
      {/* INPUT FIELD */}
      <View className="relative">
        <TextInput
          ref={inputRef}
          value={value}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor="#9CA4AB"
          className={`rounded-xl px-4 py-3.5 border ${
            isDark
              ? "text-light-100 bg-dark-100 border-neutral-100"
              : "text-black bg-gray-100 border-gray-200"
          } ${className}`}
          onFocus={() => {
            // Show suggestions if we have them
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            // Close suggestions after a short delay (allows clicks to register)
            setTimeout(() => {
              setShowSuggestions(false);
            }, 200);
          }}
          onChangeText={handleChangeText}
          onLayout={(e) => {
            const { height } = e.nativeEvent.layout;
            setInputHeight(height);
          }}
          style={{
            paddingRight: loading ? 40 : 16,
          }}
        />

        {/* LOADING INDICATOR */}
        {loading && (
          <View
            className="absolute right-0 top-0 bottom-0 justify-center px-4"
            pointerEvents="none"
          >
            <ActivityIndicator size="small" color="#AB8BFF" />
          </View>
        )}
      </View>

      {/* SUGGESTIONS DROPDOWN (NO MODAL - WON'T BLOCK KEYBOARD) */}
      {showSuggestions && suggestions.length > 0 && (
        <View
          style={{
            position: "absolute",
            top: inputHeight + 8,
            left: 0,
            right: 0,
            backgroundColor: isDark ? "#1F2937" : "white",
            borderRadius: 16,
            maxHeight: 260,
            borderWidth: 1,
            borderColor: isDark ? "#374151" : "#E5E7EB",
            overflow: "hidden",
            elevation: 10,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 10,
            zIndex: 9999,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={true}
          >
            {suggestions.map((item, i) => (
              <TouchableOpacity
                key={`${item.address}-${i}`}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderBottomWidth: i === suggestions.length - 1 ? 0 : 1,
                  borderBottomColor: isDark ? "#374151" : "#E5E7EB",
                }}
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
                      className={`text-sm font-semibold ${
                        isDark ? "text-light-100" : "text-black"
                      }`}
                    >
                      {item.displayAddress || item.address}
                    </Text>

                    {(item.components.city || item.components.state) && (
                      <Text
                        className={`text-xs mt-1 ${
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
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* CLICK OUTSIDE TO CLOSE (Positioned to not interfere with input) */}
      {showSuggestions && (
        <Pressable
          onPress={() => setShowSuggestions(false)}
          style={{
            position: "absolute",
            top: inputHeight + 8 + 260, // Below suggestions
            bottom: -1000,
            left: -1000,
            right: -1000,
            zIndex: 9998,
          }}
        />
      )}
    </View>
  );
}
