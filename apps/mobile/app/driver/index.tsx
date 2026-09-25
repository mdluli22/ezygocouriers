import { DutyPanel } from "../../components/driver/DutyPanel";
import { NotificationsPanel } from "../../components/operations/Notifications";
import { useCallback, useState } from "react";
import { Text, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { STATUS_LABELS } from "@ezygo/contracts";
import { useAuth } from "../../lib/auth/provider";
import { useResource } from "../../lib/use-resource";
import { driverApi, activeTrip } from "../../lib/driver/api";
import { QueuePanel } from "../../components/driver/QueuePanel";
import { Page, Title, Card, Action, Notice, Failure, Loading, styles } from "../../components/customer/UI";
export default function Assignments() {
  const { user, signOut } = useAuth();
  const { data, error, loading, refresh } = useResource(driverApi.list);
  const [history, setHistory] = useState(false);
  useFocusEffect(useCallback(() => { const timer = setInterval(() => void refresh(), 15000); return () => clearInterval(timer); }, [refresh]));
  const current = data?.find(d => ["picked_up", "in_transit"].includes(d.status)) ?? data?.find(d => d.status === "assigned");
  return <Page refresh={() => void refresh()} refreshing={loading && !!data}><Title>Your route today</Title><Notice message={`Signed in as ${user?.full_name ?? "driver"}`} />
    <DutyPanel />{current ? <Action label={`Open current trip · ${current.tracking_number}`} onPress={() => router.push({ pathname: "/driver/trip/[id]", params: { id: current.id } })} /> : null}
    {user ? <QueuePanel owner={user.id} /> : null}
    <Action label={history ? "Show assignments" : "Show trip history"} secondary onPress={() => setHistory(!history)} />
    {loading && !data ? <Loading /> : null}{error ? <Failure error={error} retry={() => void refresh()} /> : null}
    {data?.filter(d => activeTrip(d.status) !== history).length === 0 ? <Card><Notice message={history ? "No completed trips yet." : "No assignments right now. Pull to refresh; new assignments are checked automatically."} /></Card> : null}
    {data?.filter(d => activeTrip(d.status) !== history).map(d => <Card key={d.id}><Text style={styles.label}>{d.tracking_number} · {STATUS_LABELS[d.status]}</Text><Notice message={`${d.pickup_street} → ${d.dropoff_street}`} /><Action label="View trip" secondary onPress={() => router.push({ pathname: "/driver/trip/[id]", params: { id: d.id } })} /></Card>)}
    <NotificationsPanel /><Action label="Sign out" secondary onPress={() => Alert.alert("Sign out?", "Location sharing will stop and unsent changes on this device will be removed. Sync first if you have pending work.", [{ text: "Stay signed in", style: "cancel" }, { text: "Sign out", onPress: () => { void signOut(); } }])} />
  </Page>;
}
