import { View, FlatList, StyleSheet, Text } from "react-native";
import React, { useCallback, useState, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import Heading from "@/app/Components/Heading";
import AppointmentCard from "@/app/Components/appointmentCard";
import { useDoctorPhotos } from "@/shared/doctorPhotos";
import { screenColumn } from "@/shared/layout";
import { getPastAppointments } from "@/app/api/auth";
import LoadError from "@/shared/LoadError";

// 1. Match the exact shape of your backend appointment response
interface BackendAppointment {
  appointment_id: number;
  slot: number;
  slot_details: {
    slot_id: number;
    doctor_id: number;
    doctor_first_name: string;
    doctor_last_name: string;
    slot_date: string;
    start_time: string;
    end_time: string;
    status: string;
  };
  status: string;
  reason: string;
};

const styles = StyleSheet.create({
  container: {
    ...screenColumn,
    flex: 1,
    marginTop: 30,
    gap: 25,
  },
  body: {
    flex: 1,
    width: "100%"
  },
  centerMessage: {
    textAlign: "center",
    color: "#6b6b6b",
    marginTop: 20
  }
});

const sortKey = (item: BackendAppointment) => `${item.slot_details.slot_date} ${item.slot_details.start_time}`;

export default function ViewPastAppointments() {
  const [appointments, setAppointments] = useState<BackendAppointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    try {
      const data = await getPastAppointments();
      setAppointments(Array.isArray(data) ? data : []);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || "Couldn't load your appointments.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadAppointments();
  }, [loadAppointments]));

  // Completed appointments only, most recent first
  const completedAppointments = useMemo(() => {
    return appointments
      .filter((item) => item.status === "COMPLETED")
      .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  }, [appointments]);

  const photos = useDoctorPhotos(completedAppointments.map((item) => item.slot_details.doctor_id));

  return (
    <View style={styles.container}>
      <Heading text="View Past Appointment" variant="secondary" />

      {isLoading ? (
        <Text style={styles.centerMessage}>Loading appointments...</Text>
      ) : loadError ? (
        <LoadError
          message={loadError}
          onRetry={() => {
            setIsLoading(true);
            loadAppointments();
          }}
        />
      ) : (
        <FlatList
          style={styles.body}
          data={completedAppointments}
          keyExtractor={(item) => item.appointment_id.toString()}
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            loadAppointments();
          }}
          // The empty message used to check all appointments, so a patient with
          // only upcoming bookings saw a blank list with no message.
          ListEmptyComponent={<Text style={styles.centerMessage}>No past appointments yet.</Text>}
          renderItem={({ item }) => {
            // Format start time (e.g., "09:00:00" -> "09:00")
            const formattedTime = item.slot_details.start_time
              ? item.slot_details.start_time.slice(0, 5)
              : "";

            return (
              <AppointmentCard
                patientName={`Dr. ${item.slot_details.doctor_first_name}`}
                patientSurname={item.slot_details.doctor_last_name}
                patientDate={item.slot_details.slot_date}
                patientTime={formattedTime}
                imageURL={photos[item.slot_details.doctor_id]}
              />
            );
          }}
        />
      )}
    </View>
  )
}