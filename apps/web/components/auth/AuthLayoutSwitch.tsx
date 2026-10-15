"use client";

import { usePathname } from "next/navigation";
import LoginShell from "./LoginShell";

export default function AuthLayoutSwitch({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/auth/signup") return <LoginShell role="customer" mode="signup">{content}</LoginShell>;
  return pathname === "/auth/login" ? <LoginShell role="customer">{content}</LoginShell> : children;
}
