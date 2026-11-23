import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

// Shown instead of an empty list when data could not be loaded (no internet,
// server down, session expired), so "No appointments found" only ever means
// there really are none.

interface LoadErrorProps {
  message: string;
  onRetry: () => void;
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  message: {
    color: "#b00000",
    textAlign: "center",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#d00000",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
});

export default function LoadError({ message, onRetry }: LoadErrorProps) {
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={styles.button} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.buttonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}
