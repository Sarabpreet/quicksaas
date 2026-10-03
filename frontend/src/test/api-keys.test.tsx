import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext.js";
import { ApiKeys } from "../pages/ApiKeys.js";

describe("Customer API Keys Suite", () => {
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

  const mockKeys = [
    {
      id: "key-1",
      name: "Zapier Sync",
      keyPrefix: "qs_live_zapier",
      revokedAt: null,
      expiresAt: "2026-11-01T00:00:00Z",
      createdAt: "2026-10-01T10:00:00Z",
    },
    {
      id: "key-2",
      name: "Legacy Integration",
      keyPrefix: "qs_live_legacy",
      revokedAt: "2026-10-02T10:00:00Z",
      expiresAt: null,
      createdAt: "2026-09-01T10:00:00Z",
    },
  ];

  it("renders API keys list with active and revoked statuses", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeData),
        });
      }
      if (url.includes("/api/v1/notifications/unread-count")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ count: 0 }),
        });
      }
      if (url.includes("/api/v1/api-keys")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockKeys),
        });
      }
      return Promise.reject(new Error("Unknown route: " + url));
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ApiKeys />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify Title & Keys Table
    await waitFor(() => {
      expect(screen.getByText("Developer API Keys")).toBeInTheDocument();
      expect(screen.getByText("Zapier Sync")).toBeInTheDocument();
      expect(screen.getByText(/qs_live_zapier/)).toBeInTheDocument();
      expect(screen.getByText("ACTIVE")).toBeInTheDocument();
      expect(screen.getByText("Legacy Integration")).toBeInTheDocument();
      expect(screen.getByText("REVOKED")).toBeInTheDocument();
    });
  });

  it("opens modal, generates new key, and displays raw secret key", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeData),
        });
      }
      if (url.includes("/api/v1/notifications/unread-count")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ count: 0 }),
        });
      }
      if (url.includes("/api/v1/api-keys") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              apiKey: "qs_live_secret_token_1234567890abcdef",
              id: "key-3",
              name: "Stripe Webhook Worker",
            }),
        });
      }
      if (url.includes("/api/v1/api-keys")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockKeys),
        });
      }
      return Promise.reject(new Error("Unknown route: " + url));
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ApiKeys />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Developer API Keys")).toBeInTheDocument();
    });

    // Open Modal
    const newKeyBtn = screen.getByRole("button", { name: /new api key/i });
    fireEvent.click(newKeyBtn);

    expect(screen.getByText("Generate API Key")).toBeInTheDocument();

    // Fill form
    const nameInput = screen.getByPlaceholderText("e.g. Zapier Integration");
    fireEvent.change(nameInput, { target: { value: "Stripe Webhook Worker" } });

    // Submit
    const generateBtn = screen.getByRole("button", { name: /generate key/i });
    fireEvent.click(generateBtn);

    // Verify raw secret displayed
    await waitFor(() => {
      expect(screen.getByText(/Copy this key now/)).toBeInTheDocument();
      expect(screen.getByText("qs_live_secret_token_1234567890abcdef")).toBeInTheDocument();
    });
  });
});
