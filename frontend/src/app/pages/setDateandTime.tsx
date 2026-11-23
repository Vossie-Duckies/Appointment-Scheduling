import {  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import Toast from "react-native-toast-message";
import Heading from "../Components/Heading";
import { Calendar } from "react-native-calendars";
import { useState, useMemo, useRef } from "react";
import { postPatientAppointment } from "../api/auth";
import { toLocalIsoDate } from "@/shared/validation";
const MAX_REASON = 200;
// Types corresponding to what was passed from BookingNewAppointments screen
interface RawSlot {
  slot_id: number;
  doctor_id: number;
  doctor__user__first_name: string;
  doctor__user__last_name: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

const styles = StyleSheet.create({
  container: {
    alignContent: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    marginTop: 30,
    gap: 20,
    paddingBottom: 40
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingRight: 12
  },
  backText: {
    color: "#3F3FC4",
    fontSize: 16
  },
  secondaryText: {
    color: "#6b6b6b",
    fontSize: 12
  },
  slotInactive: {
    backgroundColor: "#cecece",
    paddingHorizontal: 12,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6
  },
  slotTextInactive: {
    color: "black",
    fontWeight: "500"
  },
  slotActive: {
    backgroundColor: "#d00000",
    paddingHorizontal: 12,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6
  },
  slotTextActive: {
    color: "white",
    fontWeight: "bold"
  },
  slotContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 5
  },
  confirmButton: {
    backgroundColor: "#d00000",
    borderRadius: 10,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15
  },
  confirmButtonDisabled: {
    backgroundColor: "#a0a0a0",
    borderRadius: 10,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15
  },
  confirmText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16
  },
  doctorHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333"
  },
  noSlotsText: {
    color: "#6b6b6b",
    fontStyle: "italic",
    marginVertical: 10
  },
  reasonInput: {
      borderWidth: 1,
      borderColor: "#cecece",
      borderRadius: 6,
      backgroundColor: "#ffffff",
      padding: 10,
      minHeight: 80,
      textAlignVertical: "top",
      marginTop: 5
    },
    reasonCount: {
      color: "#6b6b6b",
      fontSize: 12,
      alignSelf: "flex-end",
      marginTop: 4
    }
});

interface AvailableTimeProps {
  time: string,
  isSelected: boolean,
  onSelect?: () => void
}

const AvailableTime: React.FC<AvailableTimeProps> = ({ time, isSelected, onSelect }) => {

  return (
    <TouchableOpacity
      style={isSelected ? styles.slotActive : styles.slotInactive}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <Text style={isSelected ? styles.slotTextActive : styles.slotTextInactive}>{time}</Text>
    </TouchableOpacity>
  )
};

const slotKey = (slot: RawSlot) => `${slot.slot_date} ${slot.start_time}`;
const timeRange = (slot: RawSlot) => `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`;

export default function SetDateAndTime() {
  const router = useRouter();

  // 1. Retrieve passed route parameters from previous screen
  const { doctorName, rawSlots } = useLocalSearchParams<{
    doctorId: string;
    doctorName: string;
    timeSlots: string;
    rawSlots: string;
  }>();

  // Safely parse JSON strings passed from doctor selection screen, soonest first
  const parsedRawSlots: RawSlot[] = useMemo(() => {
    try {
      const parsed = rawSlots ? JSON.parse(rawSlots) : [];
      return Array.isArray(parsed) ? [...parsed].sort((a, b) => slotKey(a).localeCompare(slotKey(b))) : [];
    } catch {
      return [];
    }
  }, [rawSlots]);

  // Slots the server said were just taken are hidden from the list.
  const [takenSlotIds, setTakenSlotIds] = useState<number[]>([]);
  const openSlots = useMemo(
    () => parsedRawSlots.filter((slot) => !takenSlotIds.includes(slot.slot_id)),
    [parsedRawSlots, takenSlotIds]
  );
  const datesWithSlots = useMemo(
    () => Array.from(new Set(openSlots.map((slot) => slot.slot_date))),
    [openSlots]
  );

  // The calendar opens on the first date that has a free slot, so times show straight away.
  const [selectedDate, setSelectedDate] = useState<string>(() => parsedRawSlots[0]?.slot_date ?? "");
  const [selectedSlot, setSelectedSlot] = useState<RawSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
   const [reason, setReason] = useState<string>("");
    const scrollRef = useRef<ScrollView>(null);
  const busy = useRef(false); // blocks a second tap immediately, before re-render
  const today = toLocalIsoDate(new Date());

  // Only the slots on the chosen date. (Before the fix, a date with no slots
  // showed every slot from other dates under "Available Time Slots for <date>".)
  const slotsForSelectedDate = useMemo(
    () => openSlots.filter((slot) => slot.slot_date === selectedDate),
    [openSlots, selectedDate]
  );

  // Dates with free slots are shown in red; the chosen date is filled red.
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    datesWithSlots.forEach((day) => {
      marks[day] = { customStyles: { text: { color: "#d00000", fontWeight: "bold" } } };
    });
    if (selectedDate) {
      marks[selectedDate] = {
        customStyles: {
          container: { backgroundColor: "#d00000", borderRadius: 6 },
          text: { color: "white", fontWeight: "bold" }
        }
      };
    }
    return marks;
  }, [datesWithSlots, selectedDate]);

  const handleSelectSlot = (slot: RawSlot) => {
    setSelectedSlot((current) => (current?.slot_id === slot.slot_id ? null : slot));
  };

  const handleConfirmPressed = async () => {
    if (!selectedSlot || busy.current) return; // also blocks double taps

    busy.current = true;
    setIsSubmitting(true);
    try {
      await postPatientAppointment({
        slot_id: selectedSlot.slot_id,
        reason: reason.trim(),
      });

      // Used to go to /pages/confirmScreen, the doctor's "Appointment Updated"
      // screen, whose Next button opened the doctor area.
      router.replace({
        pathname: "/pages/AppointmentConfirmed",
        params: {
          doctorName: doctorName ?? "",
          date: selectedSlot.slot_date,
          time: timeRange(selectedSlot),
        },
      });
    } catch (err: any) {
      const message: string = err?.message || "Couldn't book this appointment. Please try again.";
      // Used to be console.error only, so a failed booking looked like a frozen button.
      Toast.show({ type: "error", text1: "Booking failed", text2: message });
      if (/not available|already has an appointment|in the past|does not exist/i.test(message)) {
        setTakenSlotIds((ids) => [...ids, selectedSlot.slot_id]);
        setSelectedSlot(null);
      }
    } finally {
      busy.current = false;
      setIsSubmitting(false);
    }
  };

  const isFormValid = Boolean(selectedSlot) && !isSubmitting;

  return (
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <Heading text="Book New Appointment" variant="secondary" />

        {doctorName ? (
          <Text style={styles.doctorHeader}>{doctorName}</Text>
        ) : null}

        <Text style={styles.secondaryText}>Select a Date (dates in red have free slots)</Text>
        <View>
          <Calendar
            current={selectedDate || undefined}
            minDate={today}
            disableAllTouchEventsForDisabledDays={true}
            onDayPress={(day) => {
              if (day.dateString < today) return; // past days cannot be booked
              setSelectedDate(day.dateString);
              // Reset slot selection if date changes
              setSelectedSlot(null);
            }}
            markingType="custom"
            markedDates={markedDates}
            theme={{
              textMonthFontWeight: "bold"
            }}
            renderArrow={(direction) => {
              if (direction === "left") return <Ionicons name="chevron-back-outline" color="#000000" size={20} />;
              if (direction === "right") return <Ionicons name="chevron-forward-outline" color="#000000" size={20} />;
            }}
          />
        </View>

        <Text style={styles.secondaryText}>
          {selectedDate ? `Available Time Slots for ${selectedDate}` : "Select a Time Slot"}
        </Text>

        <View style={styles.slotContainer}>
          {openSlots.length === 0 ? (
            <Text style={styles.noSlotsText}>This doctor has no free slots left. Go back and choose another doctor.</Text>
          ) : slotsForSelectedDate.length === 0 ? (
            <Text style={styles.noSlotsText}>No slots available on this date. Pick a date shown in red.</Text>
          ) : (
            slotsForSelectedDate.map((slot) => {
              const timeDisplay = timeRange(slot);
              const isSelected = selectedSlot?.slot_id === slot.slot_id;

              return (
                <AvailableTime
                  time={timeDisplay}
                  key={slot.slot_id}
                  isSelected={isSelected}
                  onSelect={() => handleSelectSlot(slot)}
                />
              );
            })
          )}
        </View>
           <View>
            <Text style={styles.secondaryText}>Reason for visit (optional)</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="For example: sore throat for three days"
              multiline
              maxLength={MAX_REASON}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
              accessibilityLabel="Reason for visit, optional"
            />
            <Text style={styles.reasonCount}>{reason.length}/{MAX_REASON}</Text>
          </View>
        <TouchableOpacity
            style={isFormValid ? styles.confirmButton : styles.confirmButtonDisabled}
            onPress={handleConfirmPressed}
            disabled={!isFormValid}
            accessibilityRole="button"
          >
            <Text style={styles.confirmText}>{isSubmitting ? "Booking..." : "Confirm Appointment"}</Text>
          </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    );
  }
