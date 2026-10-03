import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext.js";
import { Login } from "../pages/Login.js";
import { Signup } from "../pages/Signup.js";

describe("Customer Authentication Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the login page with credentials form and preset demo accounts", () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText("Sign In to Your Workspace")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@company.com")).toBeInTheDocument();
    expect(screen.getByText("Startup Labs (Workspace Owner)")).toBeInTheDocument();
    expect(screen.getByText("Startup Labs (Viewer Member)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
  });

  it("allows selecting a demo credential shortcut to autofill and submit", async () => {
    const mockAuthResponse = {
      token: "cust_token_founder_999",
      user: {
        id: "u-founder",
        email: "founder@startup.io",
        name: "Startup Founder",
        isSuperadmin: false,
      },
      activeOrganizationId: "org-startup",
    };

    const mockMeResponse = {
      user: mockAuthResponse.user,
      organizations: [
        {
          role: "owner",
          organizationId: "org-startup",
          organizationName: "Startup Inc",
          organizationSlug: "startup-inc",
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/auth/login")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockAuthResponse),
        });
      }
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeResponse),
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
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText("Startup Labs (Workspace Owner)"));

    expect(screen.getByDisplayValue("founder@startup.io")).toBeInTheDocument();

    await waitFor(() => {
      expect(localStorage.getItem("qs_customer_token")).toBe("cust_token_founder_999");
    });
  });

  it("renders the signup page and handles new workspace registration", async () => {
    const mockRegisterResponse = {
      token: "cust_token_new_user",
      user: {
        id: "u-new",
        email: "alice@acme.com",
        name: "Alice Builder",
        isSuperadmin: false,
      },
      activeOrganizationId: "org-acme",
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/auth/register")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockRegisterResponse),
        });
      }
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              user: mockRegisterResponse.user,
              organizations: [
                {
                  role: "owner",
                  organizationId: "org-acme",
                  organizationName: "Acme Corp",
                  organizationSlug: "acme-corp",
                },
              ],
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
          <Signup />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText("Create Your SaaS Workspace")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Jane Doe"), {
      target: { value: "Alice Builder" },
    });
    fireEvent.change(screen.getByPlaceholderText("jane@company.com"), {
      target: { value: "alice@acme.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Acme Labs"), {
      target: { value: "Acme Corp" },
    });
    fireEvent.change(screen.getByPlaceholderText("Minimum 6 characters"), {
      target: { value: "SuperSecret123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create workspace/i }));

    await waitFor(() => {
      expect(localStorage.getItem("qs_customer_token")).toBe("cust_token_new_user");
    });
  });
});
