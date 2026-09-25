import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { AppState } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth/provider";
import { flushNotificationRemoval, nativePushAvailable, registerNotifications, unregisterNotifications } from "../../lib/operations/notifications";
import { Card, Notice, Action } from "../customer/UI";
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });
export function NotificationRuntime() {
  const { user, phase, controller } = useAuth();
  useEffect(() => {
    void flushNotificationRemoval().catch(() => undefined);
    const listener = AppState.addEventListener("change", state => { if (state === "active") void flushNotificationRemoval().catch(() => undefined); });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (!nativePushAvailable || phase !== "authenticated" || !user) return;
    let active = true;
    void registerNotifications().catch(() => undefined);
    const rotation = Notifications.addPushTokenListener(() => { void registerNotifications().catch(() => undefined); });
    async function open(response: Notifications.NotificationResponse) {
      const data = response.notification.request.content.data;
      if (!data || !user) return;
      const id = Number(data.delivery_id);
      if (!Number.isSafeInteger(id) || id <= 0 || data.audience !== user?.role) return;
      try {
        await controller.request(user.role === "driver" ? `/api/driver/deliveries/${id}` : `/api/deliveries/${id}`);
        if (active) router.push({ pathname: user.role === "driver" ? "/driver/trip/[id]" : "/(customer)/deliveries/[id]", params: { id } });
        await Notifications.clearLastNotificationResponseAsync();
      } catch { /* An old notification cannot grant access to a delivery. */ }
    }
    const listener = Notifications.addNotificationResponseReceivedListener(response => { void open(response); });
    void Notifications.getLastNotificationResponseAsync().then(response => { if (response) void open(response); });
    return () => { active = false; rotation.remove(); listener.remove(); };
  }, [phase,user,controller]);
  return null;
}
export function NotificationsPanel() {
  const [message,setMessage] = useState("Receive delivery and payment updates on this device.");
  const [busy,setBusy] = useState(false);
  async function change(enabled:boolean) {
    setBusy(true);
    try { if (enabled) await registerNotifications(true); else await unregisterNotifications(); setMessage(enabled ? "Notifications enabled." : "Notifications disabled on this device."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Please retry."); }
    finally { setBusy(false); }
  }
  return <Card><Notice message={message} /><Action label="Enable notifications" disabled={busy} onPress={() => void change(true)} /><Action label="Disable notifications" secondary disabled={busy} onPress={() => void change(false)} /></Card>;
}
