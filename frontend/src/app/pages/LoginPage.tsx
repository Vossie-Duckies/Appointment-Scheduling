import { Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Link, useRouter } from 'expo-router';
import { useRef, useState } from "react";
import InputField from "../Components/InputField";
import Heading from "../Components/Heading";
import Toast from "react-native-toast-message";
import { BASE_API_URL, NETWORK_ERROR_MESSAGE, loginPatient, logout } from "../api/auth";
import { validateLogin } from "@/shared/validation";
import { formColumn } from "@/shared/layout";

const styles = StyleSheet.create({
  container: {
    ...formColumn,
    marginTop: 30,
    gap: 25,
    paddingBottom: 30
  },
  line: {
    flex: 3,
    borderTopColor: '#cecece',
    borderTopWidth: 1,
    width: '60%',
  },
  text: {
    color: "#6b6b6b",
    textAlign: "center"
  },
  textUnderline: {
    textDecorationLine: 'underline'
  },
  buttonContainer: {
    marginTop: 30,
    backgroundColor: "#d00000",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 50,
    paddingVertical: 12,
    borderRadius: 10
  },
  buttonBusy: {
    opacity: 0.6
  },
  buttonText: {
    color: "#ffffff",
    alignSelf: "stretch",
    textAlign: "center"
  }
});

interface InputData {
  placeholder: string,
  labelName: string,
  secureText: boolean
};

interface LoginButtonProps {
  email: string,
  password: string
};

const showToast = (issue: string) => {
  Toast.show({
    type: 'error',
    text1: `${issue}`
  });
};

{/*----- Login-In Button -----*/ }
const LoginInButton: React.FC<LoginButtonProps> = ({ email, password }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // A ref changes immediately, so a second tap in the same instant is ignored
  // even before the button re-renders as disabled.
  const busy = useRef(false);

  const handleButtonPressed = async () => {
    if (busy.current) return; // ignore extra taps while a request is running

    const problem = validateLogin(email, password);
    if (problem) {
      showToast(problem);
      return;
    }

    busy.current = true;
    setIsSubmitting(true);
    try {
      const data = await loginPatient({ email: email.trim(), password });
      const userRole: string = data.role;

      if (userRole === "PATIENT") {
        Toast.show({ type: 'success', text1: 'Welcome back' });
        router.replace('/pages/tabs');
      } else if (userRole === "DOCTOR") {
        // Was '/pages/doctorScreen/edit', a route that does not exist
        // ("Unmatched Route" screen), so doctors could never reach their tabs.
        Toast.show({ type: 'success', text1: 'Welcome back' });
        router.replace('/pages/doctorScreen/editAppointment');
      } else if (userRole === "ADMIN") {
        await logout();
        showToast('Admin accounts are managed on the admin website, not in the app.');
      } else {
        await logout();
        showToast('This account cannot use the app. Please contact the clinic.');
      }
    } catch (err: any) {
      if (__DEV__ && err?.message === NETWORK_ERROR_MESSAGE) {
        // Development only: name the address that failed, so a wrong or
        // unloaded .env is obvious at a glance. Release builds are unchanged.
        Toast.show({ type: 'error', text1: NETWORK_ERROR_MESSAGE, text2: `Server: ${BASE_API_URL}` });
        return;
      }
      // Used to be console.error only, so a wrong password looked like nothing happened.
      showToast(err?.message || 'Unable to log in. Please try again.');
    } finally {
      busy.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.buttonContainer, isSubmitting && styles.buttonBusy]}
      onPress={handleButtonPressed}
      disabled={isSubmitting}
      accessibilityRole="button"
    >
      <Text style={styles.buttonText}>{isSubmitting ? "Logging in..." : "Log In"}</Text>
    </TouchableOpacity>
  )
}

{/*---- Log In Page ----*/ }
export default function LoginPage() {
  const [patientEmail, setPatientEmail] = useState<string>('');
  const [patientPassword, setPatientPassword] = useState<string>('');

  const emailInputData: InputData = {
    placeholder: "Enter your email",
    labelName: "EMAIL",
    secureText: false
  };

  const passwordInputData: InputData = {
    placeholder: "Enter your password",
    labelName: "PASSWORD",
    secureText: true
  };

  return (
    <ScrollView testID="child-item" contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Heading text="Log Into Account" variant="primary" />
      <InputField
        placeholder={emailInputData.placeholder}
        labelName={emailInputData.labelName}
        secureText={emailInputData.secureText}
        value={patientEmail}
        onValueChange={setPatientEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        maxLength={100}
      />
      <InputField
        placeholder={passwordInputData.placeholder}
        labelName={passwordInputData.labelName}
        secureText={passwordInputData.secureText}
        value={patientPassword}
        onValueChange={setPatientPassword}
        autoCapitalize="none"
      />
      <LoginInButton email={patientEmail} password={patientPassword} />
      <Text style={styles.text}>
        Don't Have An Account?{" "}
        <Link href="/pages/CreateNewAccount" style={styles.textUnderline}>
          Sign Up
        </Link>
      </Text>
    </ScrollView>
  )
}

