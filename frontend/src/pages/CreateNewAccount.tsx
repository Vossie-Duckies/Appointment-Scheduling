import { View, Text, StyleSheet, Button, TouchableOpacity } from "react-native";
import { Link } from 'expo-router';
import InputField from "@/components/InputField";

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 25
  },
  heading: {
    fontSize: 30,
    fontWeight: 'bold',
    width: 200,
    textAlign: "center",
    color: '#d00000',
    marginTop: 20,
    paddingBottom: 25,
    borderBottomColor: "#cecece",
    borderBottomWidth: 1
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
  return (
    <TouchableOpacity style={styles.buttonContainer}>
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
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.heading}>Create New Account</Text>
      <InputField textInputData={nameInputData} />
      <InputField textInputData={emailInputData} />
      <InputField textInputData={passwordInputData} />
      <SignInButton />
      <Text style={styles.text}>Already Registered? <Link href="/" style={styles.textUnderline}>Log in</Link></Text>
    </View >
  )
}

