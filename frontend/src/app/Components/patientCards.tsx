import { styles } from '../Styles/global';
import { Image, Pressable, Text, View } from 'react-native';
type PatientProps = {
  name: string;
  surname: string
  date: string;
  picUrl?: string;
  selection?: boolean;
  onPress?: () => void;
};

export function PatientCard({ name, surname, date, picUrl, selection = false, onPress, }: PatientProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selection && styles.cardSelected]}
    >
      <Image
        source={{
          uri: picUrl ?? 'https://i.pravatar.cc/100' // this is just a way i found to have picture just to test
        }}
        style={styles.avatar}
      />

      <View style={styles.textBlock}>

        <Text style={styles.name} > {name} {surname}</Text>
        <Text style={styles.date} > {date}</Text>


      </View>

    </Pressable>

  );

}
