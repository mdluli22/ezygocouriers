import { BrandLogo } from "./BrandLogo";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../lib/theme";

export function WelcomeScreen() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return <View style={s.screen}>
    <ScrollView bounces={false} contentContainerStyle={s.content}>
      <View style={[s.top, { height: Math.max(260, Math.min(height * .42, 420)) }]}>
        <Image source={require("../assets/welcome-courier-photo.png")} resizeMode="cover" style={s.photo} accessibilityLabel="Courier with a delivery scooter" />
      </View>
      <View style={[s.panel, { paddingBottom: Math.max(insets.bottom + 24, 40), paddingLeft: Math.max(insets.left + 24, 24), paddingRight: Math.max(insets.right + 24, 24) }]}>
        <View style={s.logoBadge}><BrandLogo large light /></View>
        <View style={s.panelContent}>
          <Text accessibilityRole="header" style={s.title}>From your door{"\n"}to theirs. <Text style={s.titleAccent}>Fast.</Text></Text>
          <View style={s.benefits}>
            <View style={s.benefit}><Feather name="package" size={18} color={colors.heroLabel} /><Text style={s.benefitText}>Easy booking</Text></View>
            <View style={s.benefit}><Feather name="navigation" size={18} color={colors.heroLabel} /><Text style={s.benefitText}>Live tracking</Text></View>
          </View>
          <View style={s.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Get started, create an account" onPress={() => router.push("/auth/register")} style={({ pressed }) => [s.primaryButton, pressed && s.pressed]}>
              <Text style={s.primaryButtonText}>Get started</Text><Feather name="arrow-right" size={22} color={colors.ink} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Log in to your account" onPress={() => router.push("/auth/sign-in")} style={({ pressed }) => [s.loginButton, pressed && s.pressed]}>
              <Text style={s.loginText}>Log in</Text><Feather name="arrow-up-right" size={20} color={colors.surface} />
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { flexGrow: 1 }, top: { backgroundColor: colors.soft, overflow: "hidden" },
  logoBadge: { alignSelf: "flex-start", marginBottom: 28 },
  photo: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  panel: { flexGrow: 1, justifyContent: "center", backgroundColor: colors.ink, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -18, paddingTop: 28 },
  panelContent: { marginTop: 4, width: "100%", maxWidth: 520, alignSelf: "center", gap: 20 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  accentLine: { width: 24, height: 3, borderRadius: 2, backgroundColor: colors.accent },
  eyebrow: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 13, letterSpacing: .2, color: colors.heroText },
  title: { fontFamily: fonts.semibold, fontSize: 38, lineHeight: 44, letterSpacing: -1.2, color: colors.surface },
  titleAccent: { color: "#f5b544" },
  benefits: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  benefit: { flexDirection: "row", alignItems: "center", gap: 8 },
  benefitText: { fontFamily: fonts.medium, color: colors.surface, fontSize: 13 },
  actions: { gap: 12, marginTop: 6 },
  primaryButton: { minHeight: 56, borderRadius: 22, backgroundColor: colors.accent, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, gap: 12 },
  primaryButtonText: { fontFamily: fonts.bold, color: colors.ink, fontSize: 16, flexShrink: 1 },
  loginButton: { minHeight: 56, borderRadius: 22, borderWidth: 1, borderColor: "#6a8780", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 18 },
  loginText: { fontFamily: fonts.semibold, color: colors.surface, fontSize: 15, flexShrink: 1 },
  pressed: { opacity: .72 },
});
