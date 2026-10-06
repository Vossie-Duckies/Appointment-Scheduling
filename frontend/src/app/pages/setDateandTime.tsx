import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import Heading from "../Components/Heading";
import { Calendar } from "react-native-calendars";
import { useState } from "react";

const styles = StyleSheet.create({
  container: {
    alignContent: "center",
    justifyContent: "center",
    paddingHorizontal: 50,
    gap: 25
  },
  secondaryText: {
    color: "#9d9d9d",
    fontSize: 12
  },
  slotInactive: {
    backgroundColor: "#cecece",
    width: 60,
    height: 30,
    alignContent: "center",
    justifyContent: "center",
    paddingLeft: 10,
    borderRadius: 4
  },
  slotTextInactive: {
    color: "black"
  },
  slotActive: {
    backgroundColor: "#d00000",
    width: 60,
    height: 30,
    alignContent: "center",
    justifyContent: "center",
    paddingLeft: 10,
    borderRadius: 4
  },
  slotTextActive: {
    color: "white"
  },
  slotContainer: {
    flexDirection: "row",
    gap: 2
  },
  confirmButton: {
    backgroundColor: "#d00000",
    borderRadius: 10,
    height: 50,
    alignContent: "center",
    justifyContent: "center",
    paddingLeft: 100
  }
});

const availaleSlots: Array<string> = ['09:00', '10:00', '11:00', '13:00', '15:00']

const AvailableTime = ({ time, key }: { time: string, key: number }) => {
  const [active, setActive] = useState<boolean>(false);

  const handleActiveState = () => {
    setActive(!active);
  };

  return (
    <TouchableOpacity style={active ? styles.slotActive : styles.slotInactive} onPress={() => handleActiveState()}>
      <Text style={active ? styles.slotTextActive : styles.slotTextInactive}>{time}</Text>
    </TouchableOpacity>
  )
};

export default function setDateandTime() {
  const [selectedDate, setSelectedDate] = useState<string>("");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Heading text="Book New Appointment" variant="secondary" />
      <Text style={styles.secondaryText}>Select a Date</Text>
      <View>
        <Calendar
          onDayPress={(day) => {
            setSelectedDate(day.dateString);
          }}
          markingType='custom'
          markedDates={{
            [selectedDate]: {
              customStyles: {
                container: {
                  backgroundColor: "#d00000",
                  borderRadius: 6
                },
                text: {
                  color: "white"
                }
              }
            }
          }}
          theme={{
            textMonthFontWeight: "bold",

          }}
          renderArrow={(direction) => {
            if (direction === 'left') return <Ionicons name="chevron-back-outline" color="#000000" size={20} />
            if (direction === 'right') return <Ionicons name="chevron-forward-outline" color="#000000" size={20} />
          }}
        />
      </View>
      <Text>Select a Date</Text>
      <View style={styles.slotContainer}>
        {availaleSlots.map((slot, index) => (
          <AvailableTime time={slot} key={index} />
        ))}
      </View>
      <TouchableOpacity style={styles.confirmButton}>
        <Text style={styles.slotTextActive}>Confirm</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

