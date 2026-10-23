import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Link, useRouter } from 'expo-router';
import { useState } from "react";
import InputField from "../Components/InputField";
import Heading from "../Components/Heading";
import Toast from "react-native-toast-message";
import { loginPatient } from "../api/auth";
import * as SecureStore from "expo-secure-store";

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 25
  },
  line: {
    flex: 3,
    borderTopColor: '#cecece',
    borderTopWidth: 1,
    width: '60%',
  },
  text: {
    color: "#8f8e8e",
  },
  textUnderline: {
    textDecorationLine: 'underline'
  },
  buttonContainer: {
    marginTop: 30,
    backgroundColor: "#d00000",
    alignItems: "center",
    paddingTop: 13,
    width: 270,
    height: 50,
    borderRadius: 10
  },
  buttonText: {
    color: "#ffffff"
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

{/*----- Login-In Button -----*/ }
const LoginInButton: React.FC<LoginButtonProps> = ({ email, password }) => {
  const router = useRouter();
  const showToast = (issue: string) => {
    Toast.show({
      type: 'error',
      text1: `${issue}`
    });
  }
  const handleButtonPressed = async () => {

    if (!email || !password) {
      const issue: string = 'Unable to log in. Please check your details and try and again';
      showToast(issue);
      return;
    }

    if (email && password) {
      try {
        const data = await loginPatient({ email, password });
        const userRole: string = data['role'];
        console.log(userRole);
        console.log(data);

        setTimeout(() => {
          if (userRole === "PATIENT") {
            router.replace('/pages/tabs');
          } else if (userRole === "DOCTOR" || userRole === "ADMIN") {
            router.replace('/pages/doctorScreen/edit');
          } else {
            console.log("User Role Is undefinded");
          }
        }, 2000)

      } catch (err: any) {
        console.error(err);
      }
    }

  };

  return (
    <TouchableOpacity style={styles.buttonContainer} onPress={handleButtonPressed}>
      <Text style={styles.buttonText}>Log In</Text>
    </TouchableOpacity>
  )
}

{/*---- Create New Account Page ----*/ }
export default function CreateNewAccount() {
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
    <View testID="child-item" style={styles.container}>
      <Heading text="Log Into Account" variant="primary" />
      <InputField
        placeholder={emailInputData.placeholder}
        labelName={emailInputData.labelName}
        secureText={emailInputData.secureText}
        value={patientEmail.trim()}
        onValueChange={setPatientEmail}
      />
      <InputField
        placeholder={passwordInputData.placeholder}
        labelName={passwordInputData.labelName}
        secureText={passwordInputData.secureText}
        value={patientPassword.trim()}
        onValueChange={setPatientPassword}
      />
      <LoginInButton email={patientEmail} password={patientPassword} />
      <Text style={styles.text}>
        Don't Have An Account?
        <Link href="/pages/CreateNewAccount" style={styles.textUnderline}>
          Sign Up
        </Link>
      </Text>
    </View >
  )
}

