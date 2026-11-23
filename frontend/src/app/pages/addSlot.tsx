import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import Toast from "react-native-toast-message";
import { createDoctorSlot } from "@/app/api/auth";
import { styles as globalStyles } from "@/app/Styles/global";
import Chip, { RED } from "@/shared/Chip";
import TimePicker from "@/shared/TimePicker";
import { addMinutes, formatDay, isoDate, startsAfter } from "@/shared/schedule";

// Schedule tab -> "+ Add slot": one open slot on one day.

const LENGTHS = [15, 20, 30, 45, 60];

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 70, paddingBottom: 40, backgroundColor: "#fff" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  summary: { fontSize: 16, fontWeight: "600", textAlign: "center", marginTop: 6 },
  hint: { color: "#b00000", textAlign: "center", marginTop: 6 },
});

export default function AddSlotScreen() {
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const today = isoDate(new Date());
  const requested = Array.isArray(params.date) ? params.date[0] : params.date;
  const [slotDate, setSlotDate] = useState(requested && requested >= today ? requested : today);
  const [start, setStart] = useState("09:00");
  const [minutes, setMinutes] = useState(30);
  const [isSaving, setIsSaving] = useState(false);
  const busy = useRef(false);

  const end = addMinutes(start, minutes);
  const hasPassed = !startsAfter(slotDate, start);
  const canSave = end !== null && !hasPassed && !isSaving;

  async function save() {
    if (!canSave || end === null || busy.current) return;
    busy.current = true;
    setIsSaving(true);
    try {
      await createDoctorSlot({ slot_date: slotDate, start_time: start, end_time: end });
      Toast.show({ type: "success", text1: "Slot added", text2: `${formatDay(slotDate)}, ${start}–${end}` });
      router.back();
    } catch (err: any) {
      Toast.show({ type: "error", text1: "Couldn't add the slot", text2: err?.message || "Please try again." });
    } finally {
      busy.current = false;
      setIsSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={globalStyles.backButton} onPress={() => router.back()} accessibilityRole="button">
        <Text style={{ color: "#3F3FC4" }}>Back</Text>
      </Pressable>
      <Text style={globalStyles.heading}>Add a Slot</Text>

      <Text style={globalStyles.label}>Day</Text>
      <Calendar
        current={slotDate}
        minDate={today}
        hideExtraDays
        onDayPress={(day: { dateString: string }) => {
          if (day.dateString >= today) setSlotDate(day.dateString);
        }}
        markedDates={{ [slotDate]: { selected: true, selectedColor: RED } }}
        theme={{ todayTextColor: RED, arrowColor: RED }}
      />

      <View style={{ height: 16 }} />
      <TimePicker label="Starts at" value={start} onChange={setStart} />

      <Text style={globalStyles.label}>Length</Text>
      <View style={styles.row}>
        {LENGTHS.map((length) => (
          <Chip
            key={length}
            label={`${length} min`}
            selected={length === minutes}
            disabled={addMinutes(start, length) === null}
            onPress={() => setMinutes(length)}
          />
        ))}
      </View>

      <Text style={styles.summary}>
        {formatDay(slotDate)}, {start}–{end ?? "--:--"}
      </Text>
      {end === null ? <Text style={styles.hint}>A slot has to end before midnight.</Text> : null}
      {end !== null && hasPassed ? <Text style={styles.hint}>That time has passed. Pick a later time.</Text> : null}

      <Pressable
        style={[globalStyles.button, { marginTop: 24 }, !canSave && globalStyles.buttonFaded]}
        disabled={!canSave}
        onPress={save}
        accessibilityRole="button"
      >
        <Text style={globalStyles.buttonText}>{isSaving ? "Saving..." : "Add slot"}</Text>
      </Pressable>
    </ScrollView>
  );
}
