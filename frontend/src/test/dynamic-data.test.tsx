import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext.js";
import { DynamicResourceView } from "../pages/DynamicResourceView.js";

describe("Customer Dynamic Data View Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("qs_customer_token", "mock-token");
    localStorage.setItem("qs_customer_org_id", "org-startup");
    vi.restoreAllMocks();
  });

  const mockMeOwner = {
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

  const mockMeViewer = {
    user: { id: "u-viewer", email: "viewer@startup.io", name: "Viewer", isSuperadmin: false },
    organizations: [
      {
        role: "viewer",
        organizationId: "org-startup",
        organizationName: "Startup Labs",
        organizationSlug: "startup-labs",
      },
    ],
  };

  const mockResourceDefs = [
    {
      id: "res-deals-1",
      slug: "deals",
      name: "Deals",
      fields: [
        { name: "title", type: "string", required: true },
        { name: "amount", type: "number", required: true },
        { name: "stage", type: "string" },
      ],
    },
  ];

  const mockDealRecords = {
    data: [
      {
        id: "rec-1",
        title: "Enterprise License",
        amount: 25000,
        stage: "negotiation",
        createdAt: "2026-10-01T10:00:00Z",
      },
    ],
  };

  it("renders records table with dynamic fields for workspace owners", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeOwner),
        });
      }
      if (url.includes("/api/v1/resources")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockResourceDefs),
        });
      }
      if (url.includes("/api/v1/data/deals")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockDealRecords),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });
    });

    render(
      <MemoryRouter initialEntries={["/workspace/deals"]}>
        <AuthProvider>
          <Routes>
            <Route path="/workspace/:resourceSlug" element={<DynamicResourceView />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Verify collection header and record row
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /deals/i })).toBeInTheDocument();
      expect(screen.getByText("Enterprise License")).toBeInTheDocument();
      expect(screen.getByText("25000")).toBeInTheDocument();
    });

    // Ensure action buttons exist for owner
    expect(screen.getByRole("button", { name: /add deals/i })).toBeInTheDocument();
  });

  it("disables mutation features and displays read-only indicator for viewer roles", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeViewer),
        });
      }
      if (url.includes("/api/v1/resources")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockResourceDefs),
        });
      }
      if (url.includes("/api/v1/data/deals")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockDealRecords),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });
    });

    render(
      <MemoryRouter initialEntries={["/workspace/deals"]}>
        <AuthProvider>
          <Routes>
            <Route path="/workspace/:resourceSlug" element={<DynamicResourceView />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Viewer: Read Only")).toBeInTheDocument();
    });

    // Owner Add button should NOT be present
    expect(screen.queryByRole("button", { name: /add deals/i })).not.toBeInTheDocument();
  });

  it("creates a new record when submitting create modal as workspace owner", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeOwner),
        });
      }
      if (url.includes("/api/v1/resources")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockResourceDefs),
        });
      }
      if (url.includes("/api/v1/data/deals") && (!options || !options.method || options.method === "GET")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockDealRecords),
        });
      }
      if (url.includes("/api/v1/data/deals") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              id: "rec-2",
              data: JSON.parse(options.body),
              createdAt: new Date().toISOString(),
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
      <MemoryRouter initialEntries={["/workspace/deals"]}>
        <AuthProvider>
          <Routes>
            <Route path="/workspace/:resourceSlug" element={<DynamicResourceView />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add deals/i })).toBeInTheDocument();
    });

    // Open create modal
    fireEvent.click(screen.getByRole("button", { name: /add deals/i }));

    expect(screen.getByText("New Deals")).toBeInTheDocument();

    // Fill form (title is textbox, amount is spinbutton)
    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[1], { target: { value: "Series A Extension" } });

    const numberInput = screen.getByRole("spinbutton");
    fireEvent.change(numberInput, { target: { value: 75000 } });

    // Submit form via fireEvent.submit
    const form = screen.getByText("New Deals").closest("div")?.parentElement?.querySelector("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/data/deals"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
