"use client";

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";

export default function NetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;
  return (
    <div className="mx-auto mt-3 flex w-[min(100%-2rem,72rem)] items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-900" role="status">
      <CloudOff size={15} />
      You’re offline. Viewing cached pages is safe, but booking, payment and status changes need a connection.
    </div>
  );
}
