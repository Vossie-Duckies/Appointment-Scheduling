import { View, FlatList, StyleSheet } from "react-native";
import Heading from "@/app/components/Heading";
import AppointmentCard from "@/app/components/appointmentCard";

interface AppointmentCardProps {
  patientName: string;
  patientSurname: string;
  patientDate: string;
  patientTime: string;
};

const styles = StyleSheet.create({
  container: {
    alignContent: "center",
    justifyContent: "center",
    gap: 25,
    paddingHorizontal: 80,
  },
  body: {
    height: 320,
    width: 250,
    marginLeft: -20
  }
})

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

export default function ViewPastAppointments() {
  return (
    <View style={styles.container}>
      <Heading text="View Past Appointment" variant="secondary" />
      <FlatList
        style={styles.body}
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
  )
}

