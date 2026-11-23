import Constants from "expo-constants";
import * as Device from "expo-device";
import { File as LocalFile } from "expo-file-system";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { describeApiUrl, resolveApiUrl } from "../../shared/apiUrl";
import {
  AddTimeOffResult,
  AppointmenSlots,
  AvailableSlots,
  DoctorSchedule,
  LoginCredentials,
  NewSlot,
  NewTimeOff,
  NotificationInbox,
  PhotoAsset,
  Profile,
  RegistrationCredentials,
  ScheduleChangeResult,
  TimeOff,
  WeeklyHours,
} from "../types/auth";

// Address of the Django API (rules in src/shared/apiUrl.ts):
//   - EXPO_PUBLIC_API_URL from frontend/.env, if set;
//   - while running from `npx expo start`: Django on port 8000 of the computer
//     running Expo (10.0.2.2 from the Android emulator);
//   - in a release build: the deployed server.
// It used to fall back to the deployed server even during local testing, so a
// .env file that Expo had not loaded looked exactly like "server down".
const API = resolveApiUrl({
  envUrl: process.env.EXPO_PUBLIC_API_URL, 
  isDev: __DEV__,
  platform: Platform.OS,
  isDevice: Device.isDevice,
  hostUri: Constants.expoConfig?.hostUri,
  webHostname: (globalThis as any).location?.hostname,
});
export const BASE_API_URL = API.url;

if (__DEV__) {
  // Shows in the terminal running `npx expo start`.
  console.log(`[api] Using API server ${describeApiUrl(API)}`);
}

const ACCESS_TOKEN_KEY = "patient_token"; 
const REFRESH_TOKEN_KEY = "refresh_token";
const REQUEST_TIMEOUT_MS = 15000;

export const NETWORK_ERROR_MESSAGE = "Can't reach the server. Check your internet connection and try again.";
export const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please log in again.";
export const SERVER_ERROR_MESSAGE = "The server had a problem. Please try again in a moment.";

const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

export interface AuthResponse {
  message?: string;
  user_id: number;
  email: string;
  role: string;
  access: string;
  refresh: string;
}

// SecureStore on phones; localStorage when the app is opened with `expo start --web`
// (SecureStore has no web version, so login used to fail silently there).

async function storeItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try { (globalThis as any).localStorage?.setItem(key, value); } catch { /* storage blocked */ }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function readItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return (globalThis as any).localStorage?.getItem(key) ?? null; } catch { return null; }
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try { (globalThis as any).localStorage?.removeItem(key); } catch { /* storage blocked */ }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

async function saveSession(data: AuthResponse): Promise<void> {
  if (data.access) await storeItem(ACCESS_TOKEN_KEY, data.access);
  if (data.refresh) await storeItem(REFRESH_TOKEN_KEY, data.refresh);
}

export async function clearSession(): Promise<void> {
  await removeItem(ACCESS_TOKEN_KEY);
  await removeItem(REFRESH_TOKEN_KEY);
}

// Logging out removes the saved tokens, so later requests are refused until
// the user logs in again.
export async function logout(): Promise<void> {
  await clearSession();
}

// Opens Log In with an empty history, so Android back cannot reopen a
// logged-out account's screens.
export function goToLogin(): void {
  if (router.canDismiss?.()) router.dismissAll?.();
  router.replace("/pages/LoginPage");
}


// Turns an error response into a sentence for the user. Handles the shapes
// this API returns: {"message"}, {"error"}, {"detail"} and DRF field errors
// such as {"slot": "This slot is not available."} or {"slot": ["..."]}.
export async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  let body: any;
  try {
    body = await response.json();
  } catch {
    return fallback; 
  }
  if (body && typeof body === "object") {
    for (const key of ["message", "error", "detail"]) {
      const value = body[key];
      if (typeof value === "string" && value.trim()) return value;
    }
    for (const value of Object.values(body)) {
      if (typeof value === "string" && value.trim()) return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }
  return fallback;
}

// fetch with a time limit. No connection, a wrong address or a stopped server
// all end in the same clear message instead of an endless "Loading...".
async function send(path: string, init: RequestInit, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${BASE_API_URL}${path}`, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (__DEV__) {
      // The user only sees "Can't reach the server"; this says where and why.
      // console.log, not console.warn, so no yellow box covers the screen.
      const reason = controller.signal.aborted
        ? `no answer after ${timeoutMs / 1000}s`
        : String(err?.message ?? err);
      console.log(`[api] ${init.method ?? "GET"} ${BASE_API_URL}${path} failed: ${reason}`);
    }
    throw new Error(NETWORK_ERROR_MESSAGE);
  } finally {
    clearTimeout(timer);
  }
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    // A 5xx is the server's fault, so don't blame the user's input for it.
    const fallbackForStatus = response.status >= 500 ? SERVER_ERROR_MESSAGE : fallback;
    throw new Error(await readErrorMessage(response, fallbackForStatus));
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("The server sent an unexpected response. Please try again.");
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await readItem(REFRESH_TOKEN_KEY);
  if (!refresh) return null;
  const response = await send("/api/token/refresh/", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  if (!data?.access) return null;
  await storeItem(ACCESS_TOKEN_KEY, data.access);
  if (data.refresh) await storeItem(REFRESH_TOKEN_KEY, data.refresh);
  return data.access;
}

// Sends the saved access token. When it has expired (HTTP 401) the refresh
// token is used once to get a new one; if that fails too, the user is sent
// back to Log In with a clear message instead of seeing empty lists.
async function authFetch(path: string, init: RequestInit = {}, timeoutMs?: number): Promise<Response> {

  const isUpload = typeof FormData !== "undefined" && init.body instanceof FormData;
  const withToken = (token: string | null): RequestInit => ({
    ...init,
    headers: {
      ...(isUpload ? { Accept: "application/json" } : JSON_HEADERS),
      ...((init.headers as Record<string, string> | undefined) ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let response = await send(path, withToken(await readItem(ACCESS_TOKEN_KEY)), timeoutMs);

  if (response.status === 401) {
    const freshToken = await refreshAccessToken();
    if (freshToken) {
      response = await send(path, withToken(freshToken), timeoutMs);
    }
  }

  if (response.status === 401) {
    await clearSession();
    goToLogin();
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }
  return response;
}


export async function registerPatient(credentials: RegistrationCredentials): Promise<AuthResponse> {
  const response = await send("/account/register/", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(credentials),
  });
  const data = await readJson<AuthResponse>(response, "Unable to create your account. Please try again.");
  // The token used to be thrown away here, so a new user's first screens
  // loaded nothing (every request was sent as "Bearer null").
  await saveSession(data);
  return data;
}

export async function loginPatient(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await send("/account/login/", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(credentials),
  });
  const data = await readJson<AuthResponse>(response, "Invalid email or password");
  await saveSession(data);
  return data;
}

// ---- profile (patients and doctors) ---------------------------------------------

const PHOTO_UPLOAD_TIMEOUT_MS = 60000; // a phone photo can take a while on mobile data

export async function getProfile(): Promise<Profile> {
  const response = await authFetch("/account/profile/", { method: "GET" });
  return readJson<Profile>(response, "Couldn't load your profile. Please try again.");
}

// Sends the photo picked with expo-image-picker. The server crops it to a
// square, shrinks it and removes its metadata (such as the GPS location).
export async function uploadProfilePhoto(asset: PhotoAsset): Promise<Profile> {
  const type = asset.mimeType || "image/jpeg";
  const name = asset.fileName || (type === "image/png" ? "photo.png" : "photo.jpg");
  const form = new FormData();
  if (Platform.OS === "web") {

    form.append("photo", await (await fetch(asset.uri)).blob(), name);
  } else {
form.append("photo", new LocalFile(asset.uri));
  }
  const response = await authFetch("/account/profile/photo/", { method: "POST", body: form }, PHOTO_UPLOAD_TIMEOUT_MS);
  const data = await readJson<{ profile: Profile }>(response, "Couldn't upload your photo. Please try again.");
  return data.profile;
}

export async function deleteProfilePhoto(): Promise<Profile> {
  const response = await authFetch("/account/profile/photo/", { method: "DELETE" });
  const data = await readJson<{ profile: Profile }>(response, "Couldn't remove your photo. Please try again.");
  return data.profile;
}

export async function getDoctorPhotos(doctorIds: number[]):
Promise<Record<string, string>> {
  const response = await authFetch(`/account/doctors/photos/?ids=${doctorIds.join(",")}`, { method: "GET" });
  const data = await readJson<{ photos: Record<string, string> }>(response, "Couldn't load doctors' photos.");
  return data.photos || {};
}
// ---- patient ----------------------------------------------------------------

export async function getAvailableSlots(): Promise<AvailableSlots[]> {
  const response = await authFetch("/api/appointments/slots/", { method: "GET" });
  return readJson<AvailableSlots[]>(response, "Couldn't load available doctors. Please try again.");
}

export async function postPatientAppointment(data: AppointmenSlots): Promise<any> {
  const response = await authFetch("/api/appointments/book/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return readJson(response, "Couldn't book this appointment. Please try again.");
}

export async function getPastAppointments(): Promise<any> {
  const response = await authFetch("/api/appointments/my/", { method: "GET" });
  return readJson(response, "Couldn't load your appointments. Please try again.");
}

export async function cancelAppointment(appointmentId: number): Promise<any> {
  const response = await authFetch(`/api/appointments/${appointmentId}/cancel/`, { method: "POST" });
  return readJson(response, "Couldn't cancel this appointment. Please try again.");
}

// ---- doctor -----------------------------------------------------------------

export async function getDoctorAppointments(): Promise<any> {
  const response = await authFetch("/api/appointments/doctor/appointments/", { method: "GET" });
  return readJson(response, "Couldn't load your appointments. Please try again.");
}

// Moves a booked appointment into one of the doctor's open slots (from
// getDoctorSchedule). The old slot becomes open again, and the patient gets an alert.
export async function rescheduleAppointment(appointmentId: number, slotId: number): Promise<any> {
  const response = await authFetch(`/api/appointments/doctor/appointments/${appointmentId}/reschedule/`, {
    method: "POST",
    body: JSON.stringify({ slot_id: slotId }),
  });
  return readJson(response, "Couldn't update this appointment. Please try again.");
}

export async function completeAppointment(appointmentId: number): Promise<any> {
  const response = await authFetch(`/api/appointments/doctor/appointments/${appointmentId}/complete/`, {
    method: "POST",
  });
  return readJson(response, "Couldn't mark this appointment as completed.");
}

export async function markNoShow(appointmentId: number): Promise<any> {
  const response = await authFetch(`/api/appointments/doctor/appointments/${appointmentId}/no-show/`, {
    method: "POST",
  });
  return readJson(response, "Couldn't mark this appointment as a no-show.");
}

// ---- doctor schedule ----------------------------------------------------------

// Own slots between two dates ("YYYY-MM-DD", at most 92 days), plus time off in that period.
export async function getDoctorSchedule(from: string, to: string): Promise<DoctorSchedule> {
  const query = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const response = await authFetch(`/api/appointments/doctor/slots/?${query}`, { method: "GET" });
  return readJson<DoctorSchedule>(response, "Couldn't load your schedule. Please try again.");
}

export async function createDoctorSlot(slot: NewSlot): Promise<any> {
  const response = await authFetch("/api/appointments/doctor/slots/", {
    method: "POST",
    body: JSON.stringify(slot),
  });
  return readJson(response, "Couldn't add this slot. Please try again.");
}

export async function deleteDoctorSlot(slotId: number): Promise<any> {
  const response = await authFetch(`/api/appointments/doctor/slots/${slotId}/`, { method: "DELETE" });
  return readJson(response, "Couldn't delete this slot. Please try again.");
}

export async function blockDoctorSlot(slotId: number): Promise<any> {
  const response = await authFetch(`/api/appointments/doctor/slots/${slotId}/block/`, { method: "POST" });
  return readJson(response, "Couldn't block this slot. Please try again.");
}

export async function unblockDoctorSlot(slotId: number): Promise<any> {
  const response = await authFetch(`/api/appointments/doctor/slots/${slotId}/unblock/`, { method: "POST" });
  return readJson(response, "Couldn't unblock this slot. Please try again.");
}

export async function addWeeklyHours(hours: WeeklyHours): Promise<ScheduleChangeResult> {
  const response = await authFetch("/api/appointments/doctor/slots/weekly/", {
    method: "POST",
    body: JSON.stringify(hours),
  });
  return readJson<ScheduleChangeResult>(response, "Couldn't add these hours. Please try again.");
}

export async function removeWeeklyHours(hours: WeeklyHours): Promise<ScheduleChangeResult> {
  const response = await authFetch("/api/appointments/doctor/slots/weekly/remove/", {
    method: "POST",
    body: JSON.stringify(hours),
  });
  return readJson<ScheduleChangeResult>(response, "Couldn't remove these hours. Please try again.");
}

export async function getTimeOff(): Promise<TimeOff[]> {
  const response = await authFetch("/api/appointments/doctor/time-off/", { method: "GET" });
  return readJson<TimeOff[]>(response, "Couldn't load your time off. Please try again.");
}

export async function addTimeOff(timeOff: NewTimeOff): Promise<AddTimeOffResult> {
  const response = await authFetch("/api/appointments/doctor/time-off/", {
    method: "POST",
    body: JSON.stringify(timeOff),
  });
  return readJson<AddTimeOffResult>(response, "Couldn't save this time off. Please try again.");
}

export async function deleteTimeOff(timeOffId: number): Promise<any> {
  const response = await authFetch(`/api/appointments/doctor/time-off/${timeOffId}/`, { method: "DELETE" });
  return readJson(response, "Couldn't remove this time off. Please try again.");
}

// ---- notifications (patients and doctors) --------------------------------------

export async function getNotifications(): Promise<NotificationInbox> {
  const response = await authFetch("/api/notifications/", { method: "GET" });
  return readJson<NotificationInbox>(response, "Couldn't load your notifications. Please try again.");
}

export async function getUnreadCount(): Promise<number> {
  const response = await authFetch("/api/notifications/unread-count/", { method: "GET" });
  const data = await readJson<{ unread_count: number }>(response, "Couldn't check for new notifications.");
  return data.unread_count;
}

export async function markNotificationRead(notificationId: number): Promise<number> {
  const response = await authFetch(`/api/notifications/${notificationId}/read/`, { method: "POST" });
  const data = await readJson<{ unread_count: number }>(response, "Couldn't update this notification.");
  return data.unread_count;
}

export async function markAllNotificationsRead(): Promise<void> {
  const response = await authFetch("/api/notifications/read-all/", { method: "POST" });
  await readJson(response, "Couldn't update your notifications. Please try again.");
}

// Sends an in-app message to the other person on the appointment (the patient,
// when a doctor sends it). Used for "Running late".
export async function sendAppointmentMessage(appointmentId: number, message: string): Promise<any> {
  const response = await authFetch("/api/notifications/", {
    method: "POST",
    body: JSON.stringify({ type: "IN_APP", appointment_id: appointmentId, message }),
  });
  return readJson(response, "Couldn't send your message. Please try again.");
}
