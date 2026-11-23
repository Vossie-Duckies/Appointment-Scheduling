import Ionicons from "@react-native-vector-icons/ionicons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import Heading from "@/app/Components/Heading";
import { deleteProfilePhoto, getProfile, goToLogin, logout, uploadProfilePhoto } from "@/app/api/auth";
import type { PhotoAsset, Profile } from "@/app/types/auth";
import { RED } from "./Chip";
import LoadError from "./LoadError";
import { confirmAction, showNotice } from "./confirm";
import { formatFullDate } from "./schedule";

// The Profile tab, for patients and doctors: their details from sign-up (or
// from the clinic, for doctors) and an optional photo they can add, change or
// remove. The details can't be edited here; the clinic's admin site can.

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: "images",
  allowsEditing: true, // lets people crop to a square before it is sent
  aspect: [1, 1],
  quality: 0.8,
};

const AVATAR_SIZE = 120;

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: "center", paddingTop: 50, paddingHorizontal: 20, paddingBottom: 40, backgroundColor: "#fff" },
  avatarArea: { marginTop: 24, marginBottom: 8 },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  placeholder: { backgroundColor: "#ececec", alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 40, fontWeight: "bold", color: RED },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: RED,
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  faded: { opacity: 0.5 },
  photoActions: { flexDirection: "row", gap: 20, marginBottom: 4 },
  photoLink: { color: RED, fontWeight: "600", paddingVertical: 6 },
  roleText: { color: "#6b6b6b", marginBottom: 16 },
  field: { width: "100%", maxWidth: 320, gap: 8, marginBottom: 14 },
  label: { color: "#6b6b6b", letterSpacing: 0.5 },
  valueBox: {
    backgroundColor: "#ececec",
    minHeight: 50,
    borderRadius: 10,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  value: { fontSize: 14, textAlign: "center", color: "#222" },
  note: { color: "#6b6b6b", fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 20 },
  logoutButton: { paddingVertical: 10, paddingHorizontal: 24 },
  logoutText: { color: "#d00000", fontWeight: "bold", textDecorationLine: "underline" },
  loading: { color: "#6b6b6b", marginTop: 30 },
});

// Sign-up stores "Prefer Not Say"; show it as people would say it.
function genderLabel(gender: string | null | undefined): string {
  if (!gender) return "Not given";
  return gender.toLowerCase() === "prefer not say" ? "Prefer not to say" : gender;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const busy = useRef(false); // blocks a second tap immediately, before re-render

  const load = useCallback(async () => {
    try {
      setProfile(await getProfile());
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || "Couldn't load your profile.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  async function savePhoto(asset: PhotoAsset) {
    if (busy.current) return;
    busy.current = true;
    setIsSavingPhoto(true);
    try {
      setProfile(await uploadProfilePhoto(asset));
      Toast.show({ type: "success", text1: "Photo saved" });
    } catch (err: any) {
      Toast.show({ type: "error", text1: "Couldn't save your photo", text2: err?.message || "Please try again." });
    } finally {
      busy.current = false;
      setIsSavingPhoto(false);
    }
  }

  async function pickPhoto(source: "camera" | "library") {
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showNotice(
            "Camera access is off",
            "To take a photo, allow camera access for this app in your phone's settings, or choose a photo from your library instead.",
          );
          return;
        }
      }
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      if (result.canceled || !result.assets?.length) return;
      const { uri, mimeType, fileName } = result.assets[0];
      await savePhoto({ uri, mimeType, fileName });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: source === "camera" ? "Couldn't open the camera" : "Couldn't open your photos",
        text2: err?.message,
      });
    }
  }

  function choosePhoto() {
    if (busy.current) return;
    // In a browser the file picker must open straight from the tap, and there is no camera option.
    if (Platform.OS === "web") {
      pickPhoto("library");
      return;
    }
    // Android shows at most three buttons; Cancel first so it sits on the left there.
    Alert.alert(profile?.photo ? "Change your photo" : "Add a photo", "A profile photo is optional.", [
      { text: "Cancel", style: "cancel" },
      { text: "Take photo", onPress: () => pickPhoto("camera") },
      { text: "Choose from library", onPress: () => pickPhoto("library") },
    ]);
  }

  function askToRemovePhoto() {
    confirmAction(
      "Remove your photo?",
      "Your profile will show your initials instead. You can add a photo again at any time.",
      "Remove",
      async () => {
        if (busy.current) return;
        busy.current = true;
        setIsSavingPhoto(true);
        try {
          setProfile(await deleteProfilePhoto());
          Toast.show({ type: "success", text1: "Photo removed" });
        } catch (err: any) {
          Toast.show({ type: "error", text1: "Couldn't remove your photo", text2: err?.message || "Please try again." });
        } finally {
          busy.current = false;
          setIsSavingPhoto(false);
        }
      },
      { destructive: true },
    );
  }

  async function handleLogout() {
    await logout();
    Toast.show({ type: "success", text1: "You have been logged out" });
    goToLogin();
  }

  if (isLoading || loadError || !profile) {
    return (
      <View style={styles.container}>
        <Heading text="My Profile" variant="secondary" />
        {loadError ? (
          <LoadError message={loadError} onRetry={() => { setIsLoading(true); load(); }} />
        ) : (
          <Text style={styles.loading}>Loading your profile...</Text>
        )}
      </View>
    );
  }

  const initials = `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase() || "?";
  const fields: [string, string][] = [
    ["NAME", profile.first_name],
    ["SURNAME", profile.last_name],
    ["EMAIL", profile.email],
    ...(profile.role === "DOCTOR"
      ? ([["LICENCE NUMBER", profile.license_no || "Not given"]] as [string, string][])
      : ([
          ["GENDER", genderLabel(profile.gender)],
          ["DATE OF BIRTH", profile.date_of_birth ? formatFullDate(profile.date_of_birth) : "Not given"],
        ] as [string, string][])),
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Heading text="My Profile" variant="secondary" />

      <Pressable
        style={[styles.avatarArea, isSavingPhoto && styles.faded]}
        onPress={choosePhoto}
        disabled={isSavingPhoto}
        accessibilityRole="button"
        accessibilityLabel={profile.photo ? "Change your profile photo" : "Add a profile photo"}
      >
        {profile.photo ? (
          <Image source={{ uri: profile.photo }} style={styles.avatar} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.avatar, styles.placeholder]}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        )}
        <View style={styles.cameraBadge}>
          <Ionicons name="camera" size={16} color="#fff" />
        </View>
      </Pressable>

      <View style={styles.photoActions}>
        <Pressable onPress={choosePhoto} disabled={isSavingPhoto} accessibilityRole="button">
          <Text style={styles.photoLink}>
            {isSavingPhoto ? "Saving..." : profile.photo ? "Change photo" : "Add a photo (optional)"}
          </Text>
        </Pressable>
        {profile.photo && !isSavingPhoto ? (
          <Pressable onPress={askToRemovePhoto} accessibilityRole="button" accessibilityLabel="Remove your profile photo">
            <Text style={styles.photoLink}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.roleText}>{profile.role === "DOCTOR" ? "Doctor account" : "Patient account"}</Text>

      {fields.map(([label, value]) => (
        <View key={label} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.valueBox}>
            <Text style={styles.value} numberOfLines={2}>{value}</Text>
          </View>
        </View>
      ))}

      <Text style={styles.note}>To change these details, please contact the clinic.</Text>

      <Pressable style={styles.logoutButton} onPress={handleLogout} accessibilityRole="button">
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}
