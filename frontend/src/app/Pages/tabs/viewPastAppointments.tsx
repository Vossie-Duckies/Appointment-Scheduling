import { View, StyleSheet } from "react-native";
import Heading from "@/app/components/Heading";

const styles = StyleSheet.create({
  container: {
    alignContent: "center",
    justifyContent: "center",
    gap: 25,
    paddingHorizontal: 80
  }
})

export default function ViewPastAppointments() {
  return (
    <View style={styles.container}>
      <Heading text="View Past Appointment" variant="secondary" />
    </View>
  )
}

