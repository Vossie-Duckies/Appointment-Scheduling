import { View, FlatList, StyleSheet } from "react-native";
import Heading from "@/app/Components/Heading";
import AppointmentCard from "@/app/Components/appointmentCard";

interface AppointmentCardProps {
  patientName: string;
  patientSurname: string;
  patientDate: string;
  patientTime: string;
  imageURL: string
};

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
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
    imageURL: "https://images.peopleimages.com/picture/202305/2702046-tablet-doctor-portrait-and-woman-isolated-on-a-white-background-of-happy-healthcare-research-or-telehealth-services.-face-of-african-medical-person-typing-on-digital-tech-and-paperless-app-in-studio-fit_400_400.jpg"
  },
  {
    patientName: "Dr. Remy",
    patientSurname: "Novak",
    patientDate: "February 08, 2026",
    patientTime: "15:00 P.M.",
    imageURL: "https://images.peopleimages.com/picture/2016/388707-a-career-in-medicine-fit_400_400.jpg"
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
          imageURL={item.imageURL}
        />
        }
      />
    </View>
  )
}

