import { View, TextInput, Text, StyleSheet } from "react-native";

interface textInputProps {
  placeholder: string,
  labelName: string,
  secureText: boolean
}

const styles = StyleSheet.create({
  container: {
    gap: 8
  },
  text: {
    color: "#8f8e8e",
  },
  textInput: {
    backgroundColor: "#ececec",
    width: 270,
    height: 50,
    textAlign: "center",
    borderRadius: 10,
    fontSize: 12
  }
});

const InputField: React.FC<textInputProps> = ({ placeholder, labelName, secureText }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{labelName}</Text>
      <TextInput style={styles.textInput} placeholder={placeholder} secureTextEntry={secureText} />
    </View>
  )
};

export default InputField

