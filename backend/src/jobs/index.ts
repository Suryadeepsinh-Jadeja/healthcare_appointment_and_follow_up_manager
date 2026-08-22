import { startNotificationsWorker } from "./notifications.worker";
import { scheduleHoldCleanup, startRemindersWorker } from "./reminders.worker";

async function main() {
  await scheduleHoldCleanup();
  startNotificationsWorker();
  startRemindersWorker();
  console.log("Workers started: notifications, reminders (hold-expiry cleanup every 60s)");
}

main().catch((error) => {
  console.error("Worker process failed to start:", error);
  process.exitCode = 1;
});
