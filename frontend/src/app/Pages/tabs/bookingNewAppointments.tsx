import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import React, { useState } from "react";
import Heading from "@/app/components/Heading";

interface DoctorCardProps {
  doctorName: string,
  doctorSurname: string,
  slotsAvailable: number
};

const styles = StyleSheet.create({
  container: {
    alignContent: "center",
    justifyContent: "center",
    gap: 25,
    paddingHorizontal: 75
  },
  buttonContainer: {
    backgroundColor: "#d00000",
    alignItems: "center",
    paddingTop: 13,
    width: 270,
    height: 50,
    borderRadius: 10,
    marginLeft: -25
  },
  buttonText: {
    color: "#ffffff"
  },
  secondary: {
    color: "#9d9d9d",
  },
  body: {
    height: 320,
    width: 275,
    marginLeft: -21
  },
  doctorCard: {
    backgroundColor: "#ececec",
    height: 60,
    width: 270,
    justifyContent: "center",
    marginVertical: 8,
  },
  activeDoctorCard: {
    backgroundColor: "#ececec",
    height: 60,
    width: 270,
    justifyContent: "center",
    marginVertical: 8,
    borderWidth: 2,
    borderColor: "#d00000"
  },
  primaryText: {
    fontWeight: "bold",
    fontSize: 18
  },
  secondaryText: {
    fontSize: 12
  }
});

const doctors: DoctorCardProps[] = [
  { doctorName: "Dr. Sarai", doctorSurname: "Kelly", slotsAvailable: 5 },
  { doctorName: "Dr. Remy", doctorSurname: "Novak", slotsAvailable: 7 },
  { doctorName: "Dr. Siya", doctorSurname: "Cele", slotsAvailable: 3 }
];

const DoctorCard: React.FC<DoctorCardProps> = ({ doctorName, doctorSurname, slotsAvailable }) => {
  const [isSelected, setIsSelected] = useState<boolean>(false);
  //TODO: Implement a active counter to keep track of active / selected cards. Only card can be selected at a time.

  return (
    <TouchableOpacity style={isSelected ? styles.activeDoctorCard : styles.doctorCard} onPress={() => setIsSelected(!isSelected)}>
      <Text style={styles.primaryText}>{doctorName} {doctorSurname}</Text>
      <Text style={styles.secondaryText}>{slotsAvailable} available this week</Text>
    </TouchableOpacity>
  )
};

const NextButton = () => {
  return (
    <TouchableOpacity style={styles.buttonContainer}>
      <Text style={styles.buttonText}>Next</Text>
    </TouchableOpacity>
  )
};

export default function BookingNewAppointments() {
  return (
    <View style={styles.container}>
      <Heading text="Book New Appointment" variant="secondary" />
      <Text style={styles.secondary}>Select a Doctor</Text>
      <FlatList
        style={styles.body}
        data={doctors}
        renderItem={({ item }) => <DoctorCard
          doctorName={item.doctorName}
          doctorSurname={item.doctorSurname}
          slotsAvailable={item.slotsAvailable}
        />}
      />
      <NextButton />
    </View>
  )
}

