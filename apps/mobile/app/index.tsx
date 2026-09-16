import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WelcomeCard } from "../components/WelcomeCard";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.brand}>EzyGo Couriers</Text>
      <WelcomeCard />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f1f5f3" },
  brand: { fontSize: 32, fontWeight: "700", color: "#173d38", marginBottom: 24 },
});
