import { Image, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../lib/theme";

/** The same business mark and wordmark used by the web app. Bundled for offline use. */
export function BrandLogo({ compact = false, light = false, large = false }: { compact?: boolean; light?: boolean; large?: boolean }) {
  return <View accessible accessibilityRole="image" accessibilityLabel="EzyGo Couriers" style={s.brand}>
    <Image source={light ? require("../assets/business-logo-light.png") : require("../assets/business-logo.png")} resizeMode="contain" style={[s.mark, compact && s.compactMark, large && s.largeMark]} />
    <Text style={[s.name, compact && s.compactName, light && s.lightName, large && s.largeName]}>EzyGo</Text>
  </View>;
}

const s = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  mark: { width: 86, height: 31 }, compactMark: { width: 68, height: 24 },
  name: { fontFamily: fonts.bold, fontSize: 23, color: colors.ink, letterSpacing: -.7 },
  largeMark: { width: 120, height: 43 }, largeName: { fontSize: 30 },
  lightName: { color: colors.surface },
  compactName: { fontSize: 20 },
});
