import { useCallback, useState } from "react";
import { Alert, Linking } from "react-native";
import { useFocusEffect } from "expo-router";
import { backgroundAvailable, startTracking, stopTracking, trackingConsent, flushTrackingStop } from "../../lib/driver/location";
import { Card, Notice, Action, errorMessage } from "../customer/UI";
export function TrackingPanel({ owner, trip }: { owner: number; trip: number }) {
  const [mode, setMode] = useState("off");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const read = useCallback(async () => { try { const consent = await trackingConsent(); setMode(consent?.owner === owner && consent.trip === trip ? consent.background ? "background" : "foreground" : "off"); } catch (e) { setError(errorMessage(e)); } }, [owner, trip]);
  useFocusEffect(useCallback(() => { void read(); const timer = setInterval(() => void read(), 5000); return () => clearInterval(timer); }, [read]));
  async function change(mode: "off" | "foreground" | "background") { setBusy(true); setError(""); try { if (mode === "off") { await stopTracking(); await read(); await flushTrackingStop(owner); } else await startTracking(owner, trip, mode === "background"); await read(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } }
  function consent(background: boolean) {
    Alert.alert(background ? "Share location in the background?" : "Share this trip’s location?", background ? "EzyGo will collect and send your trip location while the app is closed or your screen is locked. Sharing stops when you stop it, sign out, finish the trip, or after 12 hours. You can still update status without sharing." : "EzyGo will collect and send location for this trip while the app is open. You can stop at any time. Unsent points expire after one minute.", [{ text: "Not now", style: "cancel" }, { text: "Allow sharing", onPress: () => void change(background ? "background" : "foreground") }]);
  }
  return <Card><Notice message={mode === "off" ? "Location sharing is off." : `Location sharing enabled: ${mode}. GPS, network and OS limits may delay updates.`} />
    {mode === "off" ? <Action label="Enable foreground location" busy={busy} onPress={() => consent(false)} /> : <Action label="Stop sharing location" secondary busy={busy} onPress={() => void change("off")} />}
    {mode === "foreground" && backgroundAvailable ? <Action label="Enable background tracking" secondary busy={busy} onPress={() => consent(true)} /> : null}
    {!backgroundAvailable ? <Notice message="Expo Go supports foreground location only. Background tracking requires a native development build." /> : null}
    <Notice message={error} error />{error ? <Action label="Open device settings" secondary onPress={() => { void Linking.openSettings().catch(e => setError(errorMessage(e))); }} /> : null}
  </Card>;
}
