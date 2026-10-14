import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import Heading from "@/app/Components/Heading";
import Avatar from "@/app/Components/Avatar";
import { handleImageLoaded } from "expo-image/build/observe";

interface DoctorCardKeys {
  id: number,
  doctorName: string,
  doctorSurname: string,
  slotsAvailable: number,
  imageURL: string,
};

interface DoctorCardProps extends DoctorCardKeys {
  isSelected: boolean,
  onSelect: () => void
};

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
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
    flexDirection: "row",
    gap: 6
  },
  activeDoctorCard: {
    backgroundColor: "#ececec",
    height: 60,
    width: 270,
    justifyContent: "center",
    marginVertical: 8,
    borderWidth: 2,
    borderColor: "#d00000",
    flexDirection: "row",
    gap: 6
  },
  primaryText: {
    fontWeight: "bold",
    fontSize: 18
  },
  secondaryText: {
    fontSize: 12
  },
  imageContainer: {
    marginLeft: -70,
    marginTop: 6
  },
  textContainer: {
    marginTop: 6,
    marginLeft: 6
  }
});

const doctors: DoctorCardKeys[] = [
  { id: 1, doctorName: "Dr. Sarai", doctorSurname: "Kelly", slotsAvailable: 5, imageURL: "https://images.peopleimages.com/picture/202307/2716283-man-doctor-portrait-and-thumbs-up-with-smile-from-healthcare-and-medical-work-in-studio.-isolated-white-background-and-happy-male-professional-with-emoji-and-yes-hand-gesture-for-success-and-like-fit_400_400.jpg" },
  { id: 2, doctorName: "Dr. Remy", doctorSurname: "Novak", slotsAvailable: 7, imageURL: "https://images.peopleimages.com/picture/202305/2702046-tablet-doctor-portrait-and-woman-isolated-on-a-white-background-of-happy-healthcare-research-or-telehealth-services.-face-of-african-medical-person-typing-on-digital-tech-and-paperless-app-in-studio-fit_400_400.jpg" },
  { id: 3, doctorName: "Dr. Siya", doctorSurname: "Cele", slotsAvailable: 3, imageURL: "https://images.peopleimages.com/picture/202305/2702046-tablet-doctor-portrait-and-woman-isolated-on-a-white-background-of-happy-healthcare-research-or-telehealth-services.-face-of-african-medical-person-typing-on-digital-tech-and-paperless-app-in-studio-fit_400_400.jpg" }
];

const DoctorCard: React.FC<DoctorCardProps> = ({
  doctorName,
  doctorSurname,
  slotsAvailable,
  imageURL,
  isSelected,
  onSelect }) => {

  return (
    <TouchableOpacity style={isSelected ? styles.activeDoctorCard : styles.doctorCard} onPress={onSelect}>
      <View style={styles.imageContainer}>
        <Avatar url={imageURL} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.primaryText}>{doctorName} {doctorSurname}</Text>
        <Text style={styles.secondaryText}>{slotsAvailable} available this week</Text>
      </View>
    </TouchableOpacity>
  )
};

const NextButton = () => {
  const router = useRouter();
  const handelPressed = () => {
    router.replace("/pages/setDateandTime");
  };

  return (
    <TouchableOpacity style={styles.buttonContainer} onPress={handelPressed}>
      <Text style={styles.buttonText}>Next</Text>
    </TouchableOpacity>
  )
};

export default function BookingNewAppointments() {
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const handleSelectDoctor = (id: number) => {
    // Tapping the same the doctor deselects them; tapping a new doctor selects them
    setSelectedDoctorId((prevId: number | null) => (prevId === id ? null : id))
  };

  return (
    <View style={styles.container}>
      <View >
        <Heading text="Book New Appointment" variant="secondary" />
      </View>
      <Text style={styles.secondary}>Select a Doctor</Text>
      <FlatList
        style={styles.body}
        data={doctors}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DoctorCard
          doctorName={item.doctorName}
          doctorSurname={item.doctorSurname}
          slotsAvailable={item.slotsAvailable}
          imageURL={item.imageURL}
          isSelected={selectedDoctorId === item.id}
          onSelect={() => handleSelectDoctor(item.id)}
        />}
      />
      <NextButton />
    </View>
  )
}

