import { IconNames, Icons } from "@/constants/icons";
import {
  AddressSuggestion,
  getAddressSuggestions,
} from "@/services/geocodingApi";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
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
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!value || value.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await getAddressSuggestions(value.trim(), 5);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error("Failed to get suggestions:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [value]);

  const handleSelect = (suggestion: AddressSuggestion) => {
    onChangeText(suggestion.displayAddress || suggestion.address);
    onSelect(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <View className="relative">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        onBlur={() => {
          // Delay hiding to allow selection
          setTimeout(() => setShowSuggestions(false), 200);
        }}
        placeholder={placeholder}
        placeholderTextColor="#9CA4AB"
        editable={editable}
        className={`text-light-100 bg-dark-100 rounded-xl px-4 py-3.5 border border-neutral-100 ${className}`}
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View
          className="absolute top-full left-0 right-0 mt-1 bg-secondary border border-neutral-100 rounded-2xl z-50 max-h-64"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) =>
              `${item.address}-${item.lat}-${item.lng}-${index}`
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                className="px-4 py-3 border-b border-neutral-100/30 active:bg-dark-100"
              >
                <View className="flex-row items-start">
                  <View className="bg-info/20 rounded-lg p-1.5 mr-3 mt-0.5">
                    <Icons.location
                      name={IconNames.locationOutline as any}
                      size={16}
                      color="#5AC8FA"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-light-100 text-sm font-medium mb-0.5">
                      {item.displayAddress || item.address}
                    </Text>
                    {item.components.city || item.components.state ? (
                      <Text className="text-light-400 text-xs">
                        {[
                          item.components.city || item.components.town,
                          item.components.state,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                    ) : null}
                    {item.confidence < 7 && (
                      <View className="flex-row items-center mt-1">
                        <View className="bg-warning/20 rounded px-1.5 py-0.5">
                          <Text className="text-warning text-[10px] font-medium">
                            Low confidence
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              loading ? (
                <View className="px-4 py-3 items-center">
                  <Text className="text-light-400 text-sm">Searching...</Text>
                </View>
              ) : null
            }
          />
        </View>
      )}
    </View>
  );
}
