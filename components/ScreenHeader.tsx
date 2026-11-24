import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  className?: string;
}

export default function ScreenHeader({
  title,
  onBack,
  rightElement,
  className = "",
}: ScreenHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View className={`flex-row items-center px-5 py-3.5 bg-transparent ${className}`}>
      <TouchableOpacity
        onPress={handleBack}
        className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-xs border border-gray-200 mr-3.5 active:bg-gray-50"
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={20} color="#1e293b" />
      </TouchableOpacity>

      <Text
        className="text-xl font-bold text-gray-900 flex-1"
        numberOfLines={1}
      >
        {title}
      </Text>

      {rightElement ? <View className="ml-2">{rightElement}</View> : null}
    </View>
  );
}
