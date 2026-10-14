import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Link, useRouter } from 'expo-router';
import { useState } from "react";
import InputField from "../Components/InputField";
import Heading from "../Components/Heading";
import Toast from "react-native-toast-message";

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

interface SignInButtonProps {
  patientName: string,
  patientSurname: string,
  patientPassword: string
};

{/*----- Sign-In Button -----*/ }
const SignInButton: React.FC<SignInButtonProps> = ({ patientName, patientEmail, patientPassword }) => {
  const router = useRouter();
  const showToast = (issue: string) => {
    Toast.show({
      type: 'error',
      text1: `${issue}`
    });
  }
  const handleButtonPressed = () => {

    if (!patientName || !patientEmail || !patientPassword) {
      const issue: string = 'Unable to log in. Please check your details and try and again';
      showToast(issue);
      return;
    }

    router.navigate('/pages/tabs');
  };

  return (
    <TouchableOpacity style={styles.buttonContainer} onPress={handleButtonPressed}>
      <Text style={styles.buttonText}>Sign In</Text>
    </TouchableOpacity>
  )
}

{/*---- Create New Account Page ----*/ }
export default function CreateNewAccount() {
  const [patientName, setPatientName] = useState<string>('');
  const [patientEmail, setPatientEmail] = useState<string>('');
  const [patientPassword, setPatientPassword] = useState<string>('');

  const nameInputData: InputData = {
    placeholder: "Enter your name",
    labelName: "NAME",
    secureText: false
  };

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
      <Heading text="Create New Account" variant="primary" />
      <InputField
        placeholder={nameInputData.placeholder}
        labelName={nameInputData.labelName}
        secureText={nameInputData.secureText}
        value={patientName.trim()}
        onValueChange={setPatientName}
      />
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
      <SignInButton patientName={patientName} patientEmail={patientEmail} patientPassword={patientPassword} />
      <Text style={styles.text}>Already Registered? <Link href="/" style={styles.textUnderline}>Log in</Link></Text>
    </View >
  )
}

