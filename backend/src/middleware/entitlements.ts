import { FastifyRequest, FastifyReply } from "fastify";
import { checkPlanEntitlement } from "../lib/stripe.js";

export function requirePlanEntitlement(
  metric: "members" | "resources" | "storage" | "api_keys",
  getIncrement?: (request: FastifyRequest) => number
) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    // Superadmin bypasses plan limits
    if (request.user?.isSuperadmin) {
      return;
    }

    const orgId = request.organizationId;
    if (!orgId) {
      return reply.status(400).send({ error: "Missing active organization" });
    }

    const increment = getIncrement ? getIncrement(request) : 1;
    const check = await checkPlanEntitlement(orgId, metric, increment);

    if (!check.allowed) {
      return reply.status(403).send({
        error: check.error || "Plan limit exceeded",
        limitExceeded: true,
        metric,
        limit: check.limit,
        current: check.current,
      });
    }
  };
}
