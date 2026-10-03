import { FastifyInstance } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import { notifications } from "../../db/schema/index.js";
import { authenticate } from "../../middleware/auth.js";

export async function notificationRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);

  // List notifications for current user
  server.get("/api/v1/notifications", {
    schema: {
      tags: ["Notifications"],
      summary: "List user notifications",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const userId = request.user?.userId;
    const orgId = request.organizationId;
    if (!userId || !orgId) return reply.status(400).send({ error: "Missing user or organization context" });

    const list = await db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, orgId)
      ),
      orderBy: desc(notifications.createdAt),
      limit: 50,
    });

    const unreadCount = list.filter((n: any) => !n.isRead).length;

    return reply.send({
      unreadCount,
      total: list.length,
      notifications: list,
    });
  });

  // Mark notification as read
  server.patch("/api/v1/notifications/:id/read", {
    schema: {
      tags: ["Notifications"],
      summary: "Mark notification as read",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
  }, async (request, reply) => {
    const userId = request.user?.userId;
    const { id } = request.params as any;

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId!)))
      .returning();

    if (!updated) return reply.status(404).send({ error: "Notification not found" });

    return reply.send(updated);
  });

  // Mark all notifications as read
  server.post("/api/v1/notifications/mark-all-read", {
    schema: {
      tags: ["Notifications"],
      summary: "Mark all notifications as read",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const userId = request.user?.userId;
    const orgId = request.organizationId;
    if (!userId || !orgId) return reply.status(400).send({ error: "Missing context" });

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.organizationId, orgId)));

    return reply.send({ message: "All notifications marked as read" });
  });

  // Create notification (trigger)
  server.post("/api/v1/notifications", {
    schema: {
      tags: ["Notifications"],
      summary: "Create in-app notification for a user",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["targetUserId", "title", "message"],
        properties: {
          targetUserId: { type: "string", format: "uuid" },
          title: { type: "string" },
          message: { type: "string" },
          type: { type: "string", enum: ["info", "success", "warning", "error"] },
          link: { type: "string" },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    if (!orgId) return reply.status(400).send({ error: "Missing organization context" });

    const { targetUserId, title, message, type = "info", link } = request.body as any;

    const [notif] = await db
      .insert(notifications)
      .values({
        organizationId: orgId,
        userId: targetUserId,
        title,
        message,
        type,
        link: link || null,
      })
      .returning();

    return reply.status(201).send(notif);
  });
}
