import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "../../lib/auth/provider";
import { useResource } from "../../lib/use-resource";
import { dutyStatus, setDuty } from "../../lib/driver/duty";
import { colors, fonts } from "../../lib/theme";

export function DutyPanel() {
  const { user } = useAuth();
  const { data, error, refresh } = useResource(dutyStatus, 15000);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const changing = useRef(false);
  async function change(on: boolean) {
    if (!user || changing.current) return;
    changing.current = true; setBusy(true);
    try { await setDuty(user.id, on); setMessage(""); await refresh(); }
    catch { setMessage(on ? "Could not go online. Retry when connected." : "Sharing stopped on this device. Offline status will sync when connected."); }
    finally { changing.current = false; setBusy(false); }
  }
  return <View style={s.panel}>
    <DutyControl online={data ? data.on_duty : null} unavailable={!!error} busy={busy} onChange={on => void change(on)} />
    {message || error ? <Text accessibilityRole="alert" style={s.error}>{message || error}</Text> : null}
    {error ? <Pressable accessibilityRole="button" onPress={() => void refresh()} style={s.retry}><Text style={s.retryText}>Retry status</Text></Pressable> : null}
    {!data || error ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void change(false)} style={s.retry}><Ionicons name="stop-circle-outline" size={18} color={colors.primary} /><Text style={s.retryText}>Stop sharing & go offline</Text></Pressable> : null}
  </View>;
}

/** Visual availability control; only the container changes authenticated duty state. */
export function DutyControl({ online, unavailable = false, busy = false, onChange }: { online: boolean | null; unavailable?: boolean; busy?: boolean; onChange: (on: boolean) => void }) {
  const disabled = busy || online === null || (unavailable && !online);
  return <View style={s.statusCard}>
    <View style={s.statusHeading}><View style={[s.statusDot, online && !unavailable && s.onlineDot]} /><Text style={s.eyebrow}>YOUR AVAILABILITY</Text></View>
    <View style={s.row}><View style={s.copy}>
      <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={s.title}>{unavailable ? "Status unavailable" : online === null ? "Checking status…" : online ? "You’re online" : "You’re offline"}</Text>
      <Text style={s.description}>{unavailable ? "Reconnect to confirm your status." : online === null ? "Connecting to dispatch" : online ? "Available for delivery assignments" : "Go online when you’re ready."}</Text>
    </View><Pressable accessibilityRole="button" accessibilityLabel={online ? "Go offline" : "Go online"} accessibilityState={{ disabled, busy }} disabled={disabled} onPress={() => onChange(!online)} style={({ pressed }) => [s.go, online && s.stop, (pressed || disabled) && s.dim]}>
      {busy ? <ActivityIndicator color={online ? colors.ink : colors.surface} /> : <Ionicons name={online ? "pause" : "power"} size={27} color={online ? colors.ink : colors.surface} />}
    </Pressable></View>
  </View>;
}
const s = StyleSheet.create({
  panel: { gap: 10 }, statusCard: { padding: 18, borderRadius: 18, backgroundColor: "#f0f4f1", gap: 10 },
  statusHeading: { flexDirection: "row", alignItems: "center", gap: 7 }, statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#84978e" }, onlineDot: { backgroundColor: colors.success }, eyebrow: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.2, color: colors.muted },
  row: { flexDirection: "row", alignItems: "center", gap: 14 }, copy: { flex: 1, gap: 5 }, title: { fontFamily: fonts.semibold, fontSize: 24, letterSpacing: -.6, color: colors.ink }, description: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted },
  go: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 5, borderColor: "#dae6de" }, stop: { backgroundColor: colors.accent, borderColor: "#f6e6bf" }, actionLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted },
  dim: { opacity: .5 }, error: { fontFamily: fonts.regular, color: colors.error, fontSize: 12, lineHeight: 18 }, retry: { minHeight: 44, flexDirection: "row", gap: 8, alignItems: "center" }, retryText: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 13 },
});
