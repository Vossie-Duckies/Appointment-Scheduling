import React, { useState, useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { styles } from '../Styles/global';
import { completeAppointment, markNoShow, sendAppointmentMessage } from '../api/auth';
import Chip from '@/shared/Chip';
import { formatDay, hhmm } from '@/shared/schedule';

const DELAYS = [10, 15, 30, 60]; // minutes
const MAX_MESSAGE = 500;

function delayMessage(minutes: number, slotDate: string, startTime: string): string {
  const amount = minutes >= 60 ? 'an hour' : `${minutes} minutes`;
  return `Your doctor is running about ${amount} late for your ${hhmm(startTime)} appointment on ${formatDay(slotDate)}. Sorry for the wait.`;
}

interface BackendAppointment {
  appointment_id: number;
  patient_name: string;
  patient_email: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  status: string;
};

type DoctorAction = 'complete' | 'noshow';

// Appointment details for the doctor (EDIT tab -> Next).
// Fixed during testing: the screen was titled "Edit Appointment" but offered no
// way to change anything and no way back. It now has a Back button and, for
// booked appointments, "Mark as completed" / "Mark as no-show", which call
// endpoints the backend already had.
export default function AppointmentDetails() {
  const { appointmentData } = useLocalSearchParams<{ appointmentData?: string }>();
  const [appointment, setAppointment] = useState<BackendAppointment | null>(null);
  const [busyAction, setBusyAction] = useState<DoctorAction | null>(null);
  const busy = useRef(false); // blocks a second tap immediately, before re-render
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);


  useEffect(() => {
    if (appointmentData) {
      try {
        const parsedData: BackendAppointment = JSON.parse(appointmentData);
        setAppointment(parsedData);
      } catch (err: any) {
        console.error("Failed to parse appointment data: ", err);
      }
    }
  }, [appointmentData])

  async function runAction(action: DoctorAction) {
    if (!appointment || busy.current) return;
    busy.current = true;
    setBusyAction(action);
    try {
      if (action === 'complete') {
        await completeAppointment(appointment.appointment_id);
      } else {
        await markNoShow(appointment.appointment_id);
      }
      Toast.show({
        type: 'success',
        text1: action === 'complete' ? 'Marked as completed' : 'Marked as no-show',
      });
      router.replace('/pages/doctorScreen/editAppointment'); // reloads the list
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: err?.message || 'Please try again.' });
    } finally {
      busy.current = false;
      setBusyAction(null);
    }
  }

  // Goes to the patient's Alerts tab (POST /api/notifications/).
  async function sendMessage() {
    const text = message.trim();
    if (!appointment || !text || busy.current) return;
    busy.current = true;
    setIsSending(true);
    try {
      await sendAppointmentMessage(appointment.appointment_id, text);
      Toast.show({
        type: 'success',
        text1: 'Message sent',
        text2: `${appointment.patient_name} will see it in their Alerts tab.`,
      });
      setMessage('');
    } catch (err: any) {
      Toast.show({ type: 'error', text1: "Couldn't send the message", text2: err?.message || 'Please try again.' });
    } finally {
      busy.current = false;
      setIsSending(false);
    }
  }

  // These changes cannot be undone, so ask first.
  function confirmAction(action: DoctorAction) {
    if (!appointment) return;
    const outcome = action === 'complete' ? 'completed' : 'a no-show';
    const message = `Mark appointment #${appointment.appointment_id} as ${outcome}? This cannot be undone.`;
    if (Platform.OS === 'web') {
      if ((globalThis as any).confirm?.(message)) runAction(action);
      return;
    }
    Alert.alert('Please confirm', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => runAction(action) },
    ]);
  }

  if (!appointment) {
    return (
      <View style={styles.container}>
        <Text>Loading appointment details...</Text>
      </View>
    );
  }

  const isBooked = appointment.status === 'BOOKED';

    return(
      // A ScrollView (not globalStyles.container, whose flex: 1 stops scrolling)
      // so the message box below fits on small phones.
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 70, paddingBottom: 40, backgroundColor: '#fff' }}
        keyboardShouldPersistTaps="handled"
      >
            <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
              <Text style={{ color: '#3F3FC4' }}>Back</Text>
            </Pressable>
            <Text style={styles.heading}>Edit Appointment #{appointment.appointment_id}</Text>
            <View style={[styles.card, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
              <Text>Patient: {appointment.patient_name}</Text>
              <Text>Email: {appointment.patient_email}</Text>
              <Text>Date: {appointment.slot_date}</Text>
              <Text>Time: {appointment.start_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}</Text>
              <Text>Reason: {appointment.reason}</Text>
              <Text>Status: {appointment.status}</Text>
            </View>

            {isBooked ? (
              <View style={{ marginTop: 24 }}>
                <Pressable
                  style={[styles.button, busyAction !== null && styles.buttonFaded]}
                  disabled={busyAction !== null}
                  onPress={() => confirmAction('complete')}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonText}>{busyAction === 'complete' ? 'Saving...' : 'Mark as completed'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, { backgroundColor: '#555555' }, busyAction !== null && styles.buttonFaded]}
                  disabled={busyAction !== null}
                  onPress={() => confirmAction('noshow')}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonText}>{busyAction === 'noshow' ? 'Saving...' : 'Mark as no-show'}</Text>
                </Pressable>

                <Text style={styles.Mess}>Message the patient</Text>
                <Text style={[styles.label, { marginBottom: 8 }]}>Running late? Tap one, or write your own.</Text>
                <View style={[styles.slots, { marginBottom: 12 }]}>
                  {DELAYS.map((minutes) => (
                    <Chip
                      key={minutes}
                      label={minutes >= 60 ? '1 hour late' : `${minutes} min late`}
                      onPress={() => setMessage(delayMessage(minutes, appointment.slot_date, appointment.start_time))}
                    />
                  ))}
                </View>
                <TextInput
                  style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Write a message for the patient"
                  multiline
                  maxLength={MAX_MESSAGE}
                  accessibilityLabel="Message for the patient"
                />
                <Pressable
                  style={[styles.button, { backgroundColor: '#3F3FC4' }, (!message.trim() || isSending) && styles.buttonFaded]}
                  disabled={!message.trim() || isSending}
                  onPress={sendMessage}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonText}>{isSending ? 'Sending...' : 'Send message'}</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={{ color: '#666', marginTop: 24 }}>
                This appointment is {appointment.status.toLowerCase()}, so it can no longer be changed.
              </Text>
            )}
          </ScrollView>
    )
}
