import { styles } from '../Styles/global';
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

// this is the screen that show a successful message after the successful update
// (Only the doctor's Update flow comes here now; patients who book see
// AppointmentConfirmed instead.)
export default function ConfirmScreen(){
    const { date, time } = useLocalSearchParams<{ date?: string; time?: string }>();

    return(// The confirmation screen withthe green check
        <View style = {styles.Container2}>

        <Ionicons name="checkmark-circle-outline" size={96} color="#2E9E5B" />

            <Text style = {styles.Mess}> Appointment Updated </Text>
            {date ? (
              <Text style = {[styles.patient, { marginTop: 8 }]}>New time: {date}{time ? ` at ${time}` : ''}</Text>
            ) : null}
            <Pressable style = {styles.button}
            accessibilityRole="button"
            // Back to the doctor's UPDATE list, which reloads and shows the new time.
            onPress = {()=> router.replace("/pages/doctorScreen/upcomingAppointment")}>
                <Text style = {styles.buttonText}> Next </Text>

            </Pressable>
        </View>
    )
}
