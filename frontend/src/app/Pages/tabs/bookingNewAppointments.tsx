import { View, StyleSheet } from "react-native";
import Heading from "@/app/components/Heading";

const styles = StyleSheet.create({
  container: {
    alignContent: "center",
    justifyContent: "center",
    gap: 25
  }
})

export default function BookingNewAppointments() {
  return (
    <View style={styles.container}>
      <Heading text="Book New Appointment" variant="secondary" />
    </View>
  )
}

