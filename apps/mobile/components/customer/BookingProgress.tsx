import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts } from "../../lib/theme";

const stages = [
  { label: "Route", title: "Where are we heading?", icon: "map-outline" as const },
  { label: "Parcel", title: "Tell us about your parcel.", icon: "cube-outline" as const },
  { label: "Review", title: "Looking good. One last check.", icon: "checkmark-circle-outline" as const },
];

export function useBookingMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return !reduced;
}

export function BookingProgress({ step, animate }: { step: number; animate: boolean }) {
  const progress = useRef(new Animated.Value(step / stages.length)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: step / stages.length, duration: animate ? 420 : 0, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [step, animate, progress]);
  const stage = stages[step - 1];
  return <View style={s.hero}>
    <View style={s.top}><View style={s.heroIcon}><Ionicons name={stage.icon} size={25} color={colors.ink} /></View><Text style={s.eyebrow}>LET’S GET IT THERE</Text></View>
    <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={s.title}>{stage.title}</Text>
    <View accessibilityRole="progressbar" accessibilityLabel="Booking progress" accessibilityValue={{ min: 1, max: 3, now: step, text: `${stage.label}, stage ${step} of 3` }} style={s.track}>
      <Animated.View style={[s.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
    </View>
    <View style={s.labels}>{stages.map((item, index) => <View key={item.label} style={s.stage}><Ionicons name={index + 1 < step ? "checkmark-circle" : item.icon} size={16} color={index + 1 <= step ? colors.ink : colors.muted} /><Text style={[s.label, index + 1 === step && s.current]}>{item.label}</Text></View>)}</View>
  </View>;
}

export function BookingTransition({ step, animate, children }: PropsWithChildren<{ step: number; animate: boolean }>) {
  const opacity = useRef(new Animated.Value(1)).current;
  const offset = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) { opacity.setValue(1); offset.setValue(0); return; }
    opacity.setValue(0);
    offset.setValue(14);
    const animation = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(offset, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [step, animate, opacity, offset]);
  return <Animated.View style={{ gap: 16, opacity, transform: [{ translateY: offset }] }}>{children}</Animated.View>;
}

export function BookingCardHeading({ title, icon, amber = false }: { title: string; icon: keyof typeof Ionicons.glyphMap; amber?: boolean }) {
  return <View style={s.cardHeading}><View style={[s.cardIcon, amber && s.amber]}><Ionicons name={icon} size={23} color={colors.ink} /></View><View style={{ flex: 1 }}><Text style={s.cardTitle}>{title}</Text></View></View>;
}
const s = StyleSheet.create({
  hero: { padding: 23, borderRadius: 16, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border, gap: 12 },
  top: { flexDirection: "row", gap: 12, alignItems: "center" }, heroIcon: { padding: 10, backgroundColor: colors.accent, borderRadius: 12 },
  eyebrow: { fontSize: 9, letterSpacing: 1.4, fontFamily: fonts.bold, color: colors.primary },
  title: { fontSize: 27, fontFamily: fonts.semibold, color: colors.ink, letterSpacing: -.8 }, subtitle: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.muted },
  track: { height: 8, borderRadius: 4, backgroundColor: "#e2e8e1", overflow: "hidden", marginTop: 8 }, fill: { height: "100%", borderRadius: 4, backgroundColor: colors.primary },
  labels: { flexDirection: "row", justifyContent: "space-between", gap: 8 }, stage: { flexDirection: "row", gap: 5, alignItems: "center" }, label: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted }, current: { fontFamily: fonts.bold, color: colors.ink },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }, cardIcon: { padding: 11, borderRadius: 12, backgroundColor: colors.soft }, amber: { backgroundColor: colors.cream }, cardTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink }, cardSubtitle: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: colors.muted, marginTop: 3 },
});
