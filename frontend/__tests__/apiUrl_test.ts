// Unit tests for how the app picks its API server (src/shared/apiUrl.ts).
// Run with:  npx jest
import {
  ANDROID_EMULATOR_HOST,
  DEPLOYED_API_URL,
  cleanApiUrl,
  hostFromHostUri,
  resolveApiUrl,
} from "../src/shared/apiUrl";

const emulator = { isDev: true, platform: "android", isDevice: false, hostUri: "192.168.1.20:8081" };
const phone = { isDev: true, platform: "android", isDevice: true, hostUri: "192.168.1.20:8081" };

describe("resolveApiUrl", () => {
  it("uses EXPO_PUBLIC_API_URL when it is set", () => {
    expect(resolveApiUrl({ ...emulator, envUrl: "http://10.0.2.2:8000" })).toEqual({
      url: "http://10.0.2.2:8000",
      source: "env",
    });
  });

  it("finds the computer from the Android emulator when .env was not loaded", () => {
    expect(resolveApiUrl({ ...emulator, envUrl: undefined })).toEqual({
      url: `http://${ANDROID_EMULATOR_HOST}:8000`,
      source: "dev-machine",
    });
  });

  it("treats an empty or blank value as not set", () => {
    expect(resolveApiUrl({ ...emulator, envUrl: "   " }).source).toBe("dev-machine");
  });

  it("uses the computer's Wi-Fi IP on a real phone", () => {
    expect(resolveApiUrl(phone).url).toBe("http://192.168.1.20:8000");
  });

  it("uses localhost on the iOS simulator and the web", () => {
    expect(resolveApiUrl({ isDev: true, platform: "ios", isDevice: false }).url).toBe("http://localhost:8000");
    expect(resolveApiUrl({ isDev: true, platform: "web", isDevice: true, webHostname: "localhost" }).url).toBe(
      "http://localhost:8000"
    );
  });

  it("falls back to the deployed server through an Expo tunnel", () => {
    expect(resolveApiUrl({ ...phone, hostUri: "abc-anonymous-8081.exp.direct" })).toEqual({
      url: DEPLOYED_API_URL,
      source: "deployed",
    });
  });

  it("uses the deployed server in a release build", () => {
    expect(resolveApiUrl({ ...emulator, isDev: false })).toEqual({ url: DEPLOYED_API_URL, source: "deployed" });
  });
});

describe("cleanApiUrl", () => {
  it("removes quotes, spaces, a byte-order mark and trailing slashes", () => {
    expect(cleanApiUrl(' "http://10.0.2.2:8000/" ')).toBe("http://10.0.2.2:8000");
    expect(cleanApiUrl("﻿http://10.0.2.2:8000//")).toBe("http://10.0.2.2:8000");
  });

  it("adds http:// when it is missing", () => {
    expect(cleanApiUrl("10.0.2.2:8000")).toBe("http://10.0.2.2:8000");
  });

  it("returns null for nothing", () => {
    expect(cleanApiUrl(undefined)).toBeNull();
    expect(cleanApiUrl("")).toBeNull();
  });
});

describe("hostFromHostUri", () => {
  it("drops the port, scheme and path", () => {
    expect(hostFromHostUri("192.168.1.20:8081")).toBe("192.168.1.20");
    expect(hostFromHostUri("exp://192.168.1.20:8081/--/home")).toBe("192.168.1.20");
    expect(hostFromHostUri("[::1]:8081")).toBe("[::1]");
  });

  it("returns null when there is no usable host", () => {
    expect(hostFromHostUri(undefined)).toBeNull();
    expect(hostFromHostUri("xyz.exp.direct")).toBeNull();
  });
});
