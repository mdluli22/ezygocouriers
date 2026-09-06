import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import DriverLayoutShell from "@/components/driver/DriverLayoutShell";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Driver Portal" };

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  if (pathname !== "/driver/login") {
    const session = await getSession();
    if (!session) redirect("/driver/login");
    if (session.role !== "driver") redirect("/dashboard");
  }

  return <DriverLayoutShell>{children}</DriverLayoutShell>;
}
