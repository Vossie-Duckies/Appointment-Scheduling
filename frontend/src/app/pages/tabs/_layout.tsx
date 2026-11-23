import { NativeTabs } from "expo-router/unstable-native-tabs";
import { badgeText, useUnreadCount } from "@/shared/unreadCount";
import { RED } from "@/shared/Chip"

const GREY = "#6b6b6b";
const LIGHT_RED = "#fbe3e6";

export default function TabLayout() {
  const unread = useUnreadCount();

  return (
        <NativeTabs
      backgroundColor="#ffffff"
      iconColor={{ default: GREY, selected: RED }}
      labelStyle={{ default: { color: GREY }, selected: { color: RED } }}
      indicatorColor={LIGHT_RED}
      rippleColor={LIGHT_RED}
      badgeBackgroundColor={RED}
      badgeTextColor="#ffffff"
      labelVisibilityMode="labeled"
    >
    
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

      <NativeTabs.Trigger name="notifications">
        <NativeTabs.Trigger.Label>Alerts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bell" md="notifications" />
        {/* No text when nothing is unread: expo-router shows any text it is given, even "0" with hidden set. */}
        <NativeTabs.Trigger.Badge hidden={unread === 0}>{unread > 0 ? badgeText(unread) : undefined}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs >
  );
}
