import { Pressable, StyleSheet, Text } from "react-native";

// A small tappable option (a day, a time, a slot length...). Matches the
// time chips on the Update screen.

export const RED = "#C40018";

interface ChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  compact?: boolean;
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: "#EEEEF2",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  compact: {
    paddingVertical: 8,
    paddingHorizontal: 0,
    width: 36, // 8 hours fit across a small phone
  },
  selected: { backgroundColor: RED },
  disabled: { opacity: 0.35 },
  text: { color: "#222" },
  selectedText: { color: "#fff", fontWeight: "700" },
});

export default function Chip({ label, selected = false, disabled = false, onPress, accessibilityLabel, compact = false }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, compact && styles.compact, selected && styles.selected, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
    >
      <Text style={selected ? styles.selectedText : styles.text}>{label}</Text>
    </Pressable>
  );
}
