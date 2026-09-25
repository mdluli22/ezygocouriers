import { unregisterNotifications } from "../operations/notifications";
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from "react";
import { stopTracking, trackingConsent, flushTrackingStop } from "../driver/location";
import { driverOutbox } from "../driver/queue";
import { AppState } from "react-native";
import { authController, googleFlow } from "./native-auth";

const AuthContext = createContext<{ email: string; setEmail: (value: string) => void; signOut: () => Promise<void> } | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [email, setEmail] = useState("");
  useEffect(() => {
    void authController.restore();
    const listener = AppState.addEventListener("change", state => {
      if (state === "active") void authController.restore();
      else if (state === "background") authController.lock();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active" && authController.getSnapshot().phase === "authenticated") void authController.restore();
    }, 60000);
    return () => { listener.remove(); clearInterval(timer); };
  }, []);
  async function signOut() {
    const owner = authController.getSnapshot().user?.id ?? (await trackingConsent())?.owner;
    try {
      await stopTracking();
      await unregisterNotifications().catch(() => undefined);
      if (owner) await flushTrackingStop(owner).catch(() => undefined);
      if (owner) await driverOutbox.clear(owner);
    } finally {
      setEmail("");
      await Promise.all([googleFlow.cancel(), authController.signOut()]);
    }
  }
  return <AuthContext.Provider value={{ email, setEmail, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is required");
  const state = useSyncExternalStore(authController.subscribe, authController.getSnapshot, authController.getSnapshot);
  return { ...context, ...state, controller: authController };
}
