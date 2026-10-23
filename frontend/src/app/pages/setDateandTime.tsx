import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import Heading from "../Components/Heading";
import { Calendar } from "react-native-calendars";
import { useState, useMemo } from "react";
import { postPatientAppointment } from "../api/auth";

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
  secondaryText: {
    color: "#9d9d9d",
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
    color: "#888",
    fontStyle: "italic",
    marginVertical: 10
  }
});

interface AvailableTimeProps {
  time: string,
  isSelected: boolean,
  onSelect?: () => void
}

const AvailableTime: React.FC<AvailableTimeProps> = ({ time, isSelected, onSelect }) => {

  return (
    <TouchableOpacity style={isSelected ? styles.slotActive : styles.slotInactive} onPress={onSelect}>
      <Text style={isSelected ? styles.slotTextActive : styles.slotTextInactive}>{time}</Text>
    </TouchableOpacity>
  )
};

export default function setDateandTime() {
  const router = useRouter();

  // 1. Retrieve passed route parameters from previous screen
  const { doctorId, doctorName, timeSlots, rawSlots } = useLocalSearchParams<{
    doctorId: string;
    doctorName: string;
    timeSlots: string;
    rawSlots: string;
  }>();

  // Safely parse JSON strings passed from doctor selection screen
  const parsedRawSlots: RawSlot[] = useMemo(() => {
    try {
      return rawSlots ? JSON.parse(rawSlots) : [];
    } catch {
      return [];
    }
  }, [rawSlots]);

  const defaultTimeSlots: string[] = useMemo(() => {
      try {
        return timeSlots ? JSON.parse(timeSlots) : [];
      } catch {
        return [];
      }
    }, [timeSlots]);

  // State for date and time selection
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<RawSlot | null>(null);
  const [selectedTimeDisplay, setSelectedTimeDisplay] = useState<string | null>(null);

  // Filter slots matching the selected calendar date (if matching date exists in backend slots)
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return parsedRawSlots;

    const matched = parsedRawSlots.filter((slot) => slot.slot_date === selectedDate);
    return matched.length > 0 ? matched : parsedRawSlots;
  }, [selectedDate, parsedRawSlots]);

  const handleSelectSlot = (slot: RawSlot, timeDisplay: string) => {
      if (selectedSlot?.slot_id === slot.slot_id) {
        setSelectedSlot(null);
        setSelectedTimeDisplay(null);
      } else {
        setSelectedSlot(slot);
        setSelectedTimeDisplay(timeDisplay);
        // Auto-set the date if selecting from raw slot data
        if (slot.slot_date) {
          setSelectedDate(slot.slot_date);
        }
      }
    };

  const handleConfirmPressed = async (selectedSlotId: number, appointmentReason: string) => {
    if (!selectedDate || !selectedSlot) return;

    try {
      const payload = {
        slot_id: selectedSlot.slot_id,
        reason: appointmentReason || "General Consultation",
      };

      const responseData = await postPatientAppointment(payload);
      console.log("Appointment successfully booked", responseData)

      router.replace("/pages/confirmScreen");
    } catch (err: any) {
      console.error("Booking error: ", err.message);
    }
    };

  const isFormValid = Boolean(selectedDate && selectedSlot);

  return (
      <ScrollView contentContainerStyle={styles.container}>
        <Heading text="Book New Appointment" variant="secondary" />

        {doctorName ? (
          <Text style={styles.doctorHeader}>{doctorName}</Text>
        ) : null}

        <Text style={styles.secondaryText}>Select a Date</Text>
        <View>
          <Calendar
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              // Reset slot selection if date changes
              setSelectedSlot(null);
              setSelectedTimeDisplay(null);
            }}
            markingType="custom"
            markedDates={{
              [selectedDate]: {
                customStyles: {
                  container: {
                    backgroundColor: "#d00000",
                    borderRadius: 6
                  },
                  text: {
                    color: "white",
                    fontWeight: "bold"
                  }
                }
              }
            }}
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
          {slotsForSelectedDate.length === 0 ? (
            <Text style={styles.noSlotsText}>No slots available for this date.</Text>
          ) : (
            slotsForSelectedDate.map((slot) => {
              const timeDisplay = `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`;
              const isSelected = selectedSlot?.slot_id === slot.slot_id;

              return (
                <AvailableTime
                  time={timeDisplay}
                  key={slot.slot_id}
                  isSelected={isSelected}
                  onSelect={() => handleSelectSlot(slot, timeDisplay)}
                />
              );
            })
          )}
        </View>

        <TouchableOpacity
            style={isFormValid ? styles.confirmButton : styles.confirmButtonDisabled}
            onPress={handleConfirmPressed}
            disabled={!isFormValid}
          >
            <Text style={styles.confirmText}>Confirm Appointment</Text>
          </TouchableOpacity>
      </ScrollView>
    );
  }
