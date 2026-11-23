import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getDoctorPhotos } from "@/app/api/auth";

// Doctors' profile photos for the doctor cards on the New, Upcoming and Past
// tabs. Photos are kept for a few minutes, so switching between tabs doesn't
// download them again; after that they're fetched afresh when a tab opens, so a
// doctor's new photo shows up.

const KEEP_FOR_MS = 5 * 60 * 1000;
const kept = new Map<number, { photo: string | null; fetchedAt: number }>();

// Returns { [doctorId]: "data:image/jpeg;base64,..." } for the doctors who have
// a photo. Doctors without one are missing, and their cards show initials.
export function useDoctorPhotos(doctorIds: number[]): Record<number, string> {
  const key = [...new Set(doctorIds)].sort((a, b) => a - b).join(",");
  const [, setFetches] = useState(0); // re-renders once new photos arrive

  useFocusEffect(useCallback(() => {
    const ids = key ? key.split(",").map(Number) : [];
    const now = Date.now();
    const needed = ids.filter((id) => now - (kept.get(id)?.fetchedAt ?? 0) > KEEP_FOR_MS);
    if (needed.length === 0) return;

    let onScreen = true;
    getDoctorPhotos(needed)
      .then((photos) => {
        const fetchedAt = Date.now();
        for (const id of needed) kept.set(id, { photo: photos[String(id)] ?? null, fetchedAt });
        if (onScreen) setFetches((n) => n + 1);
      })
      .catch((err: any) => {
        // Not worth an error message: the cards show initials instead.
        if (__DEV__) console.log(`[photos] Couldn't load doctors' photos: ${err?.message}`);
      });
    return () => {
      onScreen = false;
    };
  }, [key]));

  const photos: Record<number, string> = {};
  for (const id of doctorIds) {
    const photo = kept.get(id)?.photo;
    if (photo) photos[id] = photo;
  }
  return photos;
}
