import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // proxy.ts handles redirects for protected pages; skip the guard for the
  // login page which is a public child of this route segment.
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const forwardedHost = headersList.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hostname = (forwardedHost || headersList.get("host") || "").split(":")[0];
  const dashboardHref = hostname === "admin.ezygocouriers.co.za" ? "/" : "/admin";

  // Render the login page without the sidebar shell
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "admin") redirect("/dashboard");

  return (
    <div className="admin-portal-shell">
      <AdminSidebar dashboardHref={dashboardHref} />
      <main className="admin-portal-main">
        {children}
      </main>
    </div>
  );
}
