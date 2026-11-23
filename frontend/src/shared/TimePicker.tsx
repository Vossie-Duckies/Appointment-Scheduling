import { StyleSheet, Text, View } from "react-native";
import Chip from "./Chip";

// Pick a time in two taps: the hour, then the minutes (:00, :15, :30, :45).
// Works the same on Android, iOS and the web.

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES = [0, 15, 30, 45];
const pad = (value: number) => String(value).padStart(2, "0");

interface TimePickerProps {
  label: string;
  value: string; // "HH:MM"
  onChange: (value: string) => void;
}

const styles = StyleSheet.create({
  box: { marginBottom: 18 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  label: { fontSize: 15, color: "#696969" },
  value: { fontSize: 22, fontWeight: "700", color: "#222" },
  hours: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  minutes: { flexDirection: "row", gap: 8, marginTop: 8 },
});

export default function TimePicker({ label, value, onChange }: TimePickerProps) {
  const [hour, minute] = value.split(":").map(Number);
  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <View style={styles.hours}>
        {HOURS.map((h) => (
          <Chip
            key={h}
            compact
            label={pad(h)}
            selected={h === hour}
            onPress={() => onChange(`${pad(h)}:${pad(minute)}`)}
            accessibilityLabel={`${label}: ${pad(h)} hours`}
          />
        ))}
      </View>
      <View style={styles.minutes}>
        {MINUTES.map((m) => (
          <Chip
            key={m}
            label={`:${pad(m)}`}
            selected={m === minute}
            onPress={() => onChange(`${pad(hour)}:${pad(m)}`)}
            accessibilityLabel={`${label}: ${pad(m)} minutes`}
          />
        ))}
      </View>
    </View>
  );
}
