import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "expo-router";
import Heading from "@/app/Components/Heading";
import Avatar from "@/app/Components/Avatar";
import { handleImageLoaded } from "expo-image/build/observe";
import { getAvailableSlots } from "@/app/api/auth";

// 1. Raw item returned from backend
export interface RawSlotFromBackend {
  slot_id: number;
  doctor_id: number;
  doctor__user__first_name: string;
  doctor__user__last_name: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

// 2. Transformed object: Doctors grouped with their slots & available times
export interface GroupedDoctor {
  doctor_id: number;
  first_name: string;
  last_name: string;
  slots: RawSlotFromBackend[];
  timeSlots: string[]; // e.g. ["09:00 - 09:30", "10:00 - 10:30"]
  imageURL?: string;
}

interface DoctorCardProps {
  doctor_id: number;
  first_name: string;
  last_name: string;
  slotsAvailable: number;
  imageURL?: string;
  isSelected: boolean;
  onSelect: () => void;
}

interface AvailableSlots {
  slot_id: number,
  doctor_id: number,
  slot_date: string,
  start_time: string,
  end_time: string,
  status: string,
  doctor_first_name: string,
  doctor_last_name: string,
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
    justifyContent: "center",
    width: 270,
    height: 50,
    borderRadius: 10,
    marginLeft: -25
  },
  buttonDisabled: {
    backgroundColor: "#a0a0a0",
    alignItems: "center",
    justifyContent: "center",
    width: 270,
    height: 50,
    borderRadius: 10,
    marginLeft: -25
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "bold"
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

const DoctorCard: React.FC<DoctorCardProps> = ({
  first_name,
  last_name,
  slotsAvailable,
  imageURL,
  isSelected,
  onSelect
}) => {
  return (
    <TouchableOpacity
      style={isSelected ? styles.activeDoctorCard : styles.doctorCard}
      onPress={onSelect}
    >
      <View style={styles.imageContainer}>
        <Avatar url={imageURL} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.primaryText}>Dr. {first_name} {last_name}</Text>
        <Text style={styles.secondaryText}>
          {slotsAvailable} slot{slotsAvailable === 1 ? '' : 's'} available
        </Text>
      </View>
    </TouchableOpacity>
  );
};

interface NextButtonProps {
  selectedDoctor: GroupedDoctor | null;
}

const NextButton: React.FC<NextButtonProps> = ({ selectedDoctor }) => {
  const router = useRouter();

  const handlePressed = () => {
    if (!selectedDoctor) return;

    // Navigate to setDateandTime screen, passing doctor details & times array
    router.push({
      pathname: "/pages/setDateandTime",
      params: {
        doctorId: selectedDoctor.doctor_id,
        doctorName: `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`,
        timeSlots: JSON.stringify(selectedDoctor.timeSlots), // Array of time strings
        rawSlots: JSON.stringify(selectedDoctor.slots)       // Complete slot objects
      }
    });
  };

  return (
    <TouchableOpacity
      style={selectedDoctor ? styles.buttonContainer : styles.buttonDisabled}
      onPress={handlePressed}
      disabled={!selectedDoctor}
    >
      <Text style={styles.buttonText}>Next</Text>
    </TouchableOpacity>
  );
};

export default function BookingNewAppointments() {
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [rawSlots, setRawSlots] = useState<RawSlotFromBackend[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const handleSelectDoctor = (id: number) => {
    // Tapping the active doctor deselects them; tapping another selects them
    setSelectedDoctorId((prevId) => (prevId === id ? null : id));
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchAvailableSlots() {
      try {
        const data = await getAvailableSlots();
        if (isMounted && Array.isArray(data)) {
          setRawSlots(data);
        }
      } catch (err: any) {
        console.error("Failed to fetch available doctors: ", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    fetchAvailableSlots();
    return () => {
      isMounted = false;
    };
  }, []);

  // Group raw slots by doctor_id
  const groupedDoctors = useMemo(() => {
    const map = new Map<number, GroupedDoctor>();

    rawSlots.forEach((slot) => {
      // Format start and end time (e.g. "09:00:00" -> "09:00")
      const formattedStart = slot.start_time.slice(0, 5);
      const formattedEnd = slot.end_time.slice(0, 5);
      const timeRange = `${formattedStart} - ${formattedEnd}`;

      if (!map.has(slot.doctor_id)) {
        map.set(slot.doctor_id, {
          doctor_id: slot.doctor_id,
          first_name: slot.doctor__user__first_name,
          last_name: slot.doctor__user__last_name,
          slots: [slot],
          timeSlots: [timeRange],
        });
      } else {
        const existing = map.get(slot.doctor_id)!;
        existing.slots.push(slot);
        existing.timeSlots.push(timeRange);
      }
    });

    return Array.from(map.values());
  }, [rawSlots]);

  // Retrieve the currently selected doctor object
  const selectedDoctor = useMemo(() => {
    return groupedDoctors.find((doc) => doc.doctor_id === selectedDoctorId) || null;
  }, [groupedDoctors, selectedDoctorId]);

  return (
    <View style={styles.container}>
      <View>
        <Heading text="Book New Appointment" variant="secondary" />
      </View>
      <Text style={styles.secondary}>Select a Doctor</Text>

      {isLoading ? (
        <Text>Loading...</Text>
      ) : groupedDoctors.length === 0 ? (
        <Text>No Available Doctors Found</Text>
      ) : (
        <FlatList
          style={styles.body}
          data={groupedDoctors}
          keyExtractor={(item) => item.doctor_id.toString()}
          renderItem={({ item }) => (
            <DoctorCard
              doctor_id={item.doctor_id}
              first_name={item.first_name}
              last_name={item.last_name}
              slotsAvailable={item.timeSlots.length}
              imageURL={item.imageURL}
              isSelected={selectedDoctorId === item.doctor_id}
              onSelect={() => handleSelectDoctor(item.doctor_id)}
            />
          )}
        />
      )}

      <NextButton selectedDoctor={selectedDoctor} />
    </View>
  );
}
