import { View, Text, StyleSheet } from "react-native";
import { Calendar, CalendarList } from "react-native-calendars";
import Heading from "@/app/Components/Heading";

const styles = StyleSheet.create({});

export default function setDateandTime() {
  return (
    <View>
      <Heading text="Book New Appointment" variant="secondary" />
      <Text>Select a Date</Text>
      <View>
        <Calendar />
      </View>
      <Text>Select a Date</Text>
    </View>
  )
}

