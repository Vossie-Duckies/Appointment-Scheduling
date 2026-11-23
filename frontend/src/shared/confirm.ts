import { Alert, Platform } from "react-native";

// Asks before an action that is hard to undo. Alert.alert shows no buttons on
// the web, so the browser's confirm() is used there (as on the doctor's Edit
// Appointment screen).
export function confirmAction(
  title: string,
  message: string,
  confirmText: string,
  onConfirm: () => void,
  options: { destructive?: boolean; cancelText?: string } = {},
): void {
  if (Platform.OS === "web") {
    if ((globalThis as any).confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: options.cancelText ?? "Go back", style: "cancel" },
    { text: confirmText, style: options.destructive ? "destructive" : "default", onPress: onConfirm },
  ]);
}

// A message that needs reading (longer than a toast), with one OK button.
export function showNotice(title: string, message: string): void {
  if (Platform.OS === "web") {
    (globalThis as any).alert?.(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
