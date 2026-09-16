import { View, Text, StyleSheet, Button } from "react-native"
import InputField from "@/components/InputField"

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
  }
})

interface InputData {
  placeholder: string,
  labelName: string
}

export default function CreateNewAccount() {
  const nameInputData: InputData = {
    placeholder: "Enter your name",
    labelName: "NAME"
  }

  const emailInputData: InputData = {
    placeholder: "Enter your email",
    labelName: "EMAIL"
  }

  const passwordInputData: InputData = {
    placeholder: "Enter your password",
    labelName: "PASSWORD"
  }

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.heading}>Create New Account</Text>
      <InputField textInputData={nameInputData} />
      <InputField textInputData={emailInputData} />
      <InputField textInputData={passwordInputData} />
      <Button title="Sign In" color="#d00000" />
    </View >
  )
}

