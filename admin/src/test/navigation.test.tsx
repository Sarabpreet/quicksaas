import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext.js";
import { Sidebar } from "../components/Layout/Sidebar.js";
import { Header } from "../components/Layout/Header.js";

describe("Admin Navigation & Layout Suite", () => {
  it("renders all navigation items in sidebar", async () => {
    // Setup authenticated user in storage
    localStorage.setItem("qs_token", "fake_token");
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              user: {
                id: "u-1",
                email: "alex@startup.io",
                name: "Alex Founder",
                isSuperadmin: false,
              },
              organizations: [
                {
                  role: "owner",
                  organizationId: "org-1",
                  organizationName: "Startup Labs",
                  organizationSlug: "startup-labs",
                },
              ],
            }),
        });
      }
      return Promise.reject(new Error("Unknown"));
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Sidebar />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("QuickSaaS")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Resource Definitions")).toBeInTheDocument();
      expect(screen.getByText("Dynamic Entities")).toBeInTheDocument();
      expect(screen.getByText("Organizations")).toBeInTheDocument();
      expect(screen.getByText("Users Directory")).toBeInTheDocument();
      expect(screen.getByText("API Keys")).toBeInTheDocument();
      expect(screen.getByText("Audit Trail")).toBeInTheDocument();
      expect(screen.getByText("Background Jobs")).toBeInTheDocument();
      expect(screen.getByText("Webhooks Dispatcher")).toBeInTheDocument();
      expect(screen.getByText("Transactional Email")).toBeInTheDocument();
      expect(screen.getByText("Feature Flags")).toBeInTheDocument();
      expect(screen.getByText("Disaster Recovery")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });
  });

  it("header polls system health and displays database/redis badges", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: () =>
        Promise.resolve({
          status: "healthy",
          timestamp: new Date().toISOString(),
          database: { status: "healthy", engine: "postgresql-pglite" },
          redis: { status: "healthy" },
        }),
    });

    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/PGlite/i)).toBeInTheDocument();
      expect(screen.getByText(/Redis/i)).toBeInTheDocument();
      expect(screen.getByText(/OpenAPI Docs/i)).toBeInTheDocument();
    });
  });
});
