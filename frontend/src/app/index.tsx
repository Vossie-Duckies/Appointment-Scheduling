import { Text, View, StyleSheet } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import CreateNewAccount from "@/pages/CreateNewAccount";

export default function Index() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flexDirection: "column", height: "100%" }}>
        <CreateNewAccount />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}


