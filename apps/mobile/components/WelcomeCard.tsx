import { StyleSheet, Text, View } from "react-native";

export function WelcomeCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your deliveries, on the go.</Text>
      <Text style={styles.description}>The EzyGo customer and driver app is taking shape. Booking and delivery tools are coming next.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: "white", borderRadius: 20, padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "600", color: "#173d38" },
  description: { fontSize: 16, lineHeight: 24, color: "#435b55" },
});
