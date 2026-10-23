import Ionicons from "@react-native-vector-icons/ionicons";
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    < Tabs
      screenOptions={{
        headerShown: false, tabBarActiveTintColor: ' #C40018'
      }}
    >
      <Tabs.Screen name="editAppointment"
        options={{
          title: 'EDIT',
          tabBarIcon: ({ color, size }) => < Ionicons name="calendar" size={size} color={color} />,

        }}

      />
      <Tabs.Screen name="upcomingAppointment"
        options={{
          title: 'UPDATE',
          tabBarIcon: ({ color, size }) => < Ionicons name="calendar" size={size} color={color} />,

        }}
      />
    </Tabs>


  );
}
