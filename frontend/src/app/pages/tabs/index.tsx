import { View, FlatList, StyleSheet } from "react-native";
import Heading from "@/app/Components/Heading"; // If you are getting an error change import path in the quotation marks
import AppointmentCard from "@/app/Components/appointmentCard"; // If you are getting an error change import path in the quotation marks
import Avatar from "@/app/Components/Avatar";


interface AppointmentCardProps {
  patientName: string;
  patientSurname: string;
  patientDate: string;
  patientTime: string;
  imageURL: string;
}

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
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
    imageURL: "https://images.peopleimages.com/picture/2016/388707-a-career-in-medicine-fit_400_400.jpg"
  },
  {
    patientName: "Dr. Remy",
    patientSurname: "Novak",
    patientDate: "February 08, 2026",
    patientTime: "15:00 P.M.",
    imageURL: "https://images.peopleimages.com/picture/202305/2702046-tablet-doctor-portrait-and-woman-isolated-on-a-white-background-of-happy-healthcare-research-or-telehealth-services.-face-of-african-medical-person-typing-on-digital-tech-and-paperless-app-in-studio-fit_400_400.jpg"
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
          imageURL={item.imageURL}
        />
        }
      />
    </View>
  );
}
