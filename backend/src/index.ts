import "dotenv/config";
import { buildServer } from "./server.js";
import { runMigrations } from "./db/migrate.js";

const PORT = parseInt(process.env.PORT || "4000", 10);
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  try {
    // 1. Run database migrations automatically on startup
    await runMigrations();

    // 2. Build Fastify server
    const app = await buildServer();

    // 3. Start listening
    await app.listen({ port: PORT, host: HOST });
    console.log(`\n🚀 QuickSaaS API running at http://localhost:${PORT}`);
    console.log(`📖 Interactive API Documentation: http://localhost:${PORT}/documentation\n`);

    // Graceful shutdown
    const signals = ["SIGINT", "SIGTERM"];
    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`\nReceived ${signal}. Shutting down gracefully...`);
        await app.close();
        process.exit(0);
      });
    }
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

main();
