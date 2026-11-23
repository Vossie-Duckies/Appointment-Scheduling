import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/app/api/auth";
import type { AppNotification } from "@/app/types/auth";
import { RED } from "./Chip";
import LoadError from "./LoadError";
import { formatDay, hhmm, timeAgo } from "./schedule";
import { setUnreadCount } from "./unreadCount";

// The Alerts tab, for patients and doctors: booking changes and messages
// about their appointments (the Notification table on the server). Tapping a
// notification marks it as read.

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "bold" },
  subtitle: { color: "#666", marginTop: 2 },
  markAll: { paddingVertical: 6, paddingHorizontal: 4 },
  markAllText: { color: RED, fontWeight: "700" },
  row: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d6d6d6",
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: RED },
  dotRead: { backgroundColor: "transparent" },
  body: { flex: 1, gap: 3 },
  message: { fontSize: 15, color: "#444" },
  unreadMessage: { color: "#000", fontWeight: "600" },
  meta: { fontSize: 12, color: "#777" },
  empty: { textAlign: "center", color: "#6b6b6b", marginTop: 30, paddingHorizontal: 20 },
});

export default function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const inbox = await getNotifications();
      setItems(inbox.results);
      setUnreadCount(inbox.unread_count);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || "Couldn't load your notifications.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Reloads every time the tab is opened.
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const setRead = (id: number, isRead: boolean) =>
    setItems((list) => list.map((item) => (item.notification_id === id ? { ...item, is_read: isRead } : item)));

  async function open(item: AppNotification) {
    if (item.is_read) return;
    setRead(item.notification_id, true); // straight away; undone if the server says no
    try {
      setUnreadCount(await markNotificationRead(item.notification_id));
    } catch (err: any) {
      setRead(item.notification_id, false);
      Toast.show({ type: "error", text1: "Couldn't update the notification", text2: err?.message });
    }
  }

  async function markAll() {
    if (isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((list) => list.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (err: any) {
      Toast.show({ type: "error", text1: "Couldn't update your notifications", text2: err?.message });
    } finally {
      setIsMarkingAll(false);
    }
  }

  const unread = items.filter((item) => !item.is_read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title} accessibilityRole="header">Notifications</Text>
          <Text style={styles.subtitle}>{unread === 0 ? "All caught up" : `${unread} unread`}</Text>
        </View>
        {unread > 0 ? (
          <Pressable style={styles.markAll} onPress={markAll} disabled={isMarkingAll} accessibilityRole="button">
            <Text style={styles.markAllText}>{isMarkingAll ? "Saving..." : "Mark all as read"}</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <Text style={styles.empty}>Loading notifications...</Text>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={() => { setIsLoading(true); load(); }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.notification_id.toString()}
          refreshing={isRefreshing}
          onRefresh={() => { setIsRefreshing(true); load(); }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No notifications yet. Booking changes and messages about your appointments will show up here.
            </Text>
          }
          renderItem={({ item }) => {
            const { appointment } = item;
            return (
              <Pressable
                style={styles.row}
                onPress={() => open(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.is_read ? "" : "Unread. "}${item.message}`}
                accessibilityHint={item.is_read ? undefined : "Marks this notification as read"}
              >
                <View style={[styles.dot, item.is_read && styles.dotRead]} />
                <View style={styles.body}>
                  <Text style={[styles.message, !item.is_read && styles.unreadMessage]}>{item.message}</Text>
                  <Text style={styles.meta}>
                    {appointment.with_name} · {formatDay(appointment.slot_date)}, {hhmm(appointment.start_time)} · {timeAgo(item.sent_at)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
