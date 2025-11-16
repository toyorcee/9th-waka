import { useTheme } from "@/contexts/ThemeContext";
import { AddressSuggestion } from "@/services/geocodingApi";
import React from "react";
import { Text, View } from "react-native";
import AddressAutocomplete from "./AddressAutocomplete";

interface AddressFieldProps {
  label?: string;
  value: string;
  onChange: (text: string) => void;
  onSelect?: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  fetchSuggestions?: (query: string) => Promise<AddressSuggestion[]>;
}

export default function AddressField({
  label,
  value,
  onChange,
  onSelect,
  placeholder,
  editable = true,
  className = "",
  fetchSuggestions,
}: AddressFieldProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <View className={`mb-4 w-full ${className}`}>
      {label && (
        <Text
          className={`text-sm font-semibold mb-2 ${
            isDark ? "text-light-100" : "text-gray-700"
          }`}
        >
          {label}
        </Text>
      )}
      <AddressAutocomplete
        value={value}
        onChangeText={onChange}
        onSelect={onSelect || (() => {})}
        placeholder={placeholder || label}
        editable={editable}
        fetchSuggestions={fetchSuggestions}
      />
    </View>
  );
}
