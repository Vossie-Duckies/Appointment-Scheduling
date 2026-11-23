import { View, Text, StyleSheet } from "react-native";
import Avatar from "./Avatar";
import { CONTENT_MAX_WIDTH } from "@/shared/layout";

interface AppointmentCardProps {
  patientName: string,
  patientSurname: string,
  patientDate: string,
  patientTime: string,
  imageURL: string | null,
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    minHeight: 66,
    backgroundColor: "#ececec",
    borderRadius: 8,
    justifyContent: "center",
    marginVertical: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  primary: {
    fontWeight: "bold",
    fontSize: 18
  },
  secondary: {
    fontSize: 13,
    color: "#333333"
  },
  textContainer: {
   flex: 1
  }
});

const AppointmentCard: React.FC<AppointmentCardProps> = ({ patientName, patientSurname, patientDate, patientTime, imageURL }) => {
  return (
    <View style={styles.card}>
        <Avatar url={imageURL} name={`${patientName} ${patientSurname}`}/>
      <View style={styles.textContainer}>
        <Text style={styles.primary} numberOfLines={2}>{patientName} {patientSurname}</Text>
        <Text style={styles.secondary}>{patientDate} | {patientTime}</Text>
      </View>
    </View>
  );
};

export default AppointmentCard

