import { PatientCard } from '../Components/patientCards';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { styles } from '../Styles/global';
import { router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';

interface BackendAppointment {
  appointment_id: number;
  patient_name: string;
  patient_email: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  status: string;
};

// report delay screen implementation

export default function () {
  const { appointmentData } = useLocalSearchParams<{ appointmentData?: string }>();
  const [appointment, setAppointment] = useState<BackendAppointment | null>(null);


  useEffect(() => {
    if (appointmentData) {
      try {
        const parsedData: BackendAppointment = JSON.parse(appointmentData);
        setAppointment(parsedData);
        console.log("Successfully received appointments: ", parsedData);
      } catch (err: any) {
        console.error("Failed to parse appointment data: ", err);
      }
    }
  }, [appointmentData])

  if (!appointment) {
    return (
      <View style={styles.container}>
        <Text>Loading appointment details...</Text>
      </View>
    );
  }

    return(
      <View style={styles.container}>
            <Text style={styles.heading}>Edit Appointment #{appointment.appointment_id}</Text>
            <View style={styles.card}>
              <Text>Patient: {appointment.patient_name}</Text>
              <Text>Email: {appointment.patient_email}</Text>
              <Text>Date: {appointment.slot_date}</Text>
              <Text>Time: {appointment.start_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}</Text>
              <Text>Reason: {appointment.reason}</Text>
              <Text>Status: {appointment.status}</Text>
            </View>
          </View>
    )
}
