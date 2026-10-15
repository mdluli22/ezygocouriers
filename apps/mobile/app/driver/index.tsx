import { DutyPanel } from "../../components/driver/DutyPanel";
import { DriverDashboard } from "../../components/driver/DriverDashboard";
import { NotificationsPanel } from "../../components/operations/Notifications";
import { QueuePanel } from "../../components/driver/QueuePanel";
import { useAuth } from "../../lib/auth/provider";
import { useResource } from "../../lib/use-resource";
import { driverApi } from "../../lib/driver/api";

export default function Assignments() {
  const { user, signOut } = useAuth();
  const resource = useResource(driverApi.list, 15000);
  return <DriverDashboard user={user} {...resource} signOut={signOut}
    duty={<DutyPanel />} queue={user ? <QueuePanel owner={user.id} /> : null} notifications={<NotificationsPanel />} />;
}
