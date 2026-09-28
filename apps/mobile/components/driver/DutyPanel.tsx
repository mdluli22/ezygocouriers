import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "../../lib/auth/provider";
import { useResource } from "../../lib/use-resource";
import { dutyStatus, setDuty } from "../../lib/driver/duty";
import { colors } from "../../lib/theme";

export function DutyPanel() {
  const { user } = useAuth();
  const { data, error, refresh } = useResource(dutyStatus);
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
    <View style={s.row}>
      <View style={s.copy}><Text style={s.title}>{error ? "Status unavailable" : data ? data.on_duty ? "You’re online" : "You’re offline" : "Checking your status…"}</Text><Text style={s.description}>{data?.on_duty ? "Available for delivery assignments" : "Go online when you’re ready to deliver"}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={data?.on_duty ? "Go offline" : "Go online"} accessibilityState={{ disabled: busy || !data, busy }} disabled={busy || !data} onPress={() => void change(!data?.on_duty)} style={({ pressed }) => [s.go, data?.on_duty && s.stop, (pressed || busy || !data) && s.dim]}>
        {busy ? <ActivityIndicator color="white" /> : data?.on_duty ? <Ionicons name="stop" size={24} color="white" /> : <Text style={s.goText}>GO</Text>}
      </Pressable>
    </View>
    {message || error ? <Text accessibilityRole="alert" style={s.error}>{message || error}</Text> : null}
    {error ? <Pressable accessibilityRole="button" onPress={() => void refresh()} style={s.retry}><Text style={s.retryText}>Retry status</Text></Pressable> : null}
    {/* Keep the stop action available even when status cannot be fetched. */}
    {!data || error ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void change(false)} style={s.retry}><Text style={s.retryText}>Stop sharing & go offline</Text></Pressable> : null}
  </View>;
}
const s = StyleSheet.create({
  panel: { paddingVertical: 8, gap: 12 }, row: { flexDirection: "row", alignItems: "center", gap: 20 }, copy: { flex: 1, gap: 6 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -.8, color: colors.ink }, description: { fontSize: 12, lineHeight: 18, color: colors.muted },
  go: { width: 72, height: 72, borderRadius: 36, borderWidth: 5, borderColor: "#dcebe2", backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", shadowColor: colors.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: .2, shadowRadius: 7 },
  stop: { backgroundColor: colors.ink, borderColor: "#e6e9e7" }, goText: { fontSize: 23, fontWeight: "900", color: "white" }, dim: { opacity: .5 }, error: { color: colors.error, fontSize: 12, lineHeight: 18 }, retry: { paddingVertical: 10 }, retryText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
});
