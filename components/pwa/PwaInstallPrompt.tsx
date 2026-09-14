"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "ezygo-pwa-install-dismissed";

export default function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === "true";
    } catch {
      // Installation remains available when browser storage is restricted.
    }
    if (standalone || dismissed) return;

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => setInstallPrompt(null);

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!installPrompt) return null;

  async function install() {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallPrompt(null);
    } catch {
      setInstallPrompt(null);
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // The prompt can still be dismissed for the current page lifecycle.
    }
    setInstallPrompt(null);
  }

  return (
    <aside
      aria-label="Install EzyGo"
      className="fixed inset-x-4 z-50 mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-white/15 bg-[#173d38] p-3 text-white shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[420px]"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <Download aria-hidden="true" size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Install EzyGo</p>
        <p className="text-xs leading-5 text-white/70">
          Book and track deliveries from your home screen.
        </p>
      </div>
      <button
        type="button"
        onClick={install}
        className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#173d38]"
      >
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <X aria-hidden="true" size={17} />
      </button>
    </aside>
  );
}
