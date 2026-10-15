export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.NEXT_RUNTIME !== "nodejs" || process.env.ENABLE_NOTIFICATION_WORKER !== "true") return;
  const { processNotificationOutbox } = await import("./lib/services/notification-outbox");
  // Intended for the long-running Docker server. Never enabled during a build or local tests.
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try { await processNotificationOutbox(); } catch { console.error("Notification outbox worker unavailable"); }
    finally { running = false; }
  }, 15000);
  timer.unref();
}
