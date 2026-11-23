import Ionicons from "@react-native-vector-icons/ionicons";
import { Tabs } from 'expo-router';
import { badgeText, useUnreadCount } from '@/shared/unreadCount';


export default function TabLayout() {
  const unread = useUnreadCount();

  return (
    < Tabs
      screenOptions={{
        headerShown: false, tabBarActiveTintColor: '#C40018'
      }}
    >
      <Tabs.Screen name="editAppointment"
        options={{
          title: 'EDIT',
          tabBarIcon: ({ color, size }) => < Ionicons name="create-outline" size={size} color={color} />,

        }}

      />
      <Tabs.Screen name="upcomingAppointment"
        options={{
          title: 'UPDATE',
          tabBarIcon: ({ color, size }) => < Ionicons name="calendar-outline" size={size} color={color} />,

        }}
      />
      {/* Open slots, weekly hours and time off. */}
      <Tabs.Screen name="schedule"
        options={{
          title: 'SCHEDULE',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
        }}
      />
      {/* New bookings and cancellations. The badge is the unread count. */}
      <Tabs.Screen name="notifications"
        options={{
          title: 'ALERTS',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
          tabBarBadge: unread > 0 ? badgeText(unread) : undefined,
        }}
      />
      {/* Your details and an optional photo. */}
      <Tabs.Screen name="profile"
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>


  );
}
