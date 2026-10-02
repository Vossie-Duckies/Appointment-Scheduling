import { Text, StyleSheet } from "react-native";

type headingVariant = "primary" | "secondary";

interface HeadingProps {
  text: string,
  variant: headingVariant
};

const styles = StyleSheet.create({
  primary: {
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
  secondary: {
    fontSize: 24,
    fontWeight: 'bold',
    width: 200,
    textAlign: "center",
    color: '#000000',
    marginTop: 20,
    paddingBottom: 25,
    borderBottomColor: "#cecece",
    borderBottomWidth: 1
  }
});

const Heading: React.FC<HeadingProps> = ({ text, variant }) => {
  {/* 
    The Primary variant for the heading is used for Create New Account Page, while the secondary variant
    is by every other heading.
  */}
  if (variant === "primary") {
    return <Text accessibilityRole="header" style={styles.primary}>{text}</Text>
  }
  else if (variant === "secondary") {
    return <Text accessibilityRole="header" style={styles.secondary}>{text}</Text>
  }
  else {
    return <Text>{text}</Text>
  }
};

export default Heading

