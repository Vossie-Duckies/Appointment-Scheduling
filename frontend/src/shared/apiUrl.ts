// Works out which Django server the app talks to.
//
// Order:
//   1. EXPO_PUBLIC_API_URL from frontend/.env, when it is set.
//   2. While running from `npx expo start`: the computer running Expo, port 8000
//      (Android emulator -> 10.0.2.2, phone on Wi-Fi -> the computer's Wi-Fi IP).
//   3. Otherwise (a release build): the deployed server.
//
// Step 2 is new. Before it, a .env file that Expo did not load (saved as
// ".env.txt", saved as UTF-16 by PowerShell, or put in the wrong folder) sent
// every request to the deployed server, without any sign of it, and local
// testing failed with "Can't reach the server".
//
// No React Native imports here, so this can be unit-tested
// (__tests__/apiUrl_test.ts). This folder sits outside src/app on purpose:
// Expo Router treats every file inside src/app as a screen.

export const DEPLOYED_API_URL = "http://13.246.11.197";
export const LOCAL_API_PORT = 8000;
// The Android emulator's name for the computer it runs on.
export const ANDROID_EMULATOR_HOST = "10.0.2.2";

export type ApiUrlSource = "env" | "dev-machine" | "deployed";

export interface ApiUrlInputs {
  envUrl?: string | null; // process.env.EXPO_PUBLIC_API_URL
  isDev: boolean; // __DEV__: true when the app runs from `npx expo start`
  platform: string; // Platform.OS
  isDevice: boolean; // expo-device: false on an emulator or simulator
  hostUri?: string | null; // Constants.expoConfig?.hostUri, e.g. "192.168.1.20:8081"
  webHostname?: string | null; // location.hostname when running in a browser
}

export interface ResolvedApiUrl {
  url: string;
  source: ApiUrlSource;
}

// Tolerates the usual .env slips: spaces, quotes, a byte-order mark, a
// trailing slash, or a missing "http://".
export function cleanApiUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  let value = raw.replace(/^﻿/, "").trim().replace(/^["']+|["']+$/g, "").trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `http://${value}`;
  return value.replace(/\/+$/, "");
}

// "192.168.1.20:8081" -> "192.168.1.20". Returns null for an Expo tunnel
// address (*.exp.direct): the tunnel only carries Expo's own traffic, so
// Django on the computer can't be reached through it.
export function hostFromHostUri(hostUri: string | null | undefined): string | null {
  if (typeof hostUri !== "string" || !hostUri.trim()) return null;
  const authority = hostUri.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split("/")[0];
  const host = authority.startsWith("[")
    ? authority.slice(0, authority.indexOf("]") + 1) // IPv6, e.g. "[::1]:8081"
    : authority.split(":")[0];
  if (!host || /\.exp\.direct$/i.test(host)) return null;
  return host;
}

function devMachineHost(inputs: ApiUrlInputs): string | null {
  if (inputs.platform === "web") return inputs.webHostname || "localhost";
  if (!inputs.isDevice) {
    // Android emulator: 10.0.2.2. iOS simulator: shares the computer's network.
    return inputs.platform === "android" ? ANDROID_EMULATOR_HOST : "localhost";
  }
  // Real phone: the computer's address that Expo Go already used to load the app.
  return hostFromHostUri(inputs.hostUri);
}

export function resolveApiUrl(inputs: ApiUrlInputs): ResolvedApiUrl {
  const fromEnv = cleanApiUrl(inputs.envUrl);
  if (fromEnv) return { url: fromEnv, source: "env" };

  if (inputs.isDev) {
    const host = devMachineHost(inputs);
    if (host) return { url: `http://${host}:${LOCAL_API_PORT}`, source: "dev-machine" };
  }

  return { url: DEPLOYED_API_URL, source: "deployed" };
}

export function describeApiUrl({ url, source }: ResolvedApiUrl): string {
  switch (source) {
    case "env":
      return `${url} (from EXPO_PUBLIC_API_URL in .env)`;
    case "dev-machine":
      return `${url} (your computer, found automatically; no EXPO_PUBLIC_API_URL was loaded)`;
    default:
      return `${url} (deployed server)`;
  }
}
