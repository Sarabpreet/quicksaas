import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext.js";
import { Team } from "../pages/Team.js";
import { Files } from "../pages/Files.js";
import { ApiKeys } from "../pages/ApiKeys.js";

describe("Customer Team, Files & API Keys Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("qs_customer_token", "mock-token");
    localStorage.setItem("qs_customer_org_id", "org-startup");
    vi.restoreAllMocks();
  });

  const mockMeData = {
    user: { id: "u-founder", email: "founder@startup.io", name: "Founder", isSuperadmin: false },
    organizations: [
      {
        role: "owner",
        organizationId: "org-startup",
        organizationName: "Startup Labs",
        organizationSlug: "startup-labs",
      },
    ],
  };

  const mockMembers = [
    {
      id: "mem-1",
      role: "owner",
      createdAt: "2026-10-01T08:00:00Z",
      user: {
        id: "u-founder",
        email: "founder@startup.io",
        name: "Founder User",
      },
    },
    {
      id: "mem-2",
      role: "member",
      createdAt: "2026-10-02T09:00:00Z",
      user: {
        id: "u-dev",
        email: "dev@startup.io",
        name: "Lead Engineer",
      },
    },
  ];

  const mockFiles = [
    {
      id: "file-101",
      filename: "quarterly-report.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1048576,
      isPublic: false,
      downloadUrl: "/api/v1/files/file-101/download",
      createdAt: "2026-10-02T12:00:00Z",
    },
  ];

  const mockApiKeys = [
    {
      id: "key-1",
      name: "Stripe Webhook Worker",
      keyPrefix: "qs_live_9a7b",
      revokedAt: null,
      expiresAt: null,
      createdAt: "2026-10-01T15:00:00Z",
    },
  ];

  it("lists workspace team members and issues an invite link", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeData),
        });
      }
      if (url.includes("/members")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMembers),
        });
      }
      if (url.includes("/invites") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              invite: {
                id: "inv-99",
                token: "inv_secret_token_12345",
                email: "colleague@startup.io",
                role: "member",
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Team />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("founder@startup.io")).toBeInTheDocument();
      expect(screen.getByText("dev@startup.io")).toBeInTheDocument();
    });

    // Open Invite Modal
    fireEvent.click(screen.getByRole("button", { name: /invite team member/i }));

    expect(screen.getByText("Invite Colleague")).toBeInTheDocument();

    // Fill email
    fireEvent.change(screen.getByPlaceholderText("teammate@company.com"), {
      target: { value: "colleague@startup.io" },
    });

    // Submit invite
    fireEvent.click(screen.getByRole("button", { name: /send invitation/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invite link generated/i)).toBeInTheDocument();
      expect(screen.getByText(/inv_secret_token_12345/i)).toBeInTheDocument();
    });
  });

  it("lists organization files and allows opening upload modal", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeData),
        });
      }
      if (url.includes("/api/v1/files")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockFiles),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Files />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("quarterly-report.pdf")).toBeInTheDocument();
      expect(screen.getByText("application/pdf")).toBeInTheDocument();
    });

    // Open upload modal
    fireEvent.click(screen.getByRole("button", { name: /upload file/i }));
    expect(screen.getByText("Upload Document")).toBeInTheDocument();
  });

  it("lists API keys and generates a new secret key token", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeData),
        });
      }
      if (url.includes("/api/v1/api-keys") && (!options || !options.method || options.method === "GET")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockApiKeys),
        });
      }
      if (url.includes("/api/v1/api-keys") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              apiKey: "qs_live_secret_xyz1234567890abcdef",
              key: {
                id: "key-2",
                name: "Production Microservice",
                keyPrefix: "qs_live_secret",
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ApiKeys />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Stripe Webhook Worker")).toBeInTheDocument();
      expect(screen.getByText(/qs_live_9a7b/)).toBeInTheDocument();
    });

    // Generate new key
    fireEvent.click(screen.getByRole("button", { name: /new api key/i }));
    expect(screen.getByText("Generate API Key")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("e.g. Zapier Integration"), {
      target: { value: "Production Microservice" },
    });

    fireEvent.click(screen.getByRole("button", { name: /generate key/i }));

    await waitFor(() => {
      expect(screen.getByText("qs_live_secret_xyz1234567890abcdef")).toBeInTheDocument();
    });
  });
});
