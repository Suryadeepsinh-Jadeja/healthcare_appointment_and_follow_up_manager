import { Worker } from "bullmq";
import { prisma } from "../lib/prisma";
import { redisConnection } from "./connection";
import { REMINDERS_QUEUE_NAME, remindersQueue } from "./queues";

const CLEANUP_JOB_SCHEDULER_ID = "cleanup-expired-holds";
const CLEANUP_INTERVAL_MS = 60 * 1000;

/** Registers the every-1-minute repeatable job. Safe to call on every process start (upsert). */
export async function scheduleHoldCleanup(): Promise<void> {
  await remindersQueue.upsertJobScheduler(
    CLEANUP_JOB_SCHEDULER_ID,
    { every: CLEANUP_INTERVAL_MS },
    { name: "cleanup-expired-holds", opts: { removeOnComplete: true, removeOnFail: true } },
  );
}

async function cleanupExpiredHolds(): Promise<number> {
  const result = await prisma.appointment.deleteMany({
    where: { status: "HELD", holdExpiresAt: { lt: new Date() } },
  });
  return result.count;
}

export function startRemindersWorker(): Worker {
  return new Worker(
    REMINDERS_QUEUE_NAME,
    async () => {
      const deleted = await cleanupExpiredHolds();
      if (deleted > 0) {
        console.log(`Cleaned up ${deleted} expired appointment hold(s)`);
      }
    },
    { connection: redisConnection },
  );
}
