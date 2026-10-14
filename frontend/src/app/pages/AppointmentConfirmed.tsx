import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";

const styles = StyleSheet.create({
  container: {
    paddingTop: 200,
    paddingHorizontal: 100,
    gap: 340
  },
  image: {
    marginLeft: 50
  },
  text: {
    fontWeight: "bold",
    fontSize: 19,
    width: 325,
    marginLeft: -20
  },
  confirmationText: {
    alignContent: "center",
    justifyContent: "center",
    gap: 4
  },
  buttonText: {
    color: "white"
  },
  nextButton: {
    backgroundColor: "#d00000",
    borderRadius: 4,
    height: 50,
    alignContent: "center",
    justifyContent: "center",
    paddingHorizontal: 104,
    width: 250,
    marginLeft: -45
  }
});

export default function AppointmentConfirmed() {
  const router = useRouter();

  const handleNextPressed = () => {
    router.replace("/pages/tabs");
  };

  return (
    <View style={styles.container}>
      <View style={styles.confirmationText}>
        <Ionicons name="checkmark-circle-outline" color="#7ed957" size={70} style={styles.image} />
        <Text style={styles.text}>Appointment Confirmed</Text>
      </View>
      <TouchableOpacity style={styles.nextButton} onPress={() => handleNextPressed()}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View >
  )
}
