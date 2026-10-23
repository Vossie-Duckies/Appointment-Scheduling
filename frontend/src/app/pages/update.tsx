import { styles } from '@/app/Styles/global';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

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

const timeSlot = ['08:00', '09:00', '11:00', '14:00'];
const red = '#C40018';

export default function UpdateScreen() {
  const { appointmentData } = useLocalSearchParams<{ appointmentData?: string }>();

  const [appointment, setAppointment] = useState<BackendAppointment | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  // Parse incoming appointment data and initialize the date picker
  useEffect(() => {
    if (appointmentData) {
      try {
        const parsed: BackendAppointment = JSON.parse(appointmentData);
        setAppointment(parsed);
        // Automatically set the calendar/date to the current slot date initially
        if (parsed.slot_date) {
          setDate(parsed.slot_date);
        }
        // Format start time for display/matching if needed (e.g., "10:00:00" -> "10:00")
        if (parsed.start_time) {
          setTime(parsed.start_time.slice(0, 5));
        }
      } catch (err) {
        console.error("Failed to parse appointment data in UpdateScreen:", err);
      }
    }
  }, [appointmentData]);

  const selection = date !== null && time !== null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={{ color: '#3F3FC4' }}>Back</Text>
        </Pressable>
      </View>

      <Text style={styles.heading}>Update Current Appointment</Text>

      {appointment && (
        <View style={{ marginBottom: 15, alignItems: 'center' }}>
          <Text style={styles.patient}>{appointment.patient_name}</Text>
          <Text style={{ color: '#666', marginTop: 4 }}>
            Current: {appointment.slot_date} at {appointment.start_time.slice(0, 5)}
          </Text>
        </View>
      )}

      <Text style={styles.label}>Select New Date</Text>

      <Calendar
        onDayPress={(day) => setDate(day.dateString)}
        current={appointment?.slot_date} // Opens the calendar on the month of the current appointment
        markedDates={
          date
            ? { [date]: { selected: true, selectedColor: red } }
            : {}
        }
        theme={{ todayTextColor: red, arrowColor: red }}
      />

      <Text style={styles.label}>Select New Time</Text>

      <View style={styles.slots}>
        {timeSlot.map((slot) => (
          <Pressable
            key={slot}
            onPress={() => setTime(slot)}
            style={[styles.Slot, time === slot && styles.SlotSelected]}
          >
            <Text style={time === slot ? styles.TextSelectedSlot : styles.SlotText}>
              {slot}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.button, { marginTop: 30 }, !selection && styles.disabledButton]}
        disabled={!selection}
        onPress={() => {
          console.log('Updating appointment ID:', appointment?.appointment_id);
          console.log('New Date:', date);
          console.log('New Time:', time);

          // TODO: Call your backend update API endpoint here with appointment_id, date, and time

          router.navigate("/pages/confirmScreen");
        }}
      >
        <Text style={styles.buttonText}>Confirm Update</Text>
      </Pressable>
    </ScrollView>
  );
}
