import { View, StyleSheet } from "react-native";
import Heading from "@/app/components/Heading";
import AppointmentCard from "@/app/components/appointmentCard";

interface AppointmentCardProps {
  patientName: string,
  patientSurname: string,
  patientDate: string,
  patientTime: string
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 25,
    marginTop: 100,
    height: 120
  },
});

{/* This is just a  mock database containing Doctor information to test if the AppointmentCard Component works as expected*/ }
const patientAppointments: AppointmentCardProps[] = [
  { patientName: "Dr. Sarai", patientSurname: "Kelly", patientDate: "January 15, 2026", patientTime: "11:00 A.M." },
  { patientName: "Dr. Remy", patientSurname: "Novak", patientDate: "February 08, 2026", patientTime: "15:00 P.M." }
];

{/*---- Upcoming Appointments Page ----*/ }
export default function UpcomingAppointments() {
  return (
    <View style={styles.container}>
      <Heading text="View Upcoming Appointments" variant="secondary" />

      {patientAppointments.map((appointmentInfo) => (
        <AppointmentCard
          patientName={appointmentInfo.patientName}
          patientSurname={appointmentInfo.patientSurname}
          patientDate={appointmentInfo.patientDate}
          patientTime={appointmentInfo.patientTime}
        />
      ))}
    </View>
  )
};

