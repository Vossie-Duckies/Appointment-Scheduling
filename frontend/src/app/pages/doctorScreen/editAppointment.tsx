import { PatientCard } from '@/app/Components/patientCards';
import { getDoctorAppointments, goToLogin, logout } from '@/app/api/auth';
import { styles } from '@/app/Styles/global';
import LoadError from '@/shared/LoadError';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

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

const STATUS_LABELS: Record<string, string> = {
  BOOKED: 'Booked',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NOSHOW: 'No-show',
};


export default function EditScreen() {  // we use default function  , for the expo router to know that this file is a screen
  // we use UseState to make the screen remeber a value and also update this value when the screen will change
  // it is like a small box where  the application will store the screen data like the cards selected for example
  const [selectedId, setSelectedId] = useState<string | null>(null); // SelectedID is the actual information inside that box
  const [appointments, setAppointments] = useState<BackendAppointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const Selection = selectedId !== null;

  const loadAppointments = useCallback(async () => {
    try {
      const data = await getDoctorAppointments();
      setAppointments(Array.isArray(data) ? data : []);
      setLoadError(null);
    } catch (err: any) {
      // Used to fall through to "No appointments found" when offline.
      setLoadError(err?.message || "Couldn't load your appointments.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Reloads whenever the tab is opened, so changes made elsewhere show up.
  useFocusEffect(useCallback(() => {
    loadAppointments();
  }, [loadAppointments]));

  function handleClick() {
      if (selectedId === null) return;

      // Find the full appointment object corresponding to the selected ID
      const selectedAppointment = appointments.find(
        (item) => item.appointment_id.toString() === selectedId
      );

      if (!selectedAppointment) return;

      // Pass the serialized object to the details screen
      router.push({
        pathname: '/pages/reportDelay',
        params: { appointmentData: JSON.stringify(selectedAppointment) },
      });
    }

  async function handleLogout() {
    await logout();
    Toast.show({ type: 'success', text1: 'You have been logged out' });
    goToLogin();
  }

  return (
    <View style={styles.container}>
          <Text style={styles.heading}>Edit Current Appointment</Text>

          {isLoading ? (
            <Text style={{ textAlign: 'center', marginTop: 20 }}>Loading appointments...</Text>
          ) : loadError ? (
            <LoadError message={loadError} onRetry={() => { setIsLoading(true); loadAppointments(); }} />
          ) : (
            <FlatList
              data={appointments}
              extraData={selectedId}
              keyExtractor={(item) => item.appointment_id.toString()}
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); loadAppointments(); }}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No appointments found.</Text>}
              renderItem={({ item }) => {
                // Split backend's single "patient_name" into name and surname parts
                const nameParts = item.patient_name ? item.patient_name.split(' ') : ["Unknown", ""];
                const firstName = nameParts[0];
                const surname = nameParts.slice(1).join(' ');

                // Format start time (e.g., "10:00:00" -> "10:00")
                const formattedTime = item.start_time ? item.start_time.slice(0, 5) : "";
                const status = STATUS_LABELS[item.status] ?? item.status;

                return (
                  <PatientCard
                    name={firstName}
                    surname={surname}
                    date={`${item.slot_date} | ${formattedTime} · ${status}`}
                    picUrl="https://images.peopleimages.com/picture/2016/388707-a-career-in-medicine-fit_400_400.jpg"
                    selection={item.appointment_id.toString() === selectedId}
                    onPress={() => setSelectedId(item.appointment_id.toString())}
                  />
                );
              }}
            />
          )}

          <Pressable
            style={[styles.button, !Selection && styles.buttonFaded]}
            disabled={!Selection}
            onPress={handleClick}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Next</Text>
          </Pressable>

          <Pressable onPress={handleLogout} accessibilityRole="button" style={{ alignItems: 'center', paddingBottom: 12 }}>
            <Text style={{ color: '#C40018', fontWeight: 'bold', textDecorationLine: 'underline' }}>Log out</Text>
          </Pressable>
        </View>
  );
}
