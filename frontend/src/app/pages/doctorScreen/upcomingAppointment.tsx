import { PatientCard } from '@/app/Components/patientCards';
import { getDoctorAppointments } from '@/app/api/auth';
import { styles } from '@/app/Styles/global';
import LoadError from '@/shared/LoadError';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

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

// UPDATE tab: pick a booked appointment to reschedule.
export default function RescheduleListScreen() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // Only booked appointments can be moved (the server refuses the others).
  const bookedAppointments = useMemo(
    () => appointments.filter((item) => item.status === 'BOOKED'),
    [appointments]
  );

  function handleClick() {
      if (selectedId === null) return;

      // Find the full appointment object corresponding to the selected ID
      const selectedAppointment = bookedAppointments.find(
        (item) => item.appointment_id.toString() === selectedId
      );

      if (!selectedAppointment) return;

      // Pass the serialized object to the next update page
      router.push({
        pathname: '/pages/update',
        params: { appointmentData: JSON.stringify(selectedAppointment) },
      });
    }

  return (
    <View style={styles.container}>
          <Text style={styles.heading}>Reschedule an Appointment</Text>

          {isLoading ? (
            <Text style={{ textAlign: 'center', marginTop: 20 }}>Loading appointments...</Text>
          ) : loadError ? (
            <LoadError message={loadError} onRetry={() => { setIsLoading(true); loadAppointments(); }} />
          ) : (
            <FlatList
              data={bookedAppointments}
              extraData={selectedId}
              keyExtractor={(item) => item.appointment_id.toString()}
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); loadAppointments(); }}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No booked appointments to reschedule.</Text>}
              renderItem={({ item }) => {
                // Split backend's single "patient_name" into name and surname parts
                const nameParts = item.patient_name ? item.patient_name.split(' ') : ["Unknown", ""];
                const firstName = nameParts[0];
                const surname = nameParts.slice(1).join(' ');

                // Format start time (e.g., "10:00:00" -> "10:00")
                const formattedTime = item.start_time ? item.start_time.slice(0, 5) : "";

                return (
                  <PatientCard
                    name={firstName}
                    surname={surname}
                    date={`${item.slot_date} | ${formattedTime}`}
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
        </View>
  );
}
