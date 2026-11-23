import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Calendar } from "react-native-calendars";
import Toast from "react-native-toast-message";
import { addTimeOff, deleteTimeOff, getTimeOff } from "@/app/api/auth";
import { styles as globalStyles } from "@/app/Styles/global";
import type { TimeOff } from "@/app/types/auth";
import { RED } from "@/shared/Chip";
import LoadError from "@/shared/LoadError";
import { confirmAction, showNotice } from "@/shared/confirm";
import { addDays, formatDay, formatDayRange, hhmm, isoDate } from "@/shared/schedule";

// Schedule tab -> "Time off": whole days away. Patients can't see or book
// slots on those days; removing the time off makes them bookable again.
// Booked appointments are kept, and the doctor is told to reschedule them.

const MAX_REASON = 100;
const RANGE_COLOR = "#F6C5CB";
const EXISTING_COLOR = "#D9D9D9";

type PeriodMark = { startingDay?: boolean; endingDay?: boolean; color: string; textColor: string };

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 70, paddingBottom: 40, backgroundColor: "#fff" },
  section: { fontSize: 16, fontWeight: "700", marginTop: 8, marginBottom: 8 },
  empty: { color: "#666", marginBottom: 12 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d6d6d6",
    gap: 8,
  },
  itemText: { flex: 1, gap: 2 },
  itemDates: { fontSize: 15, fontWeight: "600" },
  itemMeta: { color: "#666", fontSize: 13 },
  warning: { color: "#b00000", fontSize: 13 },
  remove: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: "#EEEEF2" },
  removeText: { color: RED, fontWeight: "600" },
  hint: { color: "#666", marginBottom: 8 },
  chosen: { fontSize: 16, fontWeight: "600", textAlign: "center", marginTop: 12 },
});

function bookedSummary(period: TimeOff): string {
  return period.booked_appointments
    .map((a) => `• ${formatDay(a.slot_date)} at ${hhmm(a.start_time)}: ${a.patient_name}`)
    .join("\n");
}

export default function TimeOffScreen() {
  const today = isoDate(new Date());
  const [periods, setPeriods] = useState<TimeOff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    try {
      setPeriods(await getTimeOff());
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || "Couldn't load your time off.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  // First tap picks the first day; a second, later tap picks the last day.
  // Tapping again starts a new choice.
  function onDayPress(day: string) {
    if (day < today) return;
    if (rangeStart === null || rangeEnd !== rangeStart || day < rangeStart) {
      setRangeStart(day);
      setRangeEnd(day);
    } else {
      setRangeEnd(day);
    }
  }

  const markedDates = useMemo(() => {
    const marks: Record<string, PeriodMark> = {};
    const paint = (from: string, to: string, color: string, textColor: string) => {
      for (let day = from; day <= to; day = addDays(day, 1)) {
        marks[day] = { color, textColor, startingDay: day === from, endingDay: day === to };
      }
    };
    for (const period of periods) paint(period.start_date, period.end_date, EXISTING_COLOR, "#555");
    if (rangeStart && rangeEnd) {
      paint(rangeStart, rangeEnd, RANGE_COLOR, "#000");
      marks[rangeStart] = { ...marks[rangeStart], color: RED, textColor: "#fff" };
      marks[rangeEnd] = { ...marks[rangeEnd], color: RED, textColor: "#fff" };
    }
    return marks;
  }, [periods, rangeStart, rangeEnd]);

  async function save() {
    if (!rangeStart || !rangeEnd || busy.current) return;
    busy.current = true;
    setIsSaving(true);
    try {
      const result = await addTimeOff({ start_date: rangeStart, end_date: rangeEnd, reason: reason.trim() });
      if (result.time_off.booked_appointments.length > 0) {
        showNotice(
          "You still have booked appointments",
          `These appointments fall in your time off:\n\n${bookedSummary(result.time_off)}\n\n` +
            "Reschedule them in the UPDATE tab. The patients are told when you do.",
        );
      } else {
        Toast.show({ type: "success", text1: "Time off saved", text2: result.message });
      }
      setRangeStart(null);
      setRangeEnd(null);
      setReason("");
      await load();
    } catch (err: any) {
      Toast.show({ type: "error", text1: "Couldn't save your time off", text2: err?.message || "Please try again." });
    } finally {
      busy.current = false;
      setIsSaving(false);
    }
  }

  function askToRemove(period: TimeOff) {
    confirmAction(
      "Remove this time off?",
      `${formatDayRange(period.start_date, period.end_date)}: patients will be able to book your open slots on these days again.`,
      "Remove",
      async () => {
        setRemovingId(period.time_off_id);
        try {
          await deleteTimeOff(period.time_off_id);
          Toast.show({ type: "success", text1: "Time off removed" });
          await load();
        } catch (err: any) {
          Toast.show({ type: "error", text1: "Couldn't remove it", text2: err?.message || "Please try again." });
        } finally {
          setRemovingId(null);
        }
      },
      { destructive: true },
    );
  }

  const canSave = rangeStart !== null && rangeEnd !== null && !isSaving;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Pressable style={globalStyles.backButton} onPress={() => router.back()} accessibilityRole="button">
        <Text style={{ color: "#3F3FC4" }}>Back</Text>
      </Pressable>
      <Text style={globalStyles.heading}>Time Off</Text>

      <Text style={styles.section}>Coming up</Text>
      {isLoading ? (
        <Text style={styles.empty}>Loading...</Text>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={() => { setIsLoading(true); load(); }} />
      ) : periods.length === 0 ? (
        <Text style={styles.empty}>No time off planned.</Text>
      ) : (
        periods.map((period) => (
          <View key={period.time_off_id} style={styles.item}>
            <View style={styles.itemText}>
              <Text style={styles.itemDates}>{formatDayRange(period.start_date, period.end_date)}</Text>
              {period.reason ? <Text style={styles.itemMeta}>{period.reason}</Text> : null}
              {period.booked_appointments.length > 0 ? (
                <Text style={styles.warning}>
                  {period.booked_appointments.length} booked appointment
                  {period.booked_appointments.length === 1 ? "" : "s"} to reschedule
                </Text>
              ) : null}
            </View>
            <Pressable
              style={[styles.remove, removingId === period.time_off_id && globalStyles.buttonFaded]}
              disabled={removingId !== null}
              onPress={() => askToRemove(period)}
              accessibilityRole="button"
              accessibilityLabel={`Remove time off ${formatDayRange(period.start_date, period.end_date)}`}
            >
              <Text style={styles.removeText}>{removingId === period.time_off_id ? "Removing..." : "Remove"}</Text>
            </Pressable>
          </View>
        ))
      )}

      <Text style={[styles.section, { marginTop: 24 }]}>Add time off</Text>
      <Text style={styles.hint}>Tap the first day, then the last day. Grey days are already off.</Text>
      <Calendar
        minDate={today}
        hideExtraDays
        markingType="period"
        markedDates={markedDates}
        onDayPress={(day: { dateString: string }) => onDayPress(day.dateString)}
        theme={{ todayTextColor: RED, arrowColor: RED }}
      />
      <Text style={styles.chosen}>
        {rangeStart && rangeEnd ? formatDayRange(rangeStart, rangeEnd) : "No days chosen yet"}
      </Text>

      <Text style={globalStyles.label}>Reason (optional, only you see it)</Text>
      <TextInput
        style={globalStyles.input}
        value={reason}
        onChangeText={setReason}
        placeholder="e.g. Conference"
        maxLength={MAX_REASON}
        returnKeyType="done"
      />

      <Pressable
        style={[globalStyles.button, { marginTop: 12 }, !canSave && globalStyles.buttonFaded]}
        disabled={!canSave}
        onPress={save}
        accessibilityRole="button"
      >
        <Text style={globalStyles.buttonText}>{isSaving ? "Saving..." : "Save time off"}</Text>
      </Pressable>
    </ScrollView>
  );
}
