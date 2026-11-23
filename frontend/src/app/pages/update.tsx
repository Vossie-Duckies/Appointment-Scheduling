import { styles } from '@/app/Styles/global';
import { getDoctorSchedule, rescheduleAppointment } from '@/app/api/auth';
import type { DoctorSlot } from '@/app/types/auth';
import LoadError from '@/shared/LoadError';
import { formatDay, hhmm, isoDate, monthBounds, startsAfter } from '@/shared/schedule';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Toast from 'react-native-toast-message';

// UPDATE tab -> pick an appointment -> Next: move it into one of the doctor's
// open slots. It used to offer four fixed times (08:00, 09:00, 11:00, 14:00)
// whatever the schedule held, so most choices failed with "That time overlaps
// another slot in your schedule". Now only open slots are offered, from the
// same schedule as the SCHEDULE tab, and the old time becomes open again.

interface BackendAppointment {
  appointment_id: number;
  patient_name: string;
  patient_email: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  status: string;
}

const red = '#C40018';

// A slot the appointment can move into: open, not started yet, and not on a
// day of time off (the server checks the same things).
const canMoveInto = (slot: DoctorSlot) =>
  slot.status === 'AVAILABLE' && !slot.on_time_off && startsAfter(slot.slot_date, slot.start_time);

const slotTimes = (slot: DoctorSlot) => `${hhmm(slot.start_time)}–${hhmm(slot.end_time)}`;

export default function UpdateScreen() {
  const { appointmentData } = useLocalSearchParams<{ appointmentData?: string }>();
  const appointment = useMemo<BackendAppointment | null>(() => {
    if (!appointmentData) return null;
    try {
      return JSON.parse(appointmentData);
    } catch (err) {
      console.error("Failed to parse appointment data in UpdateScreen:", err);
      return null;
    }
  }, [appointmentData]);

  const today = isoDate(new Date());
  const [month, setMonth] = useState(today.slice(0, 7)); // "YYYY-MM" shown on the calendar
  const [openSlots, setOpenSlots] = useState<DoctorSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const busy = useRef(false); // blocks a second tap immediately, before re-render
  const latestRequest = useRef(0); // ignores answers for a month no longer shown

  const load = useCallback(async (forMonth: string) => {
    const request = ++latestRequest.current;
    const { first, last } = monthBounds(forMonth);
    try {
      const slots = last < today
        ? []
        : (await getDoctorSchedule(first < today ? today : first, last)).slots.filter(canMoveInto);
      if (request !== latestRequest.current) return;
      setOpenSlots(slots);
      setLoadError(null);
      // Keep the chosen day and slot while they are still open; otherwise
      // open the first day that has a free slot, so times show straight away.
      setSelectedDate((day) => (day && slots.some((s) => s.slot_date === day) ? day : slots[0]?.slot_date ?? null));
      setSelectedSlotId((id) => (id !== null && slots.some((s) => s.slot_id === id) ? id : null));
    } catch (err: any) {
      if (request !== latestRequest.current) return;
      setLoadError(err?.message || "Couldn't load your open slots.");
    } finally {
      if (request === latestRequest.current) setIsLoading(false);
    }
  }, [today]);

  // Reloads whenever the screen is shown, e.g. after adding slots in SCHEDULE.
  useFocusEffect(useCallback(() => {
    load(month);
  }, [load, month]));

  // Dates with open slots are red; the chosen date is filled red (as when patients book).
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    for (const slot of openSlots) {
      marks[slot.slot_date] = { customStyles: { text: { color: red, fontWeight: 'bold' } } };
    }
    if (selectedDate) {
      marks[selectedDate] = {
        customStyles: {
          container: { backgroundColor: red, borderRadius: 6 },
          text: { color: 'white', fontWeight: 'bold' },
        },
      };
    }
    return marks;
  }, [openSlots, selectedDate]);

  const daySlots = openSlots.filter((slot) => slot.slot_date === selectedDate);
  const selectedSlot = openSlots.find((slot) => slot.slot_id === selectedSlotId) ?? null;
  const canConfirm = appointment !== null && selectedSlot !== null && !isSubmitting;

  function changeMonth(year: number, monthNumber: number) {
    const next = `${year}-${String(monthNumber).padStart(2, '0')}`;
    if (next === month) return;
    setIsLoading(true); // the loaded slots are for the other month
    setSelectedDate(null);
    setSelectedSlotId(null);
    setMonth(next);
  }

  async function handleConfirm() {
    if (!appointment || !selectedSlot || busy.current) return;
    busy.current = true;
    setIsSubmitting(true);
    try {
      await rescheduleAppointment(appointment.appointment_id, selectedSlot.slot_id);
      router.replace({
        pathname: "/pages/confirmScreen",
        params: { date: selectedSlot.slot_date, time: hhmm(selectedSlot.start_time) },
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Update failed',
        text2: err?.message || "Couldn't update this appointment. Please try again.",
      });
      load(month); // a patient may have just booked that slot
    } finally {
      busy.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    // Not styles.container: its flex: 1 makes the scroll area exactly one screen
    // tall, so the times and the Confirm button below the calendar could not be
    // reached. flexGrow lets it grow with its content and still fill the screen.
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 70, paddingBottom: 40, backgroundColor: '#fff' }}>
      <View>
        <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
          <Text style={{ color: '#3F3FC4' }}>Back</Text>
        </Pressable>
      </View>

      <Text style={styles.heading}>Update Current Appointment</Text>

      {appointment && (
        <View style={{ marginBottom: 15, alignItems: 'center' }}>
          <Text style={styles.patient}>{appointment.patient_name}</Text>
          <Text style={{ color: '#666', marginTop: 4 }}>
            Current: {formatDay(appointment.slot_date)} at {hhmm(appointment.start_time)}
          </Text>
        </View>
      )}

      <Text style={styles.label}>Select New Date</Text>

      <Calendar
        current={`${month}-01`}
        minDate={today}
        hideExtraDays
        disableArrowLeft={month <= today.slice(0, 7)}
        disableAllTouchEventsForDisabledDays={true}
        onDayPress={(day: { dateString: string }) => {
          if (day.dateString < today) return; // cannot move into the past
          setSelectedDate(day.dateString);
          setSelectedSlotId(null);
        }}
        onMonthChange={(m: { year: number; month: number }) => changeMonth(m.year, m.month)}
        markingType="custom"
        markedDates={markedDates}
        theme={{ todayTextColor: red, arrowColor: red }}
      />

      <Text style={styles.label}>
        {selectedDate ? `Open slots on ${formatDay(selectedDate)}` : 'Select New Time'}
      </Text>

      {isLoading ? (
        <Text style={{ color: '#666' }}>Loading your open slots...</Text>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={() => { setIsLoading(true); load(month); }} />
      ) : openSlots.length === 0 ? (
        <Text style={{ color: '#666' }}>
          No open slots this month. Try the next month, or add slots in the SCHEDULE tab.
        </Text>
      ) : daySlots.length === 0 ? (
        <Text style={{ color: '#666' }}>No open slots on this day. Days with open slots are shown in red.</Text>
      ) : (
        <View style={styles.slots}>
          {daySlots.map((slot) => {
            const isSelected = slot.slot_id === selectedSlotId;
            return (
              <Pressable
                key={slot.slot_id}
                onPress={() => setSelectedSlotId(isSelected ? null : slot.slot_id)}
                style={[styles.Slot, isSelected && styles.SlotSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${formatDay(slot.slot_date)}, ${slotTimes(slot)}`}
              >
                <Text style={isSelected ? styles.TextSelectedSlot : styles.SlotText}>{slotTimes(slot)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {selectedSlot ? (
        <Text style={{ color: '#333', marginTop: 12, textAlign: 'center' }}>
          New time: {formatDay(selectedSlot.slot_date)}, {slotTimes(selectedSlot)}
        </Text>
      ) : null}

      <Pressable
        style={[styles.button, { marginTop: 30 }, !canConfirm && styles.disabledButton]}
        disabled={!canConfirm}
        onPress={handleConfirm}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{isSubmitting ? 'Saving...' : 'Confirm Update'}</Text>
      </Pressable>
    </ScrollView>
  );
}
