import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Upcoming</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={{
          default: require('@/assets/images/tabIcons/EventUpcoming.png'),
          selected: require('@/assets/images/tabIcons/EventUpcoming.png')
        }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="bookingNewAppointments">
        <NativeTabs.Trigger.Label>New</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={{
          default: require('@/assets/images/tabIcons/NewEvent.png'),
          selected: require('@/assets/images/tabIcons/NewEvent.png')
        }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="viewPastAppointments">
        <NativeTabs.Trigger.Label>Past</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={{
          default: require('@/assets/images/tabIcons/PastEvent.png'),
          selected: require('@/assets/images/tabIcons/PastEvent.png')
        }} />
      </NativeTabs.Trigger>
    </NativeTabs >
  );
}

