import { NAME_MAX_LENGTH, validateRegistration } from "@/shared/validation";
import { Link, useRouter } from 'expo-router';
import { useRef, useState } from "react";
import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SelectList } from "react-native-dropdown-select-list";
import Toast from "react-native-toast-message";
import { registerPatient } from "../api/auth";
import Heading from "../Components/Heading";
import InputField from "../Components/InputField";
import { formColumn } from "@/shared/layout";




interface UserGenderProps {
  key: string,
  value: string
  disables?: boolean,
}

const styles = StyleSheet.create({
  container: {
    ...formColumn,
    marginTop: 5,
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
    marginTop: 0,
    textAlign: "center"
  },
  textUnderline: {
    textDecorationLine: 'underline'
  },
  buttonContainer: {
    marginTop: 4,
    backgroundColor: "#d00000",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 50,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 0
  },
  buttonBusy: {
    opacity: 0.6
  },
  buttonText: {
    color: "#ffffff",
    alignSelf: "stretch",
    textAlign: "center"
  },
  // GENDER and its box, spaced like the other fields (it used to be pulled
  // up with a negative margin, and centred while the other labels are on the left).
  field: {
    width: "100%",
    gap: 8
  },
  fieldLabel: {
    color: "#6b6b6b"
  }
});

interface InputData {
  placeholder: string,
  labelName: string,
  secureText: boolean
};

interface SignUpButtonProps {
  first_name: string,
  last_name: string,
  email: string,
  password: string,
  role: string,
  date_of_birth: string,
  gender: string,
};

const showToast = (issue: string) => {
  Toast.show({
    type: 'error',
    text1: `${issue}`
  });
};

{/*----- Sign-Up Button -----*/ }
const SignUpButton: React.FC<SignUpButtonProps> = (
  { first_name, last_name, email, password, role, date_of_birth, gender }
) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const busy = useRef(false); // blocks a second tap immediately, before re-render

  const handleButtonPressed = async () => {
    if (busy.current) return; // ignore extra taps while a request is running

    // Same rules as the server: blank fields, email format, password length,
    // YYYY-MM-DD date of birth, and patients only.
    const problem = validateRegistration({
      firstName: first_name,
      lastName: last_name,
      email,
      password,
      role,
      dateOfBirth: date_of_birth,
      gender,
    });
    if (problem) {
      showToast(problem);
      return;
    }

    busy.current = true;
    setIsSubmitting(true);
    try {
      await registerPatient({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        password,
        role: "PATIENT",
        date_of_birth: date_of_birth.trim(),
        gender,
      });
      Toast.show({ type: 'success', text1: 'Account created', text2: 'You can now book an appointment.' });
      router.replace('/pages/tabs');
    } catch (err: any) {
      // Used to be console.error only, e.g. a duplicate email showed nothing.
      showToast(err?.message || 'Unable to create your account. Please try again.');
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
      <Text style={styles.buttonText}>{isSubmitting ? "Creating account..." : "Sign Up"}</Text>
    </TouchableOpacity>
  )
}

{/*---- Create New Account Page ----*/ }
export default function CreateNewAccount() {
  const [patientName, setPatientName] = useState<string>('');
  const [patientSurname, setPatientSurname] = useState<string>('');
  const [patientEmail, setPatientEmail] = useState<string>('');
  const [patientPassword, setPatientPassword] = useState<string>('');
  const [dateOfbirth, setDateOfBirth] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');

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

  // The hint used to say MM/DD/YYYY, but the server only accepts YYYY-MM-DD.
  const dateOfBirthInputDate: InputData = {
    placeholder: "Enter your date of birth (YYYY-MM-DD)",
    labelName: "DATE OF BIRTH",
    secureText: false
  }

  // Values are no longer trimmed while typing (value={x.trim()} deleted every
  // space as it was typed, so "Mary Ann" was impossible). They are trimmed on submit.
  return (
    <ScrollView testID="child-item" contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Heading text="Create New Account" variant="primary" />
      <InputField
        placeholder={nameInputData.placeholder}
        labelName={nameInputData.labelName}
        secureText={nameInputData.secureText}
        value={patientName}
        onValueChange={setPatientName}
        autoCapitalize="words"
        maxLength={NAME_MAX_LENGTH}
      />
      <InputField
        placeholder={surnameInput.placeholder}
        labelName={surnameInput.labelName}
        secureText={surnameInput.secureText}
        value={patientSurname}
        onValueChange={setPatientSurname}
        autoCapitalize="words"
        maxLength={NAME_MAX_LENGTH}
      />
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

      <InputField
        placeholder={dateOfBirthInputDate.placeholder}
        labelName={dateOfBirthInputDate.labelName}
        secureText={dateOfBirthInputDate.secureText}
        value={dateOfbirth}
        onValueChange={setDateOfBirth}
        maxLength={10}
      />

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>GENDER</Text>
        <SelectList
          setSelected={(val: string) => setSelectedGender(val)}
          data={userGenders}
          save="value"
          placeholder="Select Gender"
          maxHeight={100}
          boxStyles={{
            width: "100%",
            borderColor: "#d00000"
          }}
          inputStyles={{ flex: 1 }} // the text gets the box's width, so "Select Gender" isn't cut to "Select"
        />
      </View>

      <SignUpButton
        first_name={patientName}
        last_name={patientSurname}
        email={patientEmail}
        password={patientPassword}
        // Sign-up only creates patients (the server enforces it too); doctors are
        // added by the clinic on the admin website, so there is no role choice.
        role="PATIENT"
        date_of_birth={dateOfbirth}
        gender={selectedGender}
      />
      <Text style={styles.text}>Already Registered? <Link href="/pages/LoginPage" style={styles.textUnderline}>Log in</Link></Text>
    </ScrollView >
  )
}
