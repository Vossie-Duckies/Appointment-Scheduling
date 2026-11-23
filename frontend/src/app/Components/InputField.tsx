import { useState } from "react";
import { View, TextInput, Text, StyleSheet, KeyboardTypeOptions, Pressable } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";

interface TextInputProps {
  placeholder: string,
  labelName: string,
  secureText: boolean,
  value: string,
  onValueChange: (text: string) => void,
  keyboardType?: KeyboardTypeOptions,
  autoCapitalize?: "none" | "sentences" | "words" | "characters",
  maxLength?: number,
}

const styles = StyleSheet.create({
 container: {
    width: "100%",
    gap: 8
  },
  text: {
    color: "#6b6b6b",
  },
  textInput: {
    backgroundColor: "#ececec",
    width: "100%",
    minHeight: 50,
    paddingHorizontal: 12,
    textAlign: "center",
    borderRadius: 10,
    fontSize: 14
  },

   roomForEye: {
    paddingHorizontal: 44
  },
  eyeButton: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 44,
    alignItems: "center",
    justifyContent: "center"
  },

  placeholderBox: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none" 
  },
  placeholderText: {
    alignSelf: "stretch",
    textAlign: "center",
    color: "#737373",
    fontSize: 14
  }
});



const InputField: React.FC<TextInputProps> = ({
  placeholder, labelName, secureText, value, onValueChange, keyboardType, autoCapitalize, maxLength
}) => {

  const [isFocused, setIsFocused] = useState(false);
   const showHint = value === "" && !isFocused;
    const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{labelName}</Text>
      <View>
        <TextInput
          style={[styles.textInput, secureText && styles.roomForEye]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureText && !showPassword}
          value={value}
          onChangeText={onValueChange}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          accessibilityLabel={labelName}
          accessibilityHint={placeholder} />
        {showHint ? (
          <View style={[styles.placeholderBox, secureText && styles.roomForEye]}>
            <Text style={styles.placeholderText} numberOfLines={1}>{placeholder}</Text>
          </View>
        ) : null}
        {secureText ? (
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowPassword(shown => !shown)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#6b6b6b" />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
};
export default InputField
