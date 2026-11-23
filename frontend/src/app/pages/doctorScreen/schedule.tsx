import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import Toast from "react-native-toast-message";
import { blockDoctorSlot, deleteDoctorSlot, getDoctorSchedule, unblockDoctorSlot } from "@/app/api/auth";
import { styles as globalStyles } from "@/app/Styles/global";
import type { DoctorSchedule, DoctorSlot } from "@/app/types/auth";
import { RED } from "@/shared/Chip";
import LoadError from "@/shared/LoadError";
import { confirmAction } from "@/shared/confirm";
import { addDays, formatDay, formatDayRange, hhmm, isoDate, monthBounds, startsAfter } from "@/shared/schedule";

// SCHEDULE tab is for the doctor's own slots for a month, shown on a calendar.
// Tap a day to see its slots and block, unblock or delete them. The buttons
// at the top open Add slot, Weekly hours and Time off.

const COLORS = {
  open: "#2E9E5B",
  booked: "#3F3FC4",
  blocked: "#E08A00",
  timeOff: "#8C8C8C",
};

type SlotAction = "block" | "unblock" | "delete";

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, paddingBottom: 40, backgroundColor: "#fff" },
  links: { flexDirection: "row", gap: 8, marginBottom: 16 },
  link: {
    flex: 1,
    borderWidth: 1,
    borderColor: RED,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
  },
  linkText: { color: RED, fontWeight: "700", fontSize: 13 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10, marginBottom: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: "#555" },
  dayTitle: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  timeOffNote: { color: "#555", marginBottom: 8 },
  empty: { color: "#666", marginTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d6d6d6",
    gap: 8,
  },
  rowText: { flex: 1, gap: 2 },
  rowTime: { fontSize: 16, fontWeight: "600" },
  statusLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { color: "#555" },
  warning: { color: "#b00000", fontSize: 12 },
  actions: { flexDirection: "row", gap: 6 },
  action: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: "#EEEEF2" },
  actionText: { color: "#222", fontWeight: "600", fontSize: 13 },
  deleteText: { color: RED, fontWeight: "600", fontSize: 13 },
  faded: { opacity: 0.4 },
});

function statusOf(slot: DoctorSlot): { label: string; color: string } {
  if (slot.status === "BOOKED") return { label: "Booked", color: COLORS.booked };
  if (slot.on_time_off) return { label: "Time off", color: COLORS.timeOff };
  if (slot.status === "BLOCKED") return { label: "Blocked", color: COLORS.blocked };
  return { label: "Open", color: COLORS.open };
}

export default function ScheduleScreen() {
  const today = isoDate(new Date());
  const [month, setMonth] = useState(today.slice(0, 7)); // "YYYY-MM"
  const [selectedDate, setSelectedDate] = useState(today);
  const [schedule, setSchedule] = useState<DoctorSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busySlotId, setBusySlotId] = useState<number | null>(null);
  const busy = useRef(false); // blocks a second tap immediately, before re-render
  const latestRequest = useRef(0); // ignores answers for a month no longer shown

  const load = useCallback(async (forMonth: string) => {
    const request = ++latestRequest.current;
    const { first, last } = monthBounds(forMonth);
    const from = first < today ? today : first;
    try {
      const data = last < today
        ? { from, to: last, slots: [], time_off: [] }
        : await getDoctorSchedule(from, last);
      if (request !== latestRequest.current) return;
      setSchedule(data);
      setLoadError(null);
    } catch (err: any) {
      if (request !== latestRequest.current) return;
      setLoadError(err?.message || "Couldn't load your schedule.");
    } finally {
      if (request === latestRequest.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [today]);

  // Reloads whenever the tab is opened, e.g. after adding weekly hours.
  useFocusEffect(useCallback(() => {
    load(month);
  }, [load, month]));

  const { first: monthFirst, last: monthLast } = monthBounds(month);

  const markedDates = useMemo(() => {
    const marks: Record<string, { dots: { key: string; color: string }[]; selected?: boolean; selectedColor?: string }> = {};
    const addDot = (day: string, key: string, color: string) => {
      const mark = marks[day] ?? (marks[day] = { dots: [] });
      if (!mark.dots.some((dot) => dot.key === key)) mark.dots.push({ key, color });
    };
    for (const slot of schedule?.slots ?? []) {
      if (slot.status === "BOOKED") addDot(slot.slot_date, "booked", COLORS.booked);
      else if (!slot.on_time_off) {
        addDot(slot.slot_date, slot.status === "BLOCKED" ? "blocked" : "open", slot.status === "BLOCKED" ? COLORS.blocked : COLORS.open);
      }
    }
    for (const off of schedule?.time_off ?? []) {
      const lastDay = off.end_date < monthLast ? off.end_date : monthLast;
      for (let day = off.start_date > monthFirst ? off.start_date : monthFirst; day <= lastDay; day = addDays(day, 1)) {
        addDot(day, "off", COLORS.timeOff);
      }
    }
    marks[selectedDate] = { ...(marks[selectedDate] ?? { dots: [] }), selected: true, selectedColor: RED };
    return marks;
  }, [schedule, selectedDate, monthFirst, monthLast]);

  const daySlots = (schedule?.slots ?? []).filter((slot) => slot.slot_date === selectedDate);
  const dayOff = (schedule?.time_off ?? []).find((off) => off.start_date <= selectedDate && selectedDate <= off.end_date);

  async function run(slot: DoctorSlot, action: SlotAction) {
    if (busy.current) return;
    busy.current = true;
    setBusySlotId(slot.slot_id);
    const when = `${formatDay(slot.slot_date)}, ${hhmm(slot.start_time)}`;
    try {
      if (action === "block") await blockDoctorSlot(slot.slot_id);
      else if (action === "unblock") await unblockDoctorSlot(slot.slot_id);
      else await deleteDoctorSlot(slot.slot_id);
      const done = { block: "Slot blocked", unblock: "Slot open again", delete: "Slot deleted" }[action];
      Toast.show({ type: "success", text1: done, text2: when });
    } catch (err: any) {
      Toast.show({ type: "error", text1: "Couldn't update the slot", text2: err?.message || "Please try again." });
    } finally {
      busy.current = false;
      setBusySlotId(null);
      load(month); // a patient may have booked it in the meantime
    }
  }

  function askToDelete(slot: DoctorSlot) {
    confirmAction(
      "Delete this slot?",
      `${formatDay(slot.slot_date)}, ${hhmm(slot.start_time)}–${hhmm(slot.end_time)} will be removed from your schedule.`,
      "Delete",
      () => run(slot, "delete"),
      { destructive: true },
    );
  }

  function changeMonth(year: number, monthNumber: number) {
    const next = `${year}-${String(monthNumber).padStart(2, "0")}`;
    if (next === month) return;
    setIsLoading(true); // the loaded slots are for the other month
    setMonth(next);
    setSelectedDate(next === today.slice(0, 7) ? today : `${next}-01`);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); load(month); }} />}
    >
      <Text style={globalStyles.heading}>My Schedule</Text>

      <View style={styles.links}>
        <Pressable
          style={styles.link}
          onPress={() => router.push({ pathname: "/pages/addSlot", params: { date: selectedDate } })}
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>+ Add slot</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => router.push("/pages/weeklyHours")} accessibilityRole="button">
          <Text style={styles.linkText}>Weekly hours</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => router.push("/pages/timeOff")} accessibilityRole="button">
          <Text style={styles.linkText}>Time off</Text>
        </Pressable>
      </View>

      <Calendar
        current={`${month}-01`}
        minDate={today}
        hideExtraDays
        disableArrowLeft={month <= today.slice(0, 7)}
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={(day: { dateString: string }) => {
          if (day.dateString >= today) setSelectedDate(day.dateString);
        }}
        onMonthChange={(m: { year: number; month: number }) => changeMonth(m.year, m.month)}
        theme={{ todayTextColor: RED, arrowColor: RED }}
      />

      <View style={styles.legend}>
        {[
          ["Open", COLORS.open],
          ["Booked", COLORS.booked],
          ["Blocked", COLORS.blocked],
          ["Time off", COLORS.timeOff],
        ].map(([label, color]) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.dayTitle}>{formatDay(selectedDate)}</Text>
      {dayOff ? (
        <Text style={styles.timeOffNote}>
          Time off ({formatDayRange(dayOff.start_date, dayOff.end_date)}{dayOff.reason ? `, ${dayOff.reason}` : ""}).
          Patients can't book this day.
        </Text>
      ) : null}

      {isLoading ? (
        <Text style={styles.empty}>Loading your schedule...</Text>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={() => { setIsLoading(true); load(month); }} />
      ) : daySlots.length === 0 ? (
        <Text style={styles.empty}>No slots on this day. Use “+ Add slot” or “Weekly hours” to add some.</Text>
      ) : (
        daySlots.map((slot) => {
          const { label, color } = statusOf(slot);
          const isBusy = busySlotId === slot.slot_id;
          const canChange = slot.status !== "BOOKED" && startsAfter(slot.slot_date, slot.start_time);
          return (
            <View key={slot.slot_id} style={[styles.row, isBusy && styles.faded]}>
              <View style={styles.rowText}>
                <Text style={styles.rowTime}>{hhmm(slot.start_time)} – {hhmm(slot.end_time)}</Text>
                <View style={styles.statusLine}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={styles.statusText}>
                    {label}{slot.appointment ? ` · ${slot.appointment.patient_name}` : ""}
                  </Text>
                </View>
                {slot.status === "BOOKED" && slot.on_time_off ? (
                  <Text style={styles.warning}>During your time off. Reschedule it in the UPDATE tab.</Text>
                ) : null}
              </View>
              {canChange ? (
                <View style={styles.actions}>
                  {!slot.on_time_off ? (
                    <Pressable
                      style={styles.action}
                      disabled={busySlotId !== null}
                      onPress={() => run(slot, slot.status === "BLOCKED" ? "unblock" : "block")}
                      accessibilityRole="button"
                      accessibilityLabel={`${slot.status === "BLOCKED" ? "Unblock" : "Block"} ${hhmm(slot.start_time)}`}
                    >
                      <Text style={styles.actionText}>{slot.status === "BLOCKED" ? "Unblock" : "Block"}</Text>
                    </Pressable>
                  ) : null}
                  {slot.can_delete ? (
                    <Pressable
                      style={styles.action}
                      disabled={busySlotId !== null}
                      onPress={() => askToDelete(slot)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${hhmm(slot.start_time)}`}
                    >
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
