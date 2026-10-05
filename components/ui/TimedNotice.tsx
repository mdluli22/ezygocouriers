"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useTimedMessage } from "./useTimedMessage";

export default function TimedNotice({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useTimedMessage(true, false);
  if (!visible) return null;
  return <div className="timed-notice" role="status">
    <div>{children}</div>
    <button type="button" aria-label="Dismiss notification" onClick={() => setVisible(false)}><X size={18} aria-hidden="true" /></button>
  </div>;
}
