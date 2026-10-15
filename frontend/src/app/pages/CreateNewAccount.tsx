import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from "react-native";
import { Link, useRouter } from 'expo-router';
import { useState } from "react";
import InputField from "../Components/InputField";
import Heading from "../Components/Heading";
import Toast from "react-native-toast-message";
import { SelectList } from "react-native-dropdown-select-list";
import { registerPatient } from "../api/auth";


interface UserRoleProps {
  key: string,
  value: string,
  disables?: boolean,
};

interface UserGenderProps {
  key: string,
  value: string
  disables?: boolean,
}

const styles = StyleSheet.create({
  container: {
    marginTop: 5,
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
    marginTop: 0
  },
  textUnderline: {
    textDecorationLine: 'underline'
  },
  buttonContainer: {
    marginTop: 4,
    backgroundColor: "#d00000",
    alignItems: "center",
    paddingTop: 13,
    width: 270,
    height: 50,
    borderRadius: 10,
    marginBottom: 0
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
  first_name: string,
  last_name: string,
  email: string,
  password: string,
  role: string,
  date_of_birth: string,
  gender: string,
};

{/*----- Sign-In Button -----*/ }
const SignInButton: React.FC<SignInButtonProps> = (
  { first_name, last_name, email, password, role, date_of_birth, gender }
) => {
  const router = useRouter();
  const showToast = (issue: string) => {
    Toast.show({
      type: 'error',
      text1: `${issue}`
    });
  }
  const handleButtonPressed = async () => {

    if (!first_name || !last_name || !email || !password || !role || !date_of_birth || !gender) {
      const issue: string = 'Unable to log in. Please check your details and try and again';
      showToast(issue);
      return;
    }

    try {
      const data = await registerPatient({ first_name, last_name, email, password, role, date_of_birth, gender });
      console.log(data);
      setTimeout(() => {
        router.navigate('/pages/tabs');
      }, 2000)

    } catch (err: any) {
      console.error(err);

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
  const [patientSurname, setPatientSurname] = useState<string>('');
  const [patientEmail, setPatientEmail] = useState<string>('');
  const [patientPassword, setPatientPassword] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [dateOfbirth, setDateOfBirth] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');

  const userRoles: Array<UserRoleProps> = [
    { key: '1', value: 'Patient' },
    { key: '2', value: 'Doctor' },
  ];

  const userGenders: Array<UserGenderProps> = [
    { key: '1', value: "Male" },
    { key: '2', value: "Female" },
    { key: '3', value: "Prefer Not Say" },
  ];

  const nameInputData: InputData = {
    placeholder: "Enter your name",
    labelName: "NAME",
    secureText: false
  };

  const surnameInput: InputData = {
    placeholder: "Enter your last name",
    labelName: "SURNAME",
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

  const dateOfBirthInputDate: InputData = {
    placeholder: "Enter your date of birth (MM/DD/YYYY)",
    labelName: "DATE OF BIRTH",
    secureText: false
  }

  return (
    <ScrollView testID="child-item" contentContainerStyle={styles.container}>
      <Heading text="Create New Account" variant="primary" />
      <InputField
        placeholder={nameInputData.placeholder}
        labelName={nameInputData.labelName}
        secureText={nameInputData.secureText}
        value={patientName.trim()}
        onValueChange={setPatientName}
      />
      <InputField
        placeholder={surnameInput.placeholder}
        labelName={surnameInput.labelName}
        secureText={surnameInput.secureText}
        value={patientSurname.trim()}
        onValueChange={setPatientSurname}
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

      <SelectList
        setSelected={(val: string) => setSelectedRole(val)}
        data={userRoles}
        save="value"
        placeholder="Select a Role"
        maxHeight={100}
        boxStyles={{
          width: 270,
          borderColor: "#d00000"
        }}
      />

      <InputField
        placeholder={dateOfBirthInputDate.placeholder}
        labelName={dateOfBirthInputDate.labelName}
        secureText={dateOfBirthInputDate.secureText}
        value={dateOfbirth.trim()}
        onValueChange={setDateOfBirth}
      />

      <SelectList
        setSelected={(val: string) => setSelectedGender(val)}
        data={userGenders}
        save="value"
        placeholder="Select Gender"
        maxHeight={100}
        boxStyles={{
          width: 270,
          borderColor: "#d00000"
        }}
      />

      <SignInButton
        first_name={patientName}
        last_name={patientSurname}
        email={patientEmail}
        password={patientPassword}
        role={selectedRole}
        date_of_birth={dateOfbirth}
        gender={selectedGender}
      />
      <Text style={styles.text}>Already Registered? <Link href="/pages/LoginPage" style={styles.textUnderline}>Log in</Link></Text>
    </ScrollView >
  )
}

