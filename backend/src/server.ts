import { createApp } from "./app";
import { env } from "./config/env";
import { startNotificationsWorker } from "./jobs/notifications.worker";
import { scheduleHoldCleanup, startRemindersWorker } from "./jobs/reminders.worker";

const app = createApp();

app.listen(env.port, () => {
  console.log(`API listening on port ${env.port}`);
});

// Runs the BullMQ workers in-process by default so a single free-tier web
// service is enough to deploy (Render's free tier doesn't offer a separate
// background-worker resource type). Set RUN_WORKER_INLINE=false to disable
// this and run `npm run worker:start` as its own process instead, e.g. on a
// plan/platform that does support a dedicated worker.
if (env.runWorkerInline) {
  scheduleHoldCleanup()
    .then(() => {
      startNotificationsWorker();
      startRemindersWorker();
      console.log("Workers started in-process: notifications, reminders (hold-expiry cleanup every 60s)");
    })
    .catch((error) => {
      console.error("Failed to start in-process workers:", error);
    });
}
