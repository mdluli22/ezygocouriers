import Link from "next/link";
import { ArrowLeft, Home, MapPinOff } from "lucide-react";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <MapPinOff size={52} aria-hidden="true" />
      <p className="not-found-code">404</p>
      <h1>This page is off the route.</h1>
      <p>The link may have changed, or the page no longer exists. Let’s get you back on track.</p>
      <div className="not-found-actions">
        <Link href="/" className="btn-primary"><Home size={18} aria-hidden="true" />Go home</Link>
        <Link href="/dashboard" className="btn-outline"><ArrowLeft size={18} aria-hidden="true" />My deliveries</Link>
      </div>
      <a href="mailto:support@ezygocouriers.co.za">Contact support</a>
    </main>
  );
}
