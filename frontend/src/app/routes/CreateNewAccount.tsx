import { View, Text, StyleSheet, Button, TouchableOpacity } from "react-native";
import { Link, useRouter } from 'expo-router';
import InputField from "../components/InputField";
import Heading from "../components/Heading";

const styles = StyleSheet.create({
  container: {
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
})

interface InputData {
  placeholder: string,
  labelName: string,
  secureText: boolean
}

const SignInButton = () => {
  const router = useRouter();
  const ButtonClicked = () => {
    router.navigate('routes/UpcomingAppointments');
  };

  return (
    <TouchableOpacity style={styles.buttonContainer} onPress={ButtonClicked}>
      <Text style={styles.buttonText}>Sign In</Text>
    </TouchableOpacity>
  )
}

export default function CreateNewAccount() {
  const nameInputData: InputData = {
    placeholder: "Enter your name",
    labelName: "NAME",
    secureText: false
  }

  const emailInputData: InputData = {
    placeholder: "Enter your email",
    labelName: "EMAIL",
    secureText: false
  }

  const passwordInputData: InputData = {
    placeholder: "Enter your password",
    labelName: "PASSWORD",
    secureText: true
  }

  return (
    <View testID="child-item" style={styles.container}>
      <Heading text="Create New Account" variant="primary" />
      <InputField
        placeholder={nameInputData.placeholder}
        labelName={nameInputData.labelName}
        secureText={nameInputData.secureText}
      />
      <InputField
        placeholder={emailInputData.placeholder}
        labelName={emailInputData.labelName}
        secureText={emailInputData.secureText}
      />
      <InputField
        placeholder={passwordInputData.placeholder}
        labelName={passwordInputData.labelName}
        secureText={passwordInputData.secureText}
      />
      <SignInButton />
      <Text style={styles.text}>Already Registered? <Link href="/" style={styles.textUnderline}>Log in</Link></Text>
    </View >
  )
}

