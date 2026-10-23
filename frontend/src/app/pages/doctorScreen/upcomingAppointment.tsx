import { PatientCard } from '@/app/Components/patientCards';
import { appointment } from '@/app/data/appointmentData';
import { getDoctorAppointments } from '@/app/api/auth';
import { styles } from '@/app/Styles/global';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
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

// i  implment the edit screen here
export default function EditScreen() {  // we use default function  , for the expo router to know that this file is a screen
  // we use UseState to make the screen remeber a value and also update this value when the screen will change
  // it is like a small box where  the application will store the screen data like the cards selected for example
  const [selectedId, setSelectedId] = useState<string | null>(null); // SelectedID is the actual information inside that box
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const Selection = selectedId !== null;

  useEffect(() => {
    let isMounted = true;
    async function loadAppointments() {
      try {
        const data = await getDoctorAppointments();

        if (isMounted && Array.isArray(data)) {
          setAppointments(data);
        }
      } catch (err: any) {
        console.error("Failed to load appointments: ", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAppointments();

    return () => { isMounted = false; };

  }, [])

  function handleClick() {
      if (selectedId === null) return;

      // Find the full appointment object corresponding to the selected ID
      const selectedAppointment = appointments.find(
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
          <Text style={styles.heading}>Edit Current Appointment</Text>

          {isLoading ? (
            <Text style={{ textAlign: 'center', marginTop: 20 }}>Loading appointments...</Text>
          ) : appointments.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 20 }}>No appointments found.</Text>
          ) : (
            <FlatList
              data={appointments}
              extraData={selectedId}
              keyExtractor={(item) => item.appointment_id.toString()}
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
          >
            <Text style={styles.buttonText}>Next</Text>
          </Pressable>
        </View>
  );
}
