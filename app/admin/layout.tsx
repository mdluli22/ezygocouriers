import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AdminLayoutShell from "@/components/admin/AdminLayoutShell";
import { getSession } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const forwardedHost = headersList.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hostname = (forwardedHost || headersList.get("host") || "").split(":")[0];
  const dashboardHref = hostname === "admin.ezygocouriers.co.za" ? "/" : "/admin";

  // Keep authorization on the server. The client shell below only controls
  // whether persistent navigation chrome is shown for the public login child.
  if (pathname !== "/admin/login") {
    const session = await getSession();
    if (!session) redirect("/admin/login");
    if (session.role !== "admin") redirect("/dashboard");
  }

  return (
    <AdminLayoutShell dashboardHref={dashboardHref}>
      {children}
    </AdminLayoutShell>
  );
}
