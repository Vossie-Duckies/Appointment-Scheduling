import { View, FlatList, StyleSheet } from "react-native";
import Heading from "@/app/components/Heading"; // If you are getting an error change import path in the quotation marks
import AppointmentCard from "@/app/components/appointmentCard"; // If you are getting an error change import path in the quotation marks

interface AppointmentCardProps {
  patientName: string;
  patientSurname: string;
  patientDate: string;
  patientTime: string;
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 25
  },
});

{
  /* This is just a  mock database containing Doctor information to test if the AppointmentCard Component works as expected*/
}
const patientAppointments: AppointmentCardProps[] = [
  {
    patientName: "Dr. Sarai",
    patientSurname: "Kelly",
    patientDate: "January 15, 2026",
    patientTime: "11:00 A.M.",
  },
  {
    patientName: "Dr. Remy",
    patientSurname: "Novak",
    patientDate: "February 08, 2026",
    patientTime: "15:00 P.M.",
  },
];

{
  /*---- Upcoming Appointments Page ----*/
}
export default function UpcomingAppointments() {
  return (
    <View style={styles.container}>
      <Heading text="View Upcoming Appointments" variant="secondary" />
      <FlatList
        data={patientAppointments}
        renderItem={({ item }) => <AppointmentCard
          patientName={item.patientName}
          patientSurname={item.patientSurname}
          patientDate={item.patientDate}
          patientTime={item.patientTime}
        />
        }
      />
    </View>
  );
}
