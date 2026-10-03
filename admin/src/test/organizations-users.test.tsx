import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext.js";
import { Organizations } from "../pages/Organizations.js";
import { Users } from "../pages/Users.js";

describe("Admin Organizations & Users Suites", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("qs_token", "mock-token");
    vi.restoreAllMocks();
  });

  const mockMeData = {
    user: { id: "u-admin", email: "admin@quicksaas.dev", name: "Admin", isSuperadmin: true },
    organizations: [{ role: "owner", organizationId: "org-1", organizationName: "System", organizationSlug: "system" }],
  };

  const mockOrgs = [
    {
      id: "org-startup",
      name: "Startup Labs",
      slug: "startup-labs",
      role: "owner",
      createdAt: "2026-10-01T10:00:00Z",
    },
    {
      id: "org-acme",
      name: "Acme Enterprise",
      slug: "acme-enterprise",
      role: "owner",
      createdAt: "2026-10-02T10:00:00Z",
    },
  ];

  const mockMembers = [
    {
      id: "mem-1",
      role: "owner",
      createdAt: "2026-10-01T10:00:00Z",
      user: { id: "u-founder", email: "founder@startup.io", name: "Alice Founder" },
    },
    {
      id: "mem-2",
      role: "viewer",
      createdAt: "2026-10-02T10:00:00Z",
      user: { id: "u-viewer", email: "viewer@startup.io", name: "Bob Viewer" },
    },
  ];

  const mockUsers = [
    {
      id: "u-1",
      email: "founder@startup.io",
      name: "Alice Founder",
      isSuperadmin: false,
      emailVerifiedAt: "2026-10-01T10:00:00Z",
      createdAt: "2026-10-01T10:00:00Z",
    },
    {
      id: "u-super",
      email: "admin@quicksaas.dev",
      name: "Super Admin",
      isSuperadmin: true,
      emailVerifiedAt: "2026-10-01T10:00:00Z",
      createdAt: "2026-10-01T10:00:00Z",
    },
  ];

  it("renders organizations list and selected organization members", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
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
      if (url.includes("/api/v1/organizations")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockOrgs),
        });
      }
      return Promise.reject(new Error("Unknown route: " + url));
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Organizations />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify Orgs rendered
    await waitFor(() => {
      expect(screen.getAllByText("Startup Labs")[0]).toBeInTheDocument();
      expect(screen.getByText("Acme Enterprise")).toBeInTheDocument();
    });

    // Verify Members table rendered
    await waitFor(() => {
      expect(screen.getByText("founder@startup.io")).toBeInTheDocument();
      expect(screen.getByText("viewer@startup.io")).toBeInTheDocument();
    });
  });

  it("renders global users directory and filters by email search", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeData),
        });
      }
      if (url.includes("/api/v1/admin/users")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockUsers),
        });
      }
      return Promise.reject(new Error("Unknown route: " + url));
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Users />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify Users List
    await waitFor(() => {
      expect(screen.getByText("Users Directory")).toBeInTheDocument();
      expect(screen.getByText("Alice Founder")).toBeInTheDocument();
      expect(screen.getByText("admin@quicksaas.dev")).toBeInTheDocument();
      expect(screen.getByText("Superadmin")).toBeInTheDocument();
    });

    // Search filter
    const searchInput = screen.getByPlaceholderText("Search users...");
    fireEvent.change(searchInput, { target: { value: "founder" } });

    expect(screen.getByText("Alice Founder")).toBeInTheDocument();
    expect(screen.queryByText("Super Admin")).not.toBeInTheDocument();
  });
});
