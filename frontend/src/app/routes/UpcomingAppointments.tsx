import { View, Text, StyleSheet } from "react-native"
import Heading from "../components/Heading"

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 25
  },
})

export default function UpcomingAppointments() {
  return (
    <View style={styles.container}>
      <Heading text="View Upcoming Appointments" variant="secondary" />
    </View>
  )
}

