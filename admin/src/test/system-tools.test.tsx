import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { Jobs } from "../pages/Jobs.js";
import { Webhooks } from "../pages/Webhooks.js";
import { FeatureFlags } from "../pages/FeatureFlags.js";
import { AuditLogs } from "../pages/AuditLogs.js";
import { ApiKeys } from "../pages/ApiKeys.js";

describe("Admin System Operations Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Jobs Console
  it("jobs console displays queue tasks and triggers worker", async () => {
    const mockJobs = [
      {
        id: "job-1",
        name: "send_welcome_email",
        queueName: "email",
        status: "completed",
        attempts: 1,
        maxAttempts: 3,
        lastError: null,
        payload: { userId: "u-123" },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/jobs/worker/process-next")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ message: "Processed job successfully" }),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(mockJobs),
      });
    });

    render(
      <BrowserRouter>
        <Jobs />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("send_welcome_email")).toBeInTheDocument();
      expect(screen.getByText("COMPLETED")).toBeInTheDocument();
      expect(screen.getByText("email")).toBeInTheDocument();
    });

    const runWorkerBtn = screen.getByRole("button", { name: /run worker/i });
    expect(runWorkerBtn).toBeInTheDocument();
  });

  // 2. Webhooks
  it("webhooks dispatcher lists endpoints and dispatches test ping", async () => {
    const mockEndpoints = [
      {
        id: "wh-1",
        url: "https://api.partner.io/webhook",
        secret: "whsec_1234567890abcdef",
        events: ["*"],
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/test")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              message: "Test ping dispatched",
              signature: "sha256=abcdef123456",
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(mockEndpoints),
      });
    });

    render(
      <BrowserRouter>
        <Webhooks />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("https://api.partner.io/webhook")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /send test ping/i })).toBeInTheDocument();
    });
  });

  // 3. Feature Flags
  it("feature flags allows toggling feature states", async () => {
    const mockFlags = [
      {
        id: "flag-1",
        key: "ai_copilot",
        name: "AI Copilot",
        description: "Assists with writing",
        isEnabled: false,
      },
    ];

    global.fetch = vi.fn().mockImplementation((url: string, opts: any) => {
      if (opts?.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ ...mockFlags[0], isEnabled: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(mockFlags),
      });
    });

    render(
      <BrowserRouter>
        <FeatureFlags />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("AI Copilot")).toBeInTheDocument();
      expect(screen.getByText("ai_copilot")).toBeInTheDocument();
    });

    const toggleBtn = screen.getByRole("button", { name: "" }); // toggle switch has empty text
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/feature-flags/flag-1"),
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  // 4. Audit Logs
  it("audit logs browser displays activity trail", async () => {
    const mockLogs = [
      {
        id: "log-1",
        action: "customer.created",
        resourceType: "customer",
        resourceId: "c-123",
        metadata: { name: "Acme" },
        ipAddress: "127.0.0.1",
        createdAt: new Date().toISOString(),
        actor: { id: "u-1", email: "admin@example.com", name: "Admin" },
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ logs: mockLogs }),
    });

    render(
      <BrowserRouter>
        <AuditLogs />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("customer.created")).toBeInTheDocument();
      expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      expect(screen.getByText("127.0.0.1")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /inspect json/i })).toBeInTheDocument();
    });
  });

  // 5. API Keys
  it("api keys page displays keys and generation modal", async () => {
    const mockKeys = [
      {
        id: "key-1",
        name: "Production Backend Key",
        keyPrefix: "qs_live_prod",
        revokedAt: null,
        expiresAt: null,
        createdAt: new Date().toISOString(),
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve(mockKeys),
    });

    render(
      <BrowserRouter>
        <ApiKeys />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Production Backend Key")).toBeInTheDocument();
      expect(screen.getByText(/qs_live_prod/i)).toBeInTheDocument();
      expect(screen.getByText("ACTIVE")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /revoke/i })).toBeInTheDocument();
    });
  });
});
