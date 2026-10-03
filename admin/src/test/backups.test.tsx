import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext.js";
import { Backups } from "../pages/Backups.js";

describe("Admin Disaster Recovery & Backups Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("qs_token", "mock-superadmin-token");
    vi.restoreAllMocks();
  });

  const mockMeData = {
    user: { id: "u-super", email: "admin@quicksaas.dev", name: "Super Admin", isSuperadmin: true },
    organizations: [
      {
        role: "owner",
        organizationId: "org-system",
        organizationName: "System",
        organizationSlug: "system",
      },
    ],
  };

  const mockBackupsList = [
    {
      id: "bkp_1790973265115",
      filename: "quicksaas_backup_2026-10-02T20-34-25.tar.gz",
      label: "Automated Platform Snapshot",
      createdAt: "2026-10-02T20:34:25.000Z",
      version: "1.0.0",
      databaseType: "pglite",
      tablesSummary: {
        users: 58,
        organizations: 56,
        dynamicEntities: 18,
        files: 15,
        subscriptions: 8,
        apiKeys: 24,
        auditLogs: 273,
      },
      filesCount: 15,
      storageBytes: 1048576,
      archiveSizeBytes: 6160865,
      sha256: "4b5a6a859b3b31b4453e46223f3753cbe3156370e381ce736c622962f78d40c2",
    },
  ];

  it("renders backup list, metrics cards, and table rows", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeData),
        });
      }
      if (url.includes("/api/v1/admin/backups")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ backups: mockBackupsList }),
        });
      }
      return Promise.reject(new Error("Unknown route: " + url));
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Backups />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify Title & Metrics
    await waitFor(() => {
      expect(screen.getByText("Disaster Recovery & Platform Backups")).toBeInTheDocument();
      expect(screen.getByText("Total Snapshots")).toBeInTheDocument();
      expect(screen.getByText("PGlite")).toBeInTheDocument();
    });

    // Verify Table Row
    expect(screen.getByText("Automated Platform Snapshot")).toBeInTheDocument();
    expect(screen.getByText("quicksaas_backup_2026-10-02T20-34-25.tar.gz")).toBeInTheDocument();
    expect(screen.getByText("58 users")).toBeInTheDocument();
    expect(screen.getByText("56 orgs")).toBeInTheDocument();
  });

  it("verifies SHA256 integrity and triggers platform restore", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockMeData),
        });
      }
      if (url.includes("/api/v1/admin/backups/bkp_1790973265115/verify") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              valid: true,
              actualSha256: "4b5a6a859b3b31b4453e46223f3753cbe3156370e381ce736c622962f78d40c2",
            }),
        });
      }
      if (url.includes("/api/v1/admin/backups/bkp_1790973265115/restore") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              message: "Platform restored successfully",
              result: { success: true },
            }),
        });
      }
      if (url.includes("/api/v1/admin/backups")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ backups: mockBackupsList }),
        });
      }
      return Promise.reject(new Error("Unknown route: " + url));
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Backups />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Automated Platform Snapshot")).toBeInTheDocument();
    });

    // 1. Verify Checksum
    const verifyBtn = screen.getByRole("button", { name: /verify/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/integrity verified/i)).toBeInTheDocument();
      expect(screen.getByText("Verified")).toBeInTheDocument();
    });

    // 2. Open Restore Modal
    const restoreBtn = screen.getByRole("button", { name: /restore/i });
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(screen.getByText("Confirm Disaster Recovery Restore")).toBeInTheDocument();
    });

    // 3. Confirm Restore
    const confirmBtn = screen.getByRole("button", { name: /yes, restore platform state/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/platform state successfully restored from snapshot/i)).toBeInTheDocument();
    });
  });
});
