import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext.js";
import { Sidebar } from "../components/Layout/Sidebar.js";
import { Header } from "../components/Layout/Header.js";

describe("Customer Navigation & Header Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("qs_customer_token", "mock-token");
    localStorage.setItem("qs_customer_org_id", "org-startup");
    vi.restoreAllMocks();
  });

  const mockMeData = {
    user: {
      id: "u-founder",
      email: "founder@startup.io",
      name: "Founder User",
      isSuperadmin: false,
    },
    organizations: [
      {
        role: "owner",
        organizationId: "org-startup",
        organizationName: "Startup Labs",
        organizationSlug: "startup-labs",
      },
      {
        role: "member",
        organizationId: "org-sideproj",
        organizationName: "Side Project",
        organizationSlug: "side-project",
      },
    ],
  };

  const mockDynamicResources = [
    {
      id: "res-deals",
      slug: "deals",
      name: "Deals Pipeline",
      icon: "Briefcase",
      schema: { type: "object", properties: { dealName: { type: "string" } } },
    },
    {
      id: "res-contacts",
      slug: "contacts",
      name: "Customer Contacts",
      icon: "Users",
      schema: { type: "object", properties: { email: { type: "string" } } },
    },
  ];

  const mockNotifications = {
    unreadCount: 2,
    notifications: [
      {
        id: "notif-1",
        title: "New Deal Created",
        message: "Acme Enterprise closed for $50k",
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "notif-2",
        title: "Team Invite Accepted",
        message: "Viewer joined Startup Labs",
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  it("renders the sidebar with tenant organizations and dynamic resource links", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeData),
        });
      }
      if (url.includes("/api/v1/resources")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockDynamicResources),
        });
      }
      if (url.includes("/api/v1/notifications")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ unreadCount: 0, notifications: [] }),
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
          <Sidebar />
        </AuthProvider>
      </BrowserRouter>
    );

    // Dynamic resources fetched and rendered in workspace section
    await waitFor(() => {
      expect(screen.getByText("Deals Pipeline")).toBeInTheDocument();
      expect(screen.getByText("Customer Contacts")).toBeInTheDocument();
    });

    // Core static navigation items
    expect(screen.getByText("Workspace Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Files & Storage")).toBeInTheDocument();
    expect(screen.getByText("Team Members")).toBeInTheDocument();
    expect(screen.getByText("Developer API Keys")).toBeInTheDocument();
  });

  it("renders header with notifications bell, badges, and allows mark as read", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeData),
        });
      }
      if (url.includes("/api/v1/notifications") && (!options || !options.method || options.method === "GET")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockNotifications),
        });
      }
      if (url.includes("/mark-all-read")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ message: "All notifications marked as read" }),
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
          <Header />
        </AuthProvider>
      </BrowserRouter>
    );

    // Should display notification badge
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    // Click notifications bell to open panel
    const bellButton = screen.getByTitle("Notifications");
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("New Deal Created")).toBeInTheDocument();
      expect(screen.getByText("Acme Enterprise closed for $50k")).toBeInTheDocument();
    });

    // Click mark all as read
    const markAllBtn = screen.getByText("Mark all read");
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/notifications/mark-all-read"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
