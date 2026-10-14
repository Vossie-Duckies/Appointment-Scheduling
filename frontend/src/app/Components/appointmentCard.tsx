import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import Avatar from "./Avatar";

interface AppointmentCardProps {
  patientName: string,
  patientSurname: string,
  patientDate: string,
  patientTime: string,
  imageURL: string,
};

const styles = StyleSheet.create({
  card: {
    height: 60,
    width: 300,
    backgroundColor: "#ececec",
    justifyContent: "center",
    marginVertical: 6,
    flexDirection: "row",
    gap: 6
  },
  primary: {
    fontWeight: "bold",
    fontSize: 18
  },
  secondary: {
    fontSize: 12
  },
  imageContainer: {
    marginLeft: -70,
    marginTop: 6
  },
  textContainer: {
    marginTop: 6
  }
});

const AppointmentCard: React.FC<AppointmentCardProps> = ({ patientName, patientSurname, patientDate, patientTime, imageURL }) => {
  return (
    <TouchableOpacity style={styles.card}>
      <View style={styles.imageContainer}>
        <Avatar url={imageURL} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.primary}>{patientName} {patientSurname}</Text>
        <Text style={styles.secondary}>{patientDate} | {patientTime}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default AppointmentCard

