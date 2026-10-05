import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, AppState, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../lib/theme";

/** Local artwork with native-driver motion; no network or location access needed. */
function DeliveryIllustration() {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    let mounted = true;
    let receivedEvent = false;
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", value => {
      receivedEvent = true;
      setReduceMotion(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted && !receivedEvent) setReduceMotion(value);
    }).catch(() => {});
    const app = AppState.addEventListener("change", state => setActive(state === "active"));
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);
  useFocusEffect(useCallback(() => {
    progress.setValue(0);
    if (reduceMotion || !active) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(progress, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => { animation.stop(); progress.setValue(0); };
  }, [active, progress, reduceMotion]));
  return <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Animated.View style={[styles.artImage, { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }]}>
      <Image source={require("../assets/welcome-courier.png")} style={styles.image} resizeMode="contain" />
    </Animated.View>
    <View style={styles.deliveryTag}><View style={styles.check}><Feather name="check" size={14} color={colors.surface} /></View><Text style={styles.deliveryTagText}>A little closer, every delivery.</Text></View>
  </View>;
}


export function WelcomeScreen() {
  return <SafeAreaView style={styles.screen}>
    <ScrollView bounces={false} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View><Text accessibilityLabel="EzyGo Couriers" style={styles.logo}>EzyGo<Text style={styles.dot}>.</Text></Text><Text style={styles.logoCaption}>COURIERS</Text></View>
        <View style={styles.location}><Feather name="map-pin" size={13} color={colors.ink} /><Text style={styles.locationText}>Cape Town</Text></View>
      </View>
      <DeliveryIllustration />
      <View style={styles.panel}>
        <View style={styles.eyebrowRow}><View style={styles.accentLine} /><Text style={styles.eyebrow}>YOUR CITY. DELIVERED.</Text></View>
        <Text accessibilityRole="header" style={styles.title}>Good things,{"\n"}<Text style={styles.titleAccent}>on their way.</Text></Text>
        <Text style={styles.description}>From your door to theirs. Book a courier and follow every step, all in one place.</Text>
        <View style={styles.benefits}>
          <View style={styles.benefit}><Feather name="package" size={16} color={colors.heroLabel} /><Text style={styles.benefitText}>Easy booking</Text></View>
          <View style={styles.benefit}><Feather name="navigation" size={16} color={colors.heroLabel} /><Text style={styles.benefitText}>Live tracking</Text></View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Get started, create an account" onPress={() => router.push("/auth/register")} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
          <Text style={styles.primaryButtonText}>Get started</Text><View style={styles.arrow}><Feather name="arrow-right" size={20} color={colors.ink} /></View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Log in to your account" onPress={() => router.push("/auth/sign-in")} style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}>
          <Text style={styles.loginText}>Log in</Text><Feather name="arrow-up-right" size={18} color={colors.surface} />
        </Pressable>
        <Text style={styles.footer}>Cape Town deliveries. Personal service.</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.soft },
  content: { flexGrow: 1, width: "100%", maxWidth: 520, alignSelf: "center", paddingTop: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 26, gap: 12, flexWrap: "wrap" },
  logo: { fontSize: 32, fontWeight: "900", color: colors.ink, letterSpacing: -1.7 }, dot: { color: colors.accent },
  logoCaption: { fontSize: 8, fontWeight: "700", letterSpacing: 3.2, color: colors.muted },
  location: { flexDirection: "row", alignItems: "center", gap: 5, padding: 10, borderRadius: 22, backgroundColor: "#ffffff80" }, locationText: { color: colors.ink, fontSize: 11, fontWeight: "600" },
  art: { height: 280, alignItems: "center", justifyContent: "center", marginTop: 8, overflow: "hidden" },
  artImage: { width: "100%", height: 280 }, image: { width: "100%", height: "100%" },
  deliveryTag: { position: "absolute", bottom: 12, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: colors.surface, borderRadius: 24 },
  check: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }, deliveryTagText: { color: colors.ink, fontSize: 11, fontWeight: "600" },
  panel: { flexGrow: 1, backgroundColor: colors.ink, borderTopLeftRadius: 38, borderTopRightRadius: 38, padding: 26, paddingTop: 28, gap: 16 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 9 }, accentLine: { width: 24, height: 4, borderRadius: 2, backgroundColor: colors.accent }, eyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 1.7, color: colors.heroText },
  title: { fontSize: 36, lineHeight: 41, fontWeight: "800", letterSpacing: -1.2, color: colors.surface }, titleAccent: { color: colors.accent },
  description: { fontSize: 14, lineHeight: 22, color: colors.heroText, maxWidth: 370 },
  benefits: { flexDirection: "row", flexWrap: "wrap", gap: 22, marginBottom: 6 }, benefit: { flexDirection: "row", alignItems: "center", gap: 7 }, benefitText: { color: colors.surface, fontSize: 11, fontWeight: "600" },
  primaryButton: { minHeight: 58, borderRadius: 30, backgroundColor: colors.accent, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 24, paddingRight: 10, paddingVertical: 10, gap: 12 }, primaryButtonText: { color: colors.ink, fontSize: 16, fontWeight: "700", flexShrink: 1 }, arrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center" },
  loginButton: { minHeight: 54, borderRadius: 28, borderWidth: 1, borderColor: "#6a8780", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 14 }, loginText: { color: colors.surface, fontSize: 15, fontWeight: "700" },
  footer: { fontSize: 10, textAlign: "center", color: colors.heroText }, pressed: { opacity: .72 },
});
