import { RED } from "@/shared/Chip";
import { Image, StyleSheet, Text, View } from "react-native";

const styles = StyleSheet.create({
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: "cover"
  }, 
  initialsCircle: {
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center"
  },
  initials: {
    color: RED,
    fontWeight: "bold",
    fontSize: 18
  }
});

export function initialsOf(name: string = ""): string {
  const words = name.replace(/^dr\.?\s+/i, "").trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] || "?").slice(0, 1);
  return letters.toUpperCase();
}

export default function Avatar({ url, name }: { url: string | null; name?: string}) {
  if (url) {
    return <Image style={styles.avatar} source={{ uri: url }} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[styles.avatar, styles.initialsCircle]}>
      <Text style={styles.initials}>{initialsOf(name)}</Text>
      </View>
  );
}

