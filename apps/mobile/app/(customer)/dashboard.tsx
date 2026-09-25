import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { STATUS_LABELS } from "@ezygo/contracts";
import { customerApi } from "../../lib/customer-api";
import { useResource } from "../../lib/use-resource";
import { Page, Card, Title, Action, Notice, Loading, Failure, styles } from "../../components/customer/UI";
export default function Dashboard() {
  const { data, error, loading, refresh } = useResource(customerApi.list);
  const [history, setHistory] = useState(false);
  const deliveries = data?.filter(d => ["delivered", "failed", "cancelled"].includes(d.status) === history);
  return <Page refresh={() => void refresh()} refreshing={loading && !!data}>
    <Title>Your deliveries</Title>
    <Action label="Book a delivery" onPress={() => router.push("/deliveries/new")} />
    <Action label="Your profile" secondary onPress={() => router.push("/profile")} />
    <Action label={history ? "Show active deliveries" : "Show delivery history"} secondary onPress={() => setHistory(!history)} />
    <Title>{history ? "History" : "Active deliveries"}</Title>
    {loading && !data ? <Loading /> : null}
    {error ? <Failure error={error} retry={() => void refresh()} /> : null}
    {deliveries?.length === 0 ? <Card><Notice message={history ? "Your completed deliveries will appear here." : "No active deliveries. Ready to send something across Cape Town?"} /></Card> : null}
    {deliveries?.map(d => <Card key={d.id}><Text style={styles.label}>{d.tracking_number} · {STATUS_LABELS[d.status]}</Text><Notice message={`${d.pickup_street} → ${d.dropoff_street}`} /><Notice message={d.quote_amount ? `${d.quote_currency} ${Number(d.quote_amount).toFixed(2)}` : "Quote pending"} /><Action label={`View ${d.tracking_number}`} secondary onPress={() => router.push({ pathname: "/deliveries/[id]", params: { id: d.id } })} /></Card>)}
  </Page>;
}
