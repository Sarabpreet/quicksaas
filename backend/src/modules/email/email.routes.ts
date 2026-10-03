import { FastifyInstance } from "fastify";
import { eq, and, desc, or, isNull } from "drizzle-orm";
import { db } from "../../db/client.js";
import { emailTemplates, emailLogs } from "../../db/schema/index.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { logAuditEvent } from "../../lib/audit.js";

// Helper to interpolate template variables like {{name}}
function renderTemplate(template: string, vars: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), String(value));
  }
  return result;
}

export async function emailRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);

  // List templates
  server.get("/api/v1/email/templates", {
    preHandler: [requireRole(["owner", "admin"])],
    schema: {
      tags: ["Email"],
      summary: "List email templates",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;

    const templates = await db.query.emailTemplates.findMany({
      where: or(isNull(emailTemplates.organizationId), eq(emailTemplates.organizationId, orgId!)),
      orderBy: desc(emailTemplates.createdAt),
    });

    return reply.send(templates);
  });

  // Create template
  server.post("/api/v1/email/templates", {
    preHandler: [requireRole(["owner", "admin"])],
    schema: {
      tags: ["Email"],
      summary: "Create an email template",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["name", "subject", "bodyHtml"],
        properties: {
          name: { type: "string" },
          subject: { type: "string" },
          bodyHtml: { type: "string" },
          bodyText: { type: "string" },
          variables: { type: "array", items: { type: "string" } },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    const { name, subject, bodyHtml, bodyText, variables = [] } = request.body as any;

    const [tpl] = await db
      .insert(emailTemplates)
      .values({
        organizationId: orgId,
        name,
        subject,
        bodyHtml,
        bodyText: bodyText || null,
        variables,
      })
      .returning();

    return reply.status(201).send(tpl);
  });

  // Preview email rendering
  server.post("/api/v1/email/preview", {
    preHandler: [requireRole(["owner", "admin"])],
    schema: {
      tags: ["Email"],
      summary: "Preview email template with variable interpolation",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["templateName", "variables"],
        properties: {
          templateName: { type: "string" },
          variables: { type: "object" },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    const { templateName, variables } = request.body as any;

    const tpl = await db.query.emailTemplates.findFirst({
      where: and(
        eq(emailTemplates.name, templateName),
        or(isNull(emailTemplates.organizationId), eq(emailTemplates.organizationId, orgId!))
      ),
    });

    if (!tpl) return reply.status(404).send({ error: `Template '${templateName}' not found` });

    const renderedSubject = renderTemplate(tpl.subject, variables);
    const renderedHtml = renderTemplate(tpl.bodyHtml, variables);
    const renderedText = tpl.bodyText ? renderTemplate(tpl.bodyText, variables) : null;

    return reply.send({
      template: tpl.name,
      renderedSubject,
      renderedHtml,
      renderedText,
    });
  });

  // Send transactional email
  server.post("/api/v1/email/send", {
    preHandler: [requireRole(["owner", "admin", "member"])],
    schema: {
      tags: ["Email"],
      summary: "Send or enqueue a transactional email",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["to", "templateName", "variables"],
        properties: {
          to: { type: "string", format: "email" },
          templateName: { type: "string" },
          variables: { type: "object" },
        },
      },
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;
    const { to, templateName, variables = {} } = request.body as any;

    const tpl = await db.query.emailTemplates.findFirst({
      where: and(
        eq(emailTemplates.name, templateName),
        or(isNull(emailTemplates.organizationId), eq(emailTemplates.organizationId, orgId!))
      ),
    });

    if (!tpl) return reply.status(404).send({ error: `Template '${templateName}' not found` });

    const subject = renderTemplate(tpl.subject, variables);

    // Record log in DB
    const [log] = await db
      .insert(emailLogs)
      .values({
        organizationId: orgId,
        toAddress: to,
        templateName,
        subject,
        status: "sent",
        sentAt: new Date(),
      })
      .returning();

    await logAuditEvent({
      organizationId: orgId,
      userId: request.user?.userId,
      action: "email.sent",
      resourceType: "email",
      resourceId: log.id,
      metadata: { to, templateName, subject },
      ipAddress: request.ip,
    });

    return reply.status(201).send({
      message: "Email dispatched successfully",
      logId: log.id,
      to,
      subject,
      status: "sent",
    });
  });

  // Email delivery logs
  server.get("/api/v1/email/logs", {
    preHandler: [requireRole(["owner", "admin"])],
    schema: {
      tags: ["Email"],
      summary: "View email delivery logs",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organizationId;

    const logs = await db.query.emailLogs.findMany({
      where: eq(emailLogs.organizationId, orgId!),
      orderBy: desc(emailLogs.createdAt),
      limit: 50,
    });

    return reply.send(logs);
  });
}
