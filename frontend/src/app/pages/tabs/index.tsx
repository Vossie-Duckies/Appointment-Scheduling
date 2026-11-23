import { View, FlatList, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useCallback, useRef, useState, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import Toast from "react-native-toast-message";
import Heading from "@/app/Components/Heading";
import AppointmentCard from "@/app/Components/appointmentCard";
import { useDoctorPhotos } from "@/shared/doctorPhotos";
import { screenColumn } from "@/shared/layout";
import { cancelAppointment, getPastAppointments } from "@/app/api/auth";
import LoadError from "@/shared/LoadError";
import { confirmAction } from "@/shared/confirm";
import { formatDay, hhmm, startsAfter } from "@/shared/schedule";

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
    alignItems: "center",
    justifyContent: "center",
    gap: 25,
  },
  body: {
    width: '100%',
    flex: 1,
  },
  centerMessage: {
    textAlign: "center",
    color: "#6b6b6b",
    marginTop: 20
  },
  item: {
    width: "100%", 
    marginBottom: 6,
  },
  cancelButton: {
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 10,
  },
  cancelText: {
    color: "#d00000",
    fontWeight: "600",
  },
  cancelBusy: {
    opacity: 0.5,
  },
});

const sortKey = (item: BackendAppointment) => `${item.slot_details.slot_date} ${item.slot_details.start_time}`;

export default function UpcomingAppointments() {
  const [appointments, setAppointments] = useState<BackendAppointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const busy = useRef(false);

  const loadAppointments = useCallback(async () => {
    try {
      const data = await getPastAppointments();
      setAppointments(Array.isArray(data) ? data : []);
      setLoadError(null);
    } catch (err: any) {

      // Used to fall through to "No upcoming appointments found" when offline.
      setLoadError(err?.message || "Couldn't load your appointments.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  
  useFocusEffect(useCallback(() => {
    loadAppointments();
  }, [loadAppointments]));

  async function cancel(item: BackendAppointment) {
    if (busy.current) return;
    busy.current = true;
    setCancellingId(item.appointment_id);
    try {
      await cancelAppointment(item.appointment_id);
      Toast.show({
        type: 'success',
        text1: 'Appointment cancelled',
        text2: `Dr. ${item.slot_details.doctor_last_name} has been told.`,
      });
      await loadAppointments();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: "Couldn't cancel", text2: err?.message || 'Please try again.' });
    } finally {
      busy.current = false;
      setCancellingId(null);
    }
  }

  function askToCancel(item: BackendAppointment) {
    const { doctor_first_name, doctor_last_name, slot_date, start_time } = item.slot_details;
    confirmAction(
      'Cancel this appointment?',
      `Dr. ${doctor_first_name} ${doctor_last_name}, ${formatDay(slot_date)} at ${hhmm(start_time)}. ` +
        'The time will be offered to other patients.',
      'Cancel appointment',
      () => cancel(item),
      { destructive: true, cancelText: 'Keep it' },
    );
  }

  const retry = () => {
    setIsLoading(true);
    loadAppointments();
  };

  const refresh = () => {
    setIsRefreshing(true);
    loadAppointments();
  };

  // Booked appointments only, soonest first
  const bookedAppointments = useMemo(() => {
    return appointments
      .filter((item) => item.status === "BOOKED")
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  }, [appointments]);

  const photos = useDoctorPhotos(bookedAppointments.map((item) => item.slot_details.doctor_id));

  return (
    <View style={styles.container}>
      <Heading text="View Upcoming Appointments" variant="secondary" />

      {isLoading ? (
        <Text style={styles.centerMessage}>Loading upcoming appointments...</Text>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={retry} />
      ) : (
        <FlatList
          style={styles.body}
          data={bookedAppointments}
          keyExtractor={(item) => item.appointment_id.toString()}
          refreshing={isRefreshing}
          onRefresh={refresh}
          ListEmptyComponent={
            <Text style={styles.centerMessage}>No upcoming appointments found. Book one in the New tab.</Text>
          }
          renderItem={({ item }) => {
            const formattedTime = item.slot_details.start_time
              ? item.slot_details.start_time.slice(0, 5)
              : "";
            // The server refuses to cancel an appointment that has started.
            const canCancel = startsAfter(item.slot_details.slot_date, item.slot_details.start_time);
            const isCancelling = cancellingId === item.appointment_id;

            return (
              <View style={styles.item}>
                <AppointmentCard
                  patientName={`Dr. ${item.slot_details.doctor_first_name}`}
                  patientSurname={item.slot_details.doctor_last_name}
                  patientDate={item.slot_details.slot_date}
                  patientTime={formattedTime}
                  imageURL={photos[item.slot_details.doctor_id]}
                />
                {canCancel ? (
                  <TouchableOpacity
                    style={[styles.cancelButton, isCancelling && styles.cancelBusy]}
                    disabled={cancellingId !== null}
                    onPress={() => askToCancel(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Cancel appointment with Dr. ${item.slot_details.doctor_last_name} on ${formatDay(item.slot_details.slot_date)} at ${formattedTime}`}
                  >
                    <Text style={styles.cancelText}>{isCancelling ? "Cancelling..." : "Cancel appointment"}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }}
        />
      )}

    </View>
  );
}
