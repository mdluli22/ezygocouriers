import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts } from "../../lib/theme";
const labels = ["Details", "Password", "Verify email"];
export function SignupProgress({ step }: { step: 1 | 2 | 3 }) {
  return <View style={s.container}>
    <View accessibilityRole="progressbar" accessibilityLabel="Account setup" accessibilityValue={{ min: 1, max: 3, now: step, text: `Step ${step} of 3: ${labels[step - 1]}` }} style={s.track}><View style={[s.fill, { width: `${step / 3 * 100}%` }]} /></View>
    <View style={s.row}>{labels.map((label, i) => <View key={label} style={s.step}>{i + 1 < step ? <Ionicons name="checkmark-circle" size={17} color={colors.primary} /> : <Text style={[s.number, i + 1 === step && s.current]}>{i + 1}</Text>}<Text style={[s.label, i + 1 === step && s.selected]}>{label}</Text></View>)}</View>
  </View>;
}
const s = StyleSheet.create({
  container: { gap: 14, marginBottom: 6 }, track: { height: 5, backgroundColor: colors.soft, borderRadius: 3, overflow: "hidden" }, fill: { height: "100%", backgroundColor: colors.primary },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }, step: { flexDirection: "row", gap: 5, alignItems: "center" },
  number: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted }, current: { color: colors.primary }, label: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted }, selected: { fontFamily: fonts.bold, color: colors.primary },
});
