import { useEffect, useState } from "react";
import { AppState } from "react-native";
import Toast from "react-native-toast-message";
import { SESSION_EXPIRED_MESSAGE, getUnreadCount } from "@/app/api/auth";

// The number on the Alerts tab. The tab layouts show it; the Alerts screen
// updates it straight away when notifications are read.

const CHECK_EVERY_MS = 30000;

let unread = 0;
const listeners = new Set<(count: number) => void>();

export function setUnreadCount(count: number): void {
  unread = Math.max(0, count);
  listeners.forEach((listener) => listener(unread));
}

export async function refreshUnreadCount(): Promise<void> {
  try {
    setUnreadCount(await getUnreadCount());
  } catch (err: any) {
    // Offline: keep showing the last number. An expired login has already
    // opened Log In (see authFetch); say why, since no button was tapped.
    if (err?.message === SESSION_EXPIRED_MESSAGE) {
      Toast.show({ type: "error", text1: SESSION_EXPIRED_MESSAGE });
    }
  }
}

// "3", or "99+" for big numbers.
export function badgeText(count: number): string {
  return count > 99 ? "99+" : String(count);
}

// Asks the server every 30 seconds while a tab bar is on screen, and when the
// app comes back to the foreground.
export function useUnreadCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    listeners.add(setCount);
    refreshUnreadCount();
    const timer = setInterval(refreshUnreadCount, CHECK_EVERY_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshUnreadCount();
    });
    return () => {
      listeners.delete(setCount);
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  return count;
}
