import IORedis from "ioredis";
import { env } from "../config/env";

// BullMQ requires this exact setting on the ioredis connection it's given.
export const redisConnection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
