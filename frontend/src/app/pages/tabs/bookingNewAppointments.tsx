import Avatar from "@/app/Components/Avatar";
import Heading from "@/app/Components/Heading";
import { getAvailableSlots } from "@/app/api/auth";
import LoadError from "@/shared/LoadError";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDoctorPhotos } from "@/shared/doctorPhotos";
import { screenColumn } from "@/shared/layout";


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
    ...screenColumn,
    flex: 1,
    marginTop: 30,
    paddingBottom: 16,
    gap: 20,
  },
 
  listArea: {
    flex: 1,
  },
  buttonContainer: {
    backgroundColor: "#d00000",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 50,
    borderRadius: 10,
  },
  buttonDisabled: {
    backgroundColor: "#a0a0a0",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "bold"
  },
  secondary: {
    color: "#6b6b6b",
  },
  body: {
    flex: 1,
  },
  doctorCard: {
    width: "100%",
    minHeight: 66,
    backgroundColor: "#ececec",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
    marginVertical: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  activeDoctorCard: {  
    borderColor: "#d00000",
  },
  primaryText: {
    fontWeight: "bold",
    fontSize: 18
  },
  secondaryText: {
     fontSize: 13,
    color: "#333333"
  },
  textContainer: {
    flex: 1
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
      style={[styles.doctorCard, isSelected && styles.activeDoctorCard]}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
        <Avatar url={imageURL} name={`${first_name} ${last_name}`} />
      <View style={styles.textContainer}>
        <Text style={styles.primaryText} numberOfLines={2}>Dr. {first_name} {last_name}</Text>
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
      style={[styles.buttonContainer, !selectedDoctor && styles.buttonDisabled]}
      onPress={handlePressed}
      disabled={!selectedDoctor}
      accessibilityRole="button"
    >
      <Text style={styles.buttonText}>Next</Text>
    </TouchableOpacity>
  );
};

export default function BookingNewAppointments() {
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [rawSlots, setRawSlots] = useState<RawSlotFromBackend[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleSelectDoctor = (id: number) => {
    // Tapping the active doctor deselects them; tapping another selects them
    setSelectedDoctorId((prevId) => (prevId === id ? null : id));
  };

  const fetchAvailableSlots = useCallback(async () => {
    try {
      const data: any = await getAvailableSlots();
      setRawSlots(Array.isArray(data) ? data : []);
      setLoadError(null);
    } catch (err: any) {
      // Used to fall through to "No Available Doctors Found" when offline.
      setLoadError(err?.message || "Couldn't load available doctors.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Reloads whenever the tab is opened, so changes made elsewhere show up.
  // (After a booking, the slot counts used to stay out of date.)
  useFocusEffect(useCallback(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]));

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

  const photos = useDoctorPhotos(groupedDoctors.map((doc) => doc.doctor_id));

  
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

      <View style={styles.listArea}>
        {isLoading ? (
          <Text>Loading...</Text>
        ) : loadError ? (
          <LoadError
            message={loadError}
            onRetry={() => {
              setIsLoading(true);
              fetchAvailableSlots();
            }}
          />
        ) : (
          <FlatList
            style={styles.body}
            data={groupedDoctors}
            keyExtractor={(item) => item.doctor_id.toString()}
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              fetchAvailableSlots();
            }}
            ListEmptyComponent={<Text>No doctors have open slots right now. Pull down to refresh.</Text>}
            renderItem={({ item }) => (
              <DoctorCard
                doctor_id={item.doctor_id}
                first_name={item.first_name}
                last_name={item.last_name}
                slotsAvailable={item.timeSlots.length}
                imageURL={photos[item.doctor_id]}
                isSelected={selectedDoctorId === item.doctor_id}
                onSelect={() => handleSelectDoctor(item.doctor_id)}
              />
            )}
          />
        )}
      </View>

      <NextButton selectedDoctor={selectedDoctor} />
    </View>
  );
}
