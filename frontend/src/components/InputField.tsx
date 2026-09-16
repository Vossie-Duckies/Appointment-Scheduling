import { View, TextInput, Text, StyleSheet } from "react-native";

interface textInputProps {
  placeholder: string,
  labelName: string
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
    width: 220,
    height: 50,
    textAlign: "center",
    borderRadius: 10,
    fontSize: 12
  }
});

const InputField: React.FC<textInputProps> = ({ textInputData }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{textInputData.labelName}</Text>
      <TextInput style={styles.textInput} placeholder={textInputData.placeholder} />
    </View>
  )
}

export default InputField
