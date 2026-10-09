import { Image, StyleSheet } from "react-native";

const styles = StyleSheet.create({
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: "cover"
  }
});

export default function Avatar({ url }: { url: string }) {
  if (!url) {
    return (
      <Image style={styles.avatar}
        source={{ uri: "https://www.svgrepo.com/show/452030/avatar-default.svg" }}
      />
    )
  }
  return (
    <Image
      style={styles.avatar}
      source={{ uri: url }}
    />
  )
}

