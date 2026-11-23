import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import CreateNewAccount from "./pages/CreateNewAccount";

// <Toast /> moved to _layout.tsx so it shows on every screen.
export default function Index() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flexDirection: "column", height: "100%" }}>
        <CreateNewAccount />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
