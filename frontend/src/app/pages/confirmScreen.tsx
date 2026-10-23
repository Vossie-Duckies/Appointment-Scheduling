import { styles } from '../Styles/global';
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

// this is the screen that show a successful message after the successful update
export default function ConfirmScreen(){
    return(// The confirmation screen withthe green check
        <View style = {styles.Container2}>

        <Ionicons name="checkmark-circle-outline" size={96} color="#2E9E5B" />

            <Text style = {styles.Mess}> Appointment Updated </Text>
            <Pressable style = {styles.button}
            // when we will click on next it will open the report delay pages , this is the way i found just to be able to display the report delay screen to test it.
            //
            onPress = {()=> router.replace("/pages/doctorScreen/upcomingAppointment")}>
                <Text style = {styles.buttonText}> Next </Text>

            </Pressable>
        </View>
    )
}
