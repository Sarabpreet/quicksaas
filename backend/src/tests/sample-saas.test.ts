import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildServer } from "../server.js";
import { runMigrations } from "../db/migrate.js";
import { redis } from "../redis/client.js";
import { rawClient } from "../db/client.js";
import { FastifyInstance } from "fastify";

let app: FastifyInstance;

let founderToken: string;
let orgId: string;
let feedbackPostResourceId: string;
let roadmapResourceId: string;
let createdPostId: string;
let competitorToken: string;
let competitorOrgId: string;

describe("Scenario #12 / Quality Gate G7: Turnkey Reference SaaS Suite (FeedbackPulse)", () => {
  before(async () => {
    await runMigrations();
    app = await buildServer();
    await app.ready();
  });

  // 1. Fresh Bootstrap & Tenant Registration
  test("1. Bootstrap new SaaS tenant 'FeedbackPulse' via Auth API", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: `founder_${Date.now()}@feedbackpulse.io`,
        password: "PulseSecurePassword123!",
        name: "Pulse Founder",
        organizationName: "FeedbackPulse Inc",
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.ok(body.token);
    assert.ok(body.organization.id);
    founderToken = body.token;
    orgId = body.organization.id;

    // Register competitor tenant for boundary tests
    const compRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: `rival_${Date.now()}@rivalapp.com`,
        password: "RivalPassword123!",
        name: "Rival Founder",
        organizationName: "Rival Feedback",
      },
    });
    assert.equal(compRes.statusCode, 201);
    const compBody = JSON.parse(compRes.body);
    competitorToken = compBody.token;
    competitorOrgId = compBody.organization.id;
  });

  // 2. Resource Engine: Define FeedbackPost and ProductRoadmap schemas
  test("2. Define 'FeedbackPost' and 'ProductRoadmap' via Dynamic Resource Engine", async () => {
    // Define FeedbackPost
    const postRes = await app.inject({
      method: "POST",
      url: "/api/v1/resources",
      headers: {
        authorization: `Bearer ${founderToken}`,
        "x-organization-id": orgId,
      },
      payload: {
        name: "FeedbackPost",
        slug: "feedback_posts",
        description: "Customer feature suggestions and bug reports",
        fields: [
          { name: "title", type: "text", required: true },
          { name: "description", type: "text", required: true },
          { name: "category", type: "text", required: true, defaultValue: "feature" },
          { name: "status", type: "text", required: true, defaultValue: "under_review" },
          { name: "upvotes", type: "number", required: true, defaultValue: 1 },
          { name: "submitterEmail", type: "text", required: true },
        ],
      },
    });

    assert.equal(postRes.statusCode, 201);
    const postBody = JSON.parse(postRes.body);
    assert.ok(postBody.id);
    assert.equal(postBody.slug, "feedback_posts");
    feedbackPostResourceId = postBody.id;

    // Define ProductRoadmap
    const roadmapRes = await app.inject({
      method: "POST",
      url: "/api/v1/resources",
      headers: {
        authorization: `Bearer ${founderToken}`,
        "x-organization-id": orgId,
      },
      payload: {
        name: "ProductRoadmap",
        slug: "roadmaps",
        description: "Public quarterly product release themes",
        fields: [
          { name: "quarter", type: "text", required: true },
          { name: "theme", type: "text", required: true },
          { name: "status", type: "text", required: true, defaultValue: "planned" },
          { name: "isPublic", type: "boolean", required: true, defaultValue: true },
        ],
      },
    });

    assert.equal(roadmapRes.statusCode, 201);
    const roadmapBody = JSON.parse(roadmapRes.body);
    assert.ok(roadmapBody.id);
    assert.equal(roadmapBody.slug, "roadmaps");
    roadmapResourceId = roadmapBody.id;
  });

  // 3. Dynamic Data CRUD: Create, Upvote, and Transition Feedback
  test("3. Create, query, and transition feedback posts through dynamic REST runtime", async () => {
    // Create feedback item
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/data/feedback_posts",
      headers: {
        authorization: `Bearer ${founderToken}`,
        "x-organization-id": orgId,
      },
      payload: {
        title: "Native Slack Notifications for Status Changes",
        description: "Post real-time webhook updates to our team Slack channel.",
        category: "integration",
        status: "under_review",
        upvotes: 12,
        submitterEmail: "customer@bigcorp.com",
      },
    });

    assert.equal(createRes.statusCode, 201);
    const created = JSON.parse(createRes.body);
    assert.ok(created.id);
    assert.equal(created.title, "Native Slack Notifications for Status Changes");
    assert.equal(created.upvotes, 12);
    createdPostId = created.id;

    // Transition status to planned & upvote to 13
    const updateRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/data/feedback_posts/${createdPostId}`,
      headers: {
        authorization: `Bearer ${founderToken}`,
        "x-organization-id": orgId,
      },
      payload: {
        status: "planned",
        upvotes: 13,
      },
    });

    assert.equal(updateRes.statusCode, 200);
    const updated = JSON.parse(updateRes.body);
    assert.equal(updated.status, "planned");
    assert.equal(updated.upvotes, 13);

    // Create corresponding roadmap item
    const roadmapRes = await app.inject({
      method: "POST",
      url: "/api/v1/data/roadmaps",
      headers: {
        authorization: `Bearer ${founderToken}`,
        "x-organization-id": orgId,
      },
      payload: {
        quarter: "Q4 2026",
        theme: "Ecosystem Integrations & Webhooks",
        status: "planned",
        isPublic: true,
      },
    });
    assert.equal(roadmapRes.statusCode, 201);
  });

  // 4. Multi-Tenant Boundary Enforcement
  test("4. Strict Tenant Isolation: Competitor tenant cannot view or alter FeedbackPulse posts", async () => {
    // Competitor cannot list FeedbackPulse posts
    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/data/feedback_posts",
      headers: {
        authorization: `Bearer ${competitorToken}`,
        "x-organization-id": competitorOrgId,
      },
    });
    // Competitor doesn't even have this resource defined in their org
    assert.equal(listRes.statusCode, 404);

    // Direct access to FeedbackPulse post by ID returns 404
    const getRes = await app.inject({
      method: "GET",
      url: `/api/v1/data/feedback_posts/${createdPostId}`,
      headers: {
        authorization: `Bearer ${competitorToken}`,
        "x-organization-id": competitorOrgId,
      },
    });
    assert.equal(getRes.statusCode, 404);
  });

  // 5. Code Promotion Escape Hatch for Vertical Resource
  test("5. Code Promotion Escape Hatch: Export FeedbackPost to typed Drizzle ORM schema", async () => {
    const promoRes = await app.inject({
      method: "POST",
      url: `/api/v1/resources/${feedbackPostResourceId}/promote`,
      headers: {
        authorization: `Bearer ${founderToken}`,
        "x-organization-id": orgId,
      },
    });

    assert.equal(promoRes.statusCode, 200);
    const promoBody = JSON.parse(promoRes.body);
    assert.ok(promoBody.generatedSchema);
    assert.ok(promoBody.generatedSchema.includes("export const feedback_posts"));
    assert.ok(promoBody.generatedSchema.includes("pgTable"));
    assert.ok(promoBody.generatedSchema.includes("submitterEmail"));
    assert.ok(promoBody.generatedSchema.includes("upvotes"));
    assert.ok(promoBody.destinationHint.includes("feedback_posts.schema.ts"));
  });

  after(async () => {
    if (app) await app.close();
    if (redis) await redis.quit();
    if (rawClient && typeof rawClient.close === "function") {
      await rawClient.close();
    }
  });
});
