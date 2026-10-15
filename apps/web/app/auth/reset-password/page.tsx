import { Suspense } from "react";
import PasswordRecovery from "@/components/auth/PasswordRecovery";
export default function Page() { return <Suspense fallback={<p>Loading…</p>}><PasswordRecovery reset /></Suspense>; }
