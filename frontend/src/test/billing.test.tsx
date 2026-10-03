import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext.js";
import { Billing } from "../pages/Billing.js";

describe("Customer Billing & Subscription Suite", () => {
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

  const mockSubscriptionData = {
    subscription: {
      id: "sub-123",
      plan: "pro",
      status: "active",
      stripeCustomerId: "cus_123",
      currentPeriodEnd: "2026-11-01T00:00:00Z",
      cancelAtPeriodEnd: false,
    },
    plan: {
      id: "pro",
      name: "Growth (Pro)",
      description: "High-scale capacity and advanced tools.",
      priceMonthly: 49,
      stripePriceId: "price_pro_49",
      maxMembers: 15,
      maxResources: 15,
      maxStorageBytes: 5368709120, // 5 GB
      maxApiKeys: 15,
      features: ["Up to 15 team collaborators", "5 GB tenant file storage"],
    },
    usage: {
      membersCount: 2,
      resourcesCount: 1,
      storageBytes: 1048576,
      apiKeysCount: 3,
    },
    limits: {
      maxMembers: 15,
      maxResources: 15,
      maxStorageBytes: 5368709120,
      maxApiKeys: 15,
    },
    recentInvoices: [
      {
        id: "inv-001",
        amountPaid: 4900,
        currency: "usd",
        status: "paid",
        createdAt: "2026-10-01T10:00:00Z",
        invoicePdf: "https://stripe.com/invoice_pdf",
      },
    ],
  };

  const mockPlans = [
    {
      id: "free",
      name: "Starter",
      description: "Essential primitives for early prototypes.",
      priceMonthly: 0,
      stripePriceId: "price_free",
      maxMembers: 3,
      maxResources: 3,
      maxStorageBytes: 52428800,
      maxApiKeys: 2,
      features: ["Up to 3 team collaborators", "50 MB storage"],
    },
    {
      id: "pro",
      name: "Growth (Pro)",
      description: "High-scale capacity and advanced tools.",
      priceMonthly: 49,
      stripePriceId: "price_pro",
      maxMembers: 15,
      maxResources: 15,
      maxStorageBytes: 5368709120,
      maxApiKeys: 15,
      features: ["Up to 15 team collaborators", "5 GB storage"],
    },
    {
      id: "enterprise",
      name: "Scale (Enterprise)",
      description: "Unlimited scale and SLA.",
      priceMonthly: 199,
      stripePriceId: "price_enterprise",
      maxMembers: -1,
      maxResources: -1,
      maxStorageBytes: 107374182400,
      maxApiKeys: -1,
      features: ["Unlimited collaborators", "100 GB storage"],
    },
  ];

  it("renders active subscription details and capacity meters", async () => {
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
      if (url.includes("/api/v1/billing/subscription")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockSubscriptionData),
        });
      }
      if (url.includes("/api/v1/billing/plans")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ plans: mockPlans }),
        });
      }
      return Promise.reject(new Error("Unknown route: " + url));
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Billing />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify Title & Active Plan
    await waitFor(() => {
      expect(screen.getByText("Billing & Subscription Plans")).toBeInTheDocument();
      expect(screen.getAllByText("Growth (Pro)")[0]).toBeInTheDocument();
      expect(screen.getByText("active")).toBeInTheDocument();
      expect(screen.getAllByText(/\$\s*49/).length).toBeGreaterThan(0);
    });

    // Verify Usage Meters
    expect(screen.getByText("Capacity & Resource Entitlements")).toBeInTheDocument();
    expect(screen.getByText("Team Collaborators")).toBeInTheDocument();
    expect(screen.getByText("2 / 15")).toBeInTheDocument();
    expect(screen.getByText("Data Collections")).toBeInTheDocument();
    expect(screen.getByText("1 / 15")).toBeInTheDocument();

    // Verify Invoice
    expect(screen.getByText("Payment & Invoice History")).toBeInTheDocument();
    expect(screen.getByText(/\$49\.00/)).toBeInTheDocument();
  });

  it("allows upgrading to Enterprise plan", async () => {
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
      if (url.includes("/api/v1/billing/subscription")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockSubscriptionData),
        });
      }
      if (url.includes("/api/v1/billing/plans")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ plans: mockPlans }),
        });
      }
      if (url.includes("/api/v1/billing/checkout") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ checkoutUrl: "/mock", mode: "simulated" }),
        });
      }
      if (url.includes("/api/v1/billing/simulate-upgrade") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ message: "Upgraded" }),
        });
      }
      return Promise.reject(new Error("Unknown route: " + url));
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Billing />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Scale (Enterprise)")).toBeInTheDocument();
    });

    const upgradeBtn = screen.getByRole("button", { name: /upgrade to scale \(enterprise\)/i });
    fireEvent.click(upgradeBtn);

    await waitFor(() => {
      expect(screen.getByText(/successfully upgraded workspace to enterprise/i)).toBeInTheDocument();
    });
  });
});
