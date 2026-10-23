import { View, FlatList, StyleSheet, Text } from "react-native";
import { useEffect, useState, useMemo } from "react";
import Heading from "@/app/Components/Heading";
import AppointmentCard from "@/app/Components/appointmentCard";
import { getPastAppointments } from "@/app/api/auth";

// 1. Match the exact shape of your backend appointment response
interface BackendAppointment {
  appointment_id: number;
  slot: number;
  slot_details: {
    slot_id: number;
    doctor_first_name: string;
    doctor_last_name: string;
    slot_date: string;
    start_time: string;
    end_time: string;
    status: string;
  };
  status: string;
  reason: string;
};

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 25,
    paddingHorizontal: 20,
  },
  body: {
    width: '100%',
  },
  centerMessage: {
    textAlign: "center",
    color: "#888",
    marginTop: 20
  }
});

export default function UpcomingAppointments() {
  const [appointments, setAppointments] = useState<BackendAppointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchAppointments() {
      try {
        const data = await getPastAppointments();
        if (isMounted && Array.isArray(data)) {
          setAppointments(data);
        }
      } catch (err: any) {
        console.error("Failed to fetch upcoming appointments:", err.message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchAppointments();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter only upcoming/booked appointments
  const bookedAppointments = useMemo(() => {
    return appointments.filter((item) => item.status === "BOOKED");
  }, [appointments]);

  return (
    <View style={styles.container}>
      <Heading text="View Upcoming Appointments" variant="secondary" />

      {isLoading ? (
        <Text style={styles.centerMessage}>Loading upcoming appointments...</Text>
      ) : bookedAppointments.length === 0 ? (
        <Text style={styles.centerMessage}>No upcoming appointments found.</Text>
      ) : (
        <FlatList
          style={styles.body}
          data={bookedAppointments}
          keyExtractor={(item) => item.appointment_id.toString()}
          renderItem={({ item }) => {
            const formattedTime = item.slot_details.start_time
              ? item.slot_details.start_time.slice(0, 5)
              : "";

            return (
              <AppointmentCard
                patientName={`Dr. ${item.slot_details.doctor_first_name}`}
                patientSurname={item.slot_details.doctor_last_name}
                patientDate={item.slot_details.slot_date}
                patientTime={formattedTime}
                imageURL="https://images.peopleimages.com/picture/202305/2702046-tablet-doctor-portrait-and-woman-isolated-on-a-white-background-of-happy-healthcare-research-or-telehealth-services.-face-of-african-medical-person-typing-on-digital-tech-and-paperless-app-in-studio-fit_400_400.jpg"
              />
            );
          }}
        />
      )}
    </View>
  );
}
