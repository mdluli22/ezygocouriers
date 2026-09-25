import { dutyStatus } from "../../lib/driver/duty";
import { ApiError } from "@ezygo/api-client";
import { useEffect } from "react";
import { AppState } from "react-native";
import * as Network from "expo-network";
import { useAuth } from "../../lib/auth/provider";
import { driverOutbox } from "../../lib/driver/queue";
import { recoverBackgroundPoint, stopTracking, checkTracking, flushTrackingStop } from "../../lib/driver/location";
import { driverApi, activeTrip } from "../../lib/driver/api";
export function DriverRuntime() {
  const { phase, user } = useAuth();
  useEffect(() => {
    if (phase === "signedOut" || (phase === "authenticated" && user?.role !== "driver")) { void stopTracking().catch(() => undefined); return; }
    if (phase !== "authenticated" || user?.role !== "driver") return;
    let busy = false, mounted = true;
    async function sync() {
      if (busy || AppState.currentState !== "active" || !user) return;
      busy = true;
      try {
        if (!(await dutyStatus()).on_duty) await stopTracking();
        await flushTrackingStop(user.id).catch(() => undefined);
        const consent = await checkTracking(user.id);
        if (consent && consent.owner !== user.id) await stopTracking();
        if (consent?.owner === user.id) {
          try {
            const detail = await driverApi.detail(consent.trip);
            if (!activeTrip(detail.delivery.status)) await stopTracking();
          } catch (error) {
            if (error instanceof ApiError && [403, 404, 409].includes(error.status)) await stopTracking();
          }
        }
        if (!mounted) return;
        await recoverBackgroundPoint(user.id); await driverOutbox.flush(user.id);
      } catch { /* Screens expose queue and session errors with retry controls. */ }
      finally { busy = false; }
    }
    void sync();
    const interval = setInterval(() => void sync(), 15000);
    const network = Network.addNetworkStateListener(state => { if (state.isConnected && state.isInternetReachable !== false) void sync(); });
    return () => { mounted = false; clearInterval(interval); network.remove(); };
  }, [phase, user]);
  return null;
}
