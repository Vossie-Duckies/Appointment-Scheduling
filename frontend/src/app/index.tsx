import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message"
import CreateNewAccount from "./pages/CreateNewAccount";

export default function Index() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flexDirection: "column", height: "100%" }}>
        <CreateNewAccount />
        <Toast />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}


