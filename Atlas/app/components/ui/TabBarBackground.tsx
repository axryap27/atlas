// app/components/ui/TabBarBackground.tsx
import { StyleSheet, View } from 'react-native';

// Fallback component for non-iOS platforms
export default function TabBarBackground() {
  return <View style={StyleSheet.absoluteFill} />;
}

export function useBottomTabOverflow() {
  return 0; // Fallback value for non-iOS
}