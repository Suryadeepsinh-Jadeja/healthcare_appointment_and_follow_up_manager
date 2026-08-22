import { Queue } from "bullmq";
import { redisConnection } from "./connection";
import { NotificationJobData } from "../modules/notifications/notifications.types";

export const NOTIFICATIONS_QUEUE_NAME = "notifications";
export const REMINDERS_QUEUE_NAME = "reminders";

export const notificationsQueue = new Queue<NotificationJobData>(NOTIFICATIONS_QUEUE_NAME, {
  connection: redisConnection,
});

/** Holds only the repeatable hold-expiry cleanup job — not appointment reminders (those are notification jobs). */
export const remindersQueue = new Queue(REMINDERS_QUEUE_NAME, { connection: redisConnection });
