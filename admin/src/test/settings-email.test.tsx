import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext.js";
import { Settings } from "../pages/Settings.js";
import { Email } from "../pages/Email.js";

describe("Admin Settings & Transactional Email Suites", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("qs_token", "mock-token");
    vi.restoreAllMocks();
  });

  const mockMeData = {
    user: { id: "u-admin", email: "admin@quicksaas.dev", name: "Admin", isSuperadmin: true },
    organizations: [{ role: "owner", organizationId: "org-1", organizationName: "System", organizationSlug: "system" }],
  };

  const mockSettings = {
    settings: {
      theme: "dark",
      allowSignups: true,
      brandName: "QuickSaaS Enterprise",
    },
  };

  const mockTemplates = [
    {
      id: "tpl-welcome",
      name: "welcome_email",
      subject: "Welcome to QuickSaaS, {{name}}!",
      bodyHtml: "<p>Hello {{name}}, welcome to the platform.</p>",
      variables: ["name"],
    },
  ];

  const mockEmailLogs = [
    {
      id: "log-1",
      toAddress: "founder@startup.io",
      templateName: "welcome_email",
      subject: "Welcome to QuickSaaS, Alice!",
      status: "delivered",
      createdAt: "2026-10-01T10:00:00Z",
    },
  ];

  it("renders organization settings and saves JSON configuration", async () => {
    let savedKey = "";
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeData),
        });
      }
      if (url.includes("/api/v1/settings/") && options?.method === "PUT") {
        savedKey = url.split("/").pop() || "";
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ success: true }),
        });
      }
      if (url.includes("/api/v1/settings")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockSettings),
        });
      }
      return Promise.reject(new Error("Unknown route: " + url));
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Settings />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify Title & Settings loaded
    await waitFor(() => {
      expect(screen.getByText("Tenant Configuration & Settings")).toBeInTheDocument();
      expect(screen.getByText("Save Settings")).toBeInTheDocument();
    });

    // Save
    const saveBtn = screen.getByRole("button", { name: /save settings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText("Saved Successfully!")).toBeInTheDocument();
      expect(savedKey).toBeTruthy();
    });
  });

  it("renders transactional email templates and opens preview modal", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeData),
        });
      }
      if (url.includes("/api/v1/email/preview") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              renderedSubject: "Welcome to QuickSaaS, Jane Doe!",
              renderedHtml: "<p>Hello Jane Doe, welcome to the platform.</p>",
            }),
        });
      }
      if (url.includes("/api/v1/email/templates")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockTemplates),
        });
      }
      if (url.includes("/api/v1/email/logs")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockEmailLogs),
        });
      }
      return Promise.reject(new Error("Unknown route: " + url));
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Email />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify Template & Outbound Logs
    await waitFor(() => {
      expect(screen.getByText("Transactional Email Studio")).toBeInTheDocument();
      expect(screen.getByText("welcome_email")).toBeInTheDocument();
      expect(screen.getByText("founder@startup.io")).toBeInTheDocument();
      expect(screen.getByText(/SENT/i)).toBeInTheDocument();
    });

    // Preview
    const previewBtn = screen.getByTitle("Preview");
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(screen.getByText("Close Preview")).toBeInTheDocument();
      expect(screen.getByText(/Welcome to QuickSaaS, Jane Doe!/)).toBeInTheDocument();
    });
  });
});
