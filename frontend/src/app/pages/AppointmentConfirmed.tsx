import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";



const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#ffffff"
  },
  title: {
    fontWeight: "bold",
    fontSize: 22,
    textAlign: "center"
  },
  detail: {
    color: "#555555",
    fontSize: 15,
    textAlign: "center"
  },
  buttonText: {
    color: "white",
    fontWeight: "bold"
  },
  nextButton: {
    backgroundColor: "#d00000",
    borderRadius: 10,
    height: 50,
    width: 250,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32
  }
});

export default function AppointmentConfirmed() {
  const router = useRouter();
  const { doctorName, date, time } = useLocalSearchParams<{ doctorName?: string; date?: string; time?: string }>();

  const handleNextPressed = () => {
    router.replace("/pages/tabs");
  };

  return (
    <View style={styles.container}>
      <Ionicons name="checkmark-circle-outline" color="#2E9E5B" size={80} />
      <Text style={styles.title}>Appointment Confirmed</Text>
      {doctorName ? <Text style={styles.detail}>{doctorName}</Text> : null}
      {date ? <Text style={styles.detail}>{date}{time ? ` | ${time}` : ""}</Text> : null}
      <TouchableOpacity style={styles.nextButton} onPress={handleNextPressed} accessibilityRole="button">
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View >
  )
}
