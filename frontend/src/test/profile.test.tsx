import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext.js";
import { ProfileSettings } from "../pages/ProfileSettings.js";

describe("Customer Profile Settings Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("qs_customer_token", "mock-token");
    localStorage.setItem("qs_customer_org_id", "org-startup");
    vi.restoreAllMocks();
  });

  const mockMeData = {
    user: { id: "u-founder", email: "founder@startup.io", name: "Founder User", isSuperadmin: false },
    organizations: [
      {
        role: "owner",
        organizationId: "org-startup",
        organizationName: "Startup Labs",
        organizationSlug: "startup-labs",
      },
    ],
  };

  it("renders profile settings form and updates display name", async () => {
    let patchedBody: any = null;
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
      if (url.includes("/api/v1/auth/profile") && options?.method === "PATCH") {
        patchedBody = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ user: { ...mockMeData.user, name: patchedBody.name } }),
        });
      }
      return Promise.reject(new Error("Unknown route: " + url));
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ProfileSettings />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify Title & Profile info
    await waitFor(() => {
      expect(screen.getByText("Account Settings")).toBeInTheDocument();
      expect(screen.getByDisplayValue("founder@startup.io")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Founder User")).toBeInTheDocument();
    });

    // Update Name
    const nameInput = screen.getByDisplayValue("Founder User");
    fireEvent.change(nameInput, { target: { value: "Lead Founder" } });

    const saveBtn = screen.getByRole("button", { name: /save profile/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText("Profile updated successfully!")).toBeInTheDocument();
      expect(patchedBody?.name).toBe("Lead Founder");
    });
  });

  it("submits password change form and displays success state", async () => {
    let passwordBody: any = null;
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
      if (url.includes("/api/v1/auth/change-password") && options?.method === "POST") {
        passwordBody = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ message: "Password updated successfully" }),
        });
      }
      return Promise.reject(new Error("Unknown route: " + url));
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ProfileSettings />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Change Password")).toBeInTheDocument();
    });

    // Fill password fields
    const currentInput = screen.getByPlaceholderText("••••••••");
    fireEvent.change(currentInput, { target: { value: "OldPassword123!" } });

    const newInput = screen.getByPlaceholderText("Minimum 6 characters");
    fireEvent.change(newInput, { target: { value: "NewSecurePassword123!" } });

    const updateBtn = screen.getByRole("button", { name: /update password/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(screen.getByText("Password updated successfully!")).toBeInTheDocument();
      expect(passwordBody?.currentPassword).toBe("OldPassword123!");
      expect(passwordBody?.newPassword).toBe("NewSecurePassword123!");
    });
  });
});
