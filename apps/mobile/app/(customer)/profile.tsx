import { NotificationsPanel } from "../../components/operations/Notifications";
import { useAuth } from "../../lib/auth/provider";
import { Page, Title, Card, Notice, Action } from "../../components/customer/UI";
export default function Profile() {
  const auth = useAuth();
  return <Page><Title>Your profile</Title><Card><Notice message={auth.user?.full_name} /><Notice message={auth.user?.email} /><Notice message={auth.user?.phone || "No phone number saved"} /></Card><NotificationsPanel /><Action label="Sign out" secondary onPress={() => void auth.signOut()} /></Page>;
}
