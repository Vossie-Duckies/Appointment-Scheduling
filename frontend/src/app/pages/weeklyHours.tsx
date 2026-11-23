import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import Toast from "react-native-toast-message";
import { addWeeklyHours, removeWeeklyHours } from "@/app/api/auth";
import { styles as globalStyles } from "@/app/Styles/global";
import type { WeeklyHours } from "@/app/types/auth";
import Chip, { RED } from "@/shared/Chip";
import TimePicker from "@/shared/TimePicker";
import { confirmAction } from "@/shared/confirm";
import {
  WEEKDAY_LABELS,
  addDays,
  countWeeklySlots,
  describeWeekdays,
  formatDay,
  formatDayRange,
  isoDate,
  nextMonday,
  toMinutes,
} from "@/shared/schedule";

// Schedule tab -> "Weekly hours": add open slots for the same days and hours
// every week (e.g. Mon-Fri 09:00-17:00 in 30-minute slots for 4 weeks), or
// remove the unbooked slots in those hours.

type Mode = "add" | "remove";
type StartChoice = "today" | "monday" | "pick";

const LENGTHS = [15, 20, 30, 45, 60];
const MAX_WEEKS = 12;
const MAX_SLOTS = 1000; // the server refuses more in one go

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 70, paddingBottom: 40, backgroundColor: "#fff" },
  tabs: { flexDirection: "row", borderRadius: 8, backgroundColor: "#EEEEF2", padding: 3, marginBottom: 18 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 6, alignItems: "center" },
  tabSelected: { backgroundColor: "#fff" },
  tabText: { color: "#555", fontWeight: "600" },
  tabTextSelected: { color: RED, fontWeight: "700" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 18 },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEEEF2",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { fontSize: 20, fontWeight: "700", color: "#222" },
  weeks: { fontSize: 16, fontWeight: "600", minWidth: 80, textAlign: "center" },
  summaryBox: { backgroundColor: "#F7F7F9", borderRadius: 8, padding: 12, marginTop: 4, gap: 4 },
  summary: { fontSize: 15, color: "#222" },
  note: { fontSize: 12, color: "#666" },
  error: { color: "#b00000", marginTop: 8 },
});

export default function WeeklyHoursScreen() {
  const today = isoDate(new Date());
  const [mode, setMode] = useState<Mode>("add");
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [startChoice, setStartChoice] = useState<StartChoice>("today");
  const [pickedDate, setPickedDate] = useState(today);
  const [weeks, setWeeks] = useState(4);
  const [isSaving, setIsSaving] = useState(false);
  const busy = useRef(false);

  const startDate = startChoice === "today" ? today : startChoice === "monday" ? nextMonday(today) : pickedDate;
  const lastDate = addDays(startDate, weeks * 7 - 1);
  const count = countWeeklySlots(startDate, weeks, weekdays, start, end, slotMinutes);

  let problem: string | null = null;
  if (weekdays.length === 0) problem = "Choose at least one day.";
  else if (toMinutes(end) <= toMinutes(start)) problem = "The end time must be later than the start time.";
  else if (mode === "add" && count.perDay === 0) problem = `${start}–${end} is shorter than one ${slotMinutes}-minute slot.`;
  else if (mode === "add" && count.total > MAX_SLOTS) {
    problem = `That's ${count.total} slots, more than ${MAX_SLOTS} at once. Choose fewer weeks or longer slots.`;
  } else if (count.days === 0) problem = "None of the chosen days fall in this period.";

  function toggleDay(day: number) {
    setWeekdays((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b)));
  }

  const request: WeeklyHours = {
    weekdays,
    start_time: start,
    end_time: end,
    start_date: startDate,
    weeks,
    ...(mode === "add" ? { slot_minutes: slotMinutes } : {}),
  };
  const period = formatDayRange(startDate, lastDate);
  const days = describeWeekdays(weekdays);

  async function submit() {
    if (problem || busy.current) return;
    busy.current = true;
    setIsSaving(true);
    try {
      const result = mode === "add" ? await addWeeklyHours(request) : await removeWeeklyHours(request);
      // The app's toast styles (src/app/_layout.tsx) define success and error only.
      Toast.show({
        type: "success",
        text1: mode === "add" ? "Weekly hours saved" : "Slots removed",
        text2: result.message,
      });
      router.back();
    } catch (err: any) {
      Toast.show({ type: "error", text1: "Couldn't update your schedule", text2: err?.message || "Please try again." });
    } finally {
      busy.current = false;
      setIsSaving(false);
    }
  }

  function onSubmitPressed() {
    if (mode === "add") {
      submit();
      return;
    }
    confirmAction(
      "Remove these slots?",
      `Slots between ${start} and ${end} on ${days}, ${period}, will be deleted. Booked appointments are kept.`,
      "Remove",
      submit,
      { destructive: true },
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={globalStyles.backButton} onPress={() => router.back()} accessibilityRole="button">
        <Text style={{ color: "#3F3FC4" }}>Back</Text>
      </Pressable>
      <Text style={globalStyles.heading}>Weekly Hours</Text>

      <View style={styles.tabs} accessibilityRole="tablist">
        {(["add", "remove"] as Mode[]).map((option) => (
          <Pressable
            key={option}
            style={[styles.tab, mode === option && styles.tabSelected]}
            onPress={() => setMode(option)}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === option }}
          >
            <Text style={mode === option ? styles.tabTextSelected : styles.tabText}>
              {option === "add" ? "Add hours" : "Remove hours"}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={globalStyles.label}>Days</Text>
      <View style={styles.row}>
        {WEEKDAY_LABELS.map((label, day) => (
          <Chip key={label} label={label} selected={weekdays.includes(day)} onPress={() => toggleDay(day)} />
        ))}
      </View>

      <TimePicker label="From" value={start} onChange={setStart} />
      <TimePicker label="To" value={end} onChange={setEnd} />

      {mode === "add" ? (
        <>
          <Text style={globalStyles.label}>Slot length</Text>
          <View style={styles.row}>
            {LENGTHS.map((length) => (
              <Chip key={length} label={`${length} min`} selected={length === slotMinutes} onPress={() => setSlotMinutes(length)} />
            ))}
          </View>
        </>
      ) : null}

      <Text style={globalStyles.label}>Starting</Text>
      <View style={styles.row}>
        <Chip label="Today" selected={startChoice === "today"} onPress={() => setStartChoice("today")} />
        <Chip label={`Mon ${formatDay(nextMonday(today)).split(" ")[1]}`} selected={startChoice === "monday"} onPress={() => setStartChoice("monday")} accessibilityLabel="Next Monday" />
        <Chip label="Pick a date" selected={startChoice === "pick"} onPress={() => setStartChoice("pick")} />
      </View>
      {startChoice === "pick" ? (
        <View style={{ marginBottom: 18 }}>
          <Calendar
            current={pickedDate}
            minDate={today}
            hideExtraDays
            onDayPress={(day: { dateString: string }) => {
              if (day.dateString >= today) setPickedDate(day.dateString);
            }}
            markedDates={{ [pickedDate]: { selected: true, selectedColor: RED } }}
            theme={{ todayTextColor: RED, arrowColor: RED }}
          />
        </View>
      ) : null}

      <Text style={globalStyles.label}>For</Text>
      <View style={styles.stepper}>
        <Pressable
          style={[styles.stepButton, weeks <= 1 && globalStyles.buttonFaded]}
          disabled={weeks <= 1}
          onPress={() => setWeeks((w) => Math.max(1, w - 1))}
          accessibilityRole="button"
          accessibilityLabel="One week fewer"
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.weeks}>{weeks} week{weeks === 1 ? "" : "s"}</Text>
        <Pressable
          style={[styles.stepButton, weeks >= MAX_WEEKS && globalStyles.buttonFaded]}
          disabled={weeks >= MAX_WEEKS}
          onPress={() => setWeeks((w) => Math.min(MAX_WEEKS, w + 1))}
          accessibilityRole="button"
          accessibilityLabel="One week more"
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>

      <View style={styles.summaryBox}>
        {mode === "add" ? (
          <>
            <Text style={styles.summary}>
              Up to {count.total} slot{count.total === 1 ? "" : "s"}: {days}, {start}–{end}, {slotMinutes} min each, {period}.
            </Text>
            <Text style={styles.note}>
              Times that have passed, overlap slots you already have, or fall in your time off are skipped.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.summary}>
              Removes slots between {start} and {end} on {days}, {period}.
            </Text>
            <Text style={styles.note}>Booked appointments, and slots with an appointment on record, are kept.</Text>
          </>
        )}
      </View>
      {problem ? <Text style={styles.error}>{problem}</Text> : null}

      <Pressable
        style={[globalStyles.button, { marginTop: 24 }, (problem !== null || isSaving) && globalStyles.buttonFaded]}
        disabled={problem !== null || isSaving}
        onPress={onSubmitPressed}
        accessibilityRole="button"
      >
        <Text style={globalStyles.buttonText}>
          {isSaving ? "Saving..." : mode === "add" ? "Add slots" : "Remove slots"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
