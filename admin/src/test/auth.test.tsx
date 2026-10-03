import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext.js";
import { Login } from "../pages/Login.js";

describe("Admin Authentication Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the login page with demo account shortcuts", () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText("QuickSaaS Admin Portal")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("Superadmin Account")).toBeInTheDocument();
    expect(screen.getByText("Startup Founder (Owner)")).toBeInTheDocument();
    expect(screen.getByText("Team Member (Viewer)")).toBeInTheDocument();
  });

  it("submits login credentials and stores token on success", async () => {
    const mockResponse = {
      token: "mock_jwt_token_12345",
      user: {
        id: "u-123",
        email: "superadmin@quicksaas.dev",
        name: "Platform Superadmin",
        isSuperadmin: true,
      },
      activeOrganizationId: "org-123",
    };

    const mockMeResponse = {
      user: mockResponse.user,
      organizations: [
        {
          role: "owner",
          organizationId: "org-123",
          organizationName: "Admin HQ",
          organizationSlug: "admin-hq",
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/auth/login")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockResponse),
        });
      }
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeResponse),
        });
      }
      return Promise.reject(new Error("Unknown route"));
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText("admin@example.com");
    const passwordInput = screen.getByPlaceholderText("••••••••••••");
    const submitBtn = screen.getByRole("button", { name: /sign in to admin/i });

    fireEvent.change(emailInput, { target: { value: "superadmin@quicksaas.dev" } });
    fireEvent.change(passwordInput, { target: { value: "AdminPass123!" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(localStorage.getItem("qs_token")).toBe("mock_jwt_token_12345");
      expect(localStorage.getItem("qs_active_org_id")).toBe("org-123");
    });
  });

  it("displays error message when login fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ error: "Invalid email or password" }),
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText("admin@example.com");
    const passwordInput = screen.getByPlaceholderText("••••••••••••");
    const submitBtn = screen.getByRole("button", { name: /sign in to admin/i });

    fireEvent.change(emailInput, { target: { value: "invalid@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    });
  });
});
