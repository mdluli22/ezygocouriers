import { useEffect, useState, type RefObject } from "react";
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../lib/theme";

type Destination = "Home" | "Orders" | "Send" | "History";
const items: { label: Destination; icon: keyof typeof Ionicons.glyphMap; selectedIcon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Home", icon: "home-outline", selectedIcon: "home" },
  { label: "Orders", icon: "cube-outline", selectedIcon: "cube" },
  { label: "Send", icon: "paper-plane-outline", selectedIcon: "paper-plane" },
  { label: "History", icon: "time-outline", selectedIcon: "time" },
];

export function GlassNavigation({ target, selected, onNavigate }: {
  target: RefObject<View | null>;
  selected: Destination;
  onNavigate: (destination: Destination) => void;
}) {
  const insets = useSafeAreaInsets();
  const [reduceTransparency, setReduceTransparency] = useState(true);
  useEffect(() => {
    let mounted = true;
    if (Platform.OS === "ios") {
      void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (mounted) setReduceTransparency(value); }).catch(() => { /* Keep the opaque fallback if the preference is unavailable. */ });
    } else setReduceTransparency(false);
    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduceTransparency);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  return <View style={[styles.position, { bottom: Math.max(insets.bottom, 12) }]}>
    <View style={styles.shadow}>
      <View style={styles.glass}>
        {!reduceTransparency && <BlurView pointerEvents="none" blurTarget={target} blurMethod="dimezisBlurViewSdk31Plus" intensity={75} tint="light" style={StyleSheet.absoluteFill} />}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: reduceTransparency ? colors.surface : "rgba(255,255,255,0.48)" }]} />
        <View pointerEvents="none" style={styles.highlight} />
        <View style={styles.row}>
          {items.map(item => {
            const active = selected === item.label;
            const send = item.label === "Send";
            return <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label === "Send" ? "Send a parcel" : item.label} accessibilityState={{ selected: active }} onPress={() => onNavigate(item.label)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <View style={[styles.icon, active && styles.active, send && styles.send]}>
                <Ionicons name={active ? item.selectedIcon : item.icon} size={23} color={active || send ? colors.ink : colors.primary} />
              </View>
              <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
            </Pressable>;
          })}
        </View>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  position: { position: "absolute", left: 18, right: 18, maxWidth: 600, alignSelf: "center", width: "auto" },
  shadow: { borderRadius: 29, shadowColor: colors.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 22, elevation: 8 },
  glass: { borderRadius: 29, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" },
  highlight: { position: "absolute", top: 0, left: 24, right: 24, height: 1, backgroundColor: "rgba(255,255,255,0.95)" },
  row: { flexDirection: "row", padding: 8, gap: 4 },
  item: { flex: 1, minHeight: 62, alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 20 },
  pressed: { backgroundColor: "rgba(47,79,79,0.09)", transform: [{ scale: 0.96 }] },
  icon: { width: 47, height: 37, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  active: { backgroundColor: "rgba(47,79,79,0.10)" },
  send: { backgroundColor: colors.accent, borderWidth: 1, borderColor: "rgba(255,255,255,0.65)", shadowColor: colors.accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  label: { fontSize: 10, fontWeight: "600", color: colors.muted },
  activeLabel: { color: colors.ink, fontWeight: "800" },
});
