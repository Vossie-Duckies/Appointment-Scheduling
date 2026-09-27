import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface AppointmentCardProps {
  patientName: string,
  patientSurname: string,
  patientDate: string,
  patientTime: string
};

const styles = StyleSheet.create({
  card: {
    height: 60,
    width: 300,
    backgroundColor: "#ececec",
    justifyContent: "center"
  },
  primary: {
    fontWeight: "bold",
    fontSize: 18
  },
  secondary: {
    fontSize: 12
  }
});

const AppointmentCard: React.FC<AppointmentCardProps> = ({ patientName, patientSurname, patientDate, patientTime }) => {
  return (
    <TouchableOpacity style={styles.card}>
      <Text style={styles.primary}>{patientName} {patientSurname}</Text>
      <Text style={styles.secondary}>{patientDate} | {patientTime}</Text>
    </TouchableOpacity>
  );
};

export default AppointmentCard

