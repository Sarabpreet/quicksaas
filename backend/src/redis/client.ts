import RedisPkg from "ioredis";

// Handle ESM and CommonJS interop for ioredis
const Redis = (RedisPkg as any).default || RedisPkg;

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let redisClient: any = null;
let isConnected = false;

export function getRedisClient(): any {
  if (!redisClient) {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 5) {
          console.warn("[Redis] Reconnect attempts exceeded. Backing off...");
          return null;
        }
        return Math.min(times * 100, 2000);
      },
      lazyConnect: false,
    });

    redisClient.on("connect", () => {
      isConnected = true;
      console.log("[Redis] Connected successfully to", redisUrl);
    });

    redisClient.on("error", (err: Error) => {
      isConnected = false;
      console.warn("[Redis] Connection error:", err.message);
    });
  }

  return redisClient;
}

export function isRedisReady(): boolean {
  return isConnected && redisClient?.status === "ready";
}

export const redis = getRedisClient();
