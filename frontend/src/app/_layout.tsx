import { Stack } from "expo-router";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import type { ToastConfig } from "react-native-toast-message";
import { StatusBar } from "expo-status-bar";

// Fixes found during testing:
// - The CSS import that was here ('@/example/src/global.css') points into the
//   git-ignored "example" folder, so a fresh clone failed to bundle. No screen
//   uses those styles (there are no className props), so it was removed.
// - <Toast /> now lives here, once, so messages appear on every screen. It used
//   to sit inside the first screen only, so toasts raised on Log In or any later
//   screen were drawn behind it and never seen.
// - Toasts may wrap onto extra lines, so longer error messages are not cut off.

const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#2E9E5B", height: "auto", minHeight: 60, paddingVertical: 8 }}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: "#d00000", height: "auto", minHeight: 60, paddingVertical: 8 }}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
    />
  ),
};

export default function RootLayout() {
  return (
    <>
     <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
      <Toast config={toastConfig} />
    </>
  );
}
