import fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { healthRoutes } from "./modules/health/health.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { organizationRoutes } from "./modules/organizations/organizations.routes.js";
import { resourceRoutes } from "./modules/resources/resources.routes.js";
import { apiKeyRoutes } from "./modules/api_keys/api_keys.routes.js";
import { auditRoutes } from "./modules/audit/audit.routes.js";
import { fileRoutes } from "./modules/files/files.routes.js";
import { emailRoutes } from "./modules/email/email.routes.js";
import { notificationRoutes } from "./modules/notifications/notifications.routes.js";
import { webhookRoutes } from "./modules/webhooks/webhooks.routes.js";
import { featureFlagRoutes } from "./modules/feature_flags/feature_flags.routes.js";
import { settingsRoutes } from "./modules/settings/settings.routes.js";
import { jobRoutes } from "./modules/jobs/jobs.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { backupRoutes } from "./modules/admin/backups.routes.js";
import { billingRoutes } from "./modules/billing/billing.routes.js";
import { attachCompactLogger, logger } from "./lib/logger.js";

export async function buildServer(): Promise<FastifyInstance> {
  const app = fastify({
    logger: false,
    disableRequestLogging: true,
  });

  // Attach Compact Single-Line Terminal & Persistent File Logger
  attachCompactLogger(app);

  // CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // OpenAPI / Swagger
  await app.register(swagger, {
    openapi: {
      info: {
        title: "QuickSaaS Kernel API",
        description: "Headless SaaS Core API with dynamic Resource Engine, multi-tenancy, and V1 kernel services",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
          apiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "x-api-key",
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/documentation",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });

  // Global Error Handler
  app.setErrorHandler((error: any, request, reply) => {
    logger.error(`[HTTP 500] ${request.method} ${request.url}: ${error.message}`, error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      statusCode,
      error: error.name || "Internal Server Error",
      message: error.message || "An unexpected error occurred",
    });
  });

  // Register All Kernel Routes
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(organizationRoutes);
  await app.register(resourceRoutes);
  await app.register(apiKeyRoutes);
  await app.register(auditRoutes);
  await app.register(fileRoutes);
  await app.register(emailRoutes);
  await app.register(notificationRoutes);
  await app.register(webhookRoutes);
  await app.register(featureFlagRoutes);
  await app.register(settingsRoutes);
  await app.register(jobRoutes);
  await app.register(adminRoutes);
  await app.register(backupRoutes);
  await app.register(billingRoutes);

  return app;
}
