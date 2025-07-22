import { useBottomTabBarHeight } from "@/node_modules/@react-navigation/bottom-tabs/lib/typescript/src";
import { BlurView } from "expo-blur";
import { StyleSheet } from "react-native";

export default function BlurTabBarBackground() {
  return (
    <BlurView
      // System chrome material automatically adapts to the system's theme
      // and matches the native tab bar appearance on iOS.
      tint="systemChromeMaterial"
      intensity={100}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
