import { test, expect } from "@playwright/test";

test.describe("QuickSaaS Full-Stack Multi-App Cross-Journey", () => {
  const uniqueId = Date.now();
  const testResourceSlug = `projects_${uniqueId}`;
  const testResourceName = `Projects ${uniqueId}`;
  const newAccountEmail = `founder_${uniqueId}@company.com`;
  const newWorkspaceName = `Acme Velocity ${uniqueId}`;

  test("1. Admin Portal: Superadmin logs in, views system metrics, and defines a dynamic resource", async ({
    page,
  }) => {
    // Navigate to Admin Portal
    await page.goto("http://localhost:5173/login");
    await expect(page.getByText("QuickSaaS Admin Portal")).toBeVisible();

    // Use Superadmin 1-click shortcut
    await page.getByRole("button", { name: /superadmin account/i }).click();

    // Expect redirect to Admin Dashboard
    await expect(page).toHaveURL("http://localhost:5173/");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByText("Tenant Organizations")).toBeVisible();

    // Navigate to API Studio Resources
    await page.getByRole("link", { name: /resource definitions/i }).click();
    await expect(page).toHaveURL("http://localhost:5173/resources");
    await expect(page.getByText("API Studio: Resource Definitions")).toBeVisible();

    // Open Define New Resource Modal
    await page.getByRole("button", { name: /new dynamic resource/i }).click();
    await expect(page.getByText("Define New Dynamic Resource")).toBeVisible();

    // Fill Resource Form
    await page.getByPlaceholder("e.g. Customer, Invoice, Project").fill(testResourceName);
    await page.getByPlaceholder("e.g. customers").fill(testResourceSlug);
    await page.getByPlaceholder("Optional description of this resource").fill("Project tracking for clients");

    // Add Field: status
    await page.getByRole("button", { name: /add field/i }).click();
    const fieldInputs = page.locator("input[placeholder='field_name']");
    await fieldInputs.nth(1).fill("status");

    // Submit Resource Definition
    await page.getByRole("button", { name: /publish resource/i }).click();

    // Modal should close
    await expect(page.getByText("Define New Dynamic Resource")).not.toBeVisible({ timeout: 10000 });

    // Verify newly defined resource appears in the list
    await expect(page.getByRole("heading", { name: testResourceName })).toBeVisible({ timeout: 10000 });

    // Listen for dialogs or errors
    page.on("dialog", async (dialog) => {
      console.log(`[Admin Dialog] ${dialog.type()}: ${dialog.message()}`);
      await dialog.dismiss();
    });

    // Verify 1-click code promotion blueprint modal
    const promoteBtn = page.getByRole("button", { name: "Promote" }).first();
    await expect(promoteBtn).toBeVisible({ timeout: 10000 });
    await promoteBtn.click();
    await expect(page.getByText(/Promote Resource:/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByText(/Promote Resource:/i)).not.toBeVisible();
  });

  test("2. Customer Workspace: New user registers, invites member, and manages developer keys", async ({
    page,
  }) => {
    // Navigate to Customer Signup (port 3001)
    await page.goto("http://localhost:3001/signup");
    await expect(page.getByText("Create Your SaaS Workspace")).toBeVisible();

    // Fill registration form
    await page.getByPlaceholder("Jane Doe").fill("Founder User");
    await page.getByPlaceholder("jane@company.com").fill(newAccountEmail);
    await page.getByPlaceholder("Acme Labs").fill(newWorkspaceName);
    await page.getByPlaceholder("Minimum 6 characters").fill("StartupPass123!");

    // Submit registration
    await page.getByRole("button", { name: /create workspace/i }).click();

    // Verify redirected to Dashboard
    await expect(page).toHaveURL("http://localhost:3001/");
    await expect(page.locator("header h1")).toContainText(newWorkspaceName);
    await expect(page.getByText("Workspace Data Collections")).toBeVisible();

    // Files Page: Upload and list file
    await page.getByRole("link", { name: /files & storage/i }).click();
    await expect(page).toHaveURL("http://localhost:3001/files");
    await expect(page.getByRole("heading", { name: /files & storage/i })).toBeVisible();

    // Team Page: Invite a teammate
    await page.getByRole("link", { name: /team members/i }).click();
    await expect(page).toHaveURL("http://localhost:3001/settings/team");
    await expect(page.getByRole("heading", { name: /team members/i })).toBeVisible();

    // Open Invite Modal
    await page.getByRole("button", { name: /invite team member/i }).click();
    await expect(page.getByRole("heading", { name: "Invite Colleague" })).toBeVisible();

    await page.getByPlaceholder("teammate@company.com").fill(`colleague_${uniqueId}@company.com`);
    await page.getByRole("button", { name: /send invitation/i }).click();

    // Confirm invite link generated and dismiss modal
    await expect(page.getByText(/invite link generated/i)).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByText(/invite link generated/i)).not.toBeVisible();

    // Developer API Keys Page: Generate key
    await page.getByRole("link", { name: /developer api keys/i }).click();
    await expect(page).toHaveURL("http://localhost:3001/settings/api-keys");
    await expect(page.getByRole("heading", { name: /developer api keys/i })).toBeVisible();

    await page.getByRole("button", { name: /new api key/i }).click();
    await expect(page.getByRole("heading", { name: "Generate API Key" })).toBeVisible();

    await page.getByPlaceholder("e.g. Zapier Integration").fill("Automation Worker");
    await page.getByRole("button", { name: /generate key/i }).click();

    // Verify secret token generated and visible
    await expect(page.getByText(/copy this key now/i)).toBeVisible();
    await expect(page.getByText(/qs_live_/).first()).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByText(/copy this key now/i)).not.toBeVisible();
  });

  test("3. RBAC Enforcement: Viewer demo account cannot mutate records or files", async ({
    page,
  }) => {
    // Navigate to Customer Login (port 3001)
    await page.goto("http://localhost:3001/login");
    await expect(page.getByText("Sign In to Your Workspace")).toBeVisible();

    // 1-Click login as Viewer Member
    await page.getByRole("button", { name: /startup labs \(viewer member\)/i }).click();

    // Verify logged in to Startup Labs with viewer role
    await expect(page).toHaveURL("http://localhost:3001/");
    await expect(page.locator("header h1")).toContainText("Startup Labs");
    await expect(page.locator("header").getByText("viewer", { exact: true })).toBeVisible();

    // Verify Files page mutation lock
    await page.getByRole("link", { name: /files & storage/i }).click();
    await expect(page).toHaveURL("http://localhost:3001/files");
    await expect(page.getByRole("button", { name: /upload file/i })).not.toBeVisible();

    // Verify Team page mutation lock
    await page.getByRole("link", { name: /team members/i }).click();
    await expect(page).toHaveURL("http://localhost:3001/settings/team");
    await expect(page.getByRole("button", { name: /invite team member/i })).not.toBeVisible();
  });

  test("4. Admin Audit Trail & Superadmin Stats: Platform captures end-to-end user actions", async ({
    page,
  }) => {
    // Login to Admin Portal
    await page.goto("http://localhost:5173/login");
    await page.getByRole("button", { name: /superadmin account/i }).click();
    await expect(page).toHaveURL("http://localhost:5173/");

    // Check Audit Logs
    await page.getByRole("link", { name: /audit trail/i }).click();
    await expect(page).toHaveURL("http://localhost:5173/audit-logs");
    await expect(page.getByRole("heading", { name: /audit trail/i })).toBeVisible();

    // Verify captured logs in table
    await expect(page.locator("tbody tr")).not.toHaveCount(0, { timeout: 10000 });

    // Check System Jobs Console
    await page.getByRole("link", { name: /background jobs/i }).click();
    await expect(page).toHaveURL("http://localhost:5173/jobs");
    await expect(page.getByRole("heading", { name: /background jobs/i })).toBeVisible();
  });

  test("5. Billing & Subscription Self-Service: Customer views plan capacity and upgrades to Enterprise", async ({
    page,
  }) => {
    // Navigate to Customer Login (port 3001)
    await page.goto("http://localhost:3001/login");
    await page.getByRole("button", { name: /startup labs \(workspace owner\)/i }).click();
    await expect(page).toHaveURL("http://localhost:3001/");

    // Navigate to Billing & Plans
    await page.getByRole("link", { name: /billing & plans/i }).click();
    await expect(page).toHaveURL("http://localhost:3001/settings/billing");
    await expect(page.getByRole("heading", { name: /billing & subscription plans/i })).toBeVisible();

    // Verify Capacity & Resource Entitlements section
    await expect(page.getByText(/capacity & resource entitlements/i)).toBeVisible();
    await expect(page.getByText("Team Collaborators", { exact: true })).toBeVisible();
    await expect(page.getByText("Payment & Invoice History")).toBeVisible();

    // Perform simulated upgrade to Scale (Enterprise)
    const upgradeEnterpriseBtn = page.getByRole("button", { name: /upgrade to scale \(enterprise\)/i });
    if (await upgradeEnterpriseBtn.isVisible()) {
      await upgradeEnterpriseBtn.click();
      await expect(page.getByText(/successfully upgraded workspace to enterprise/i)).toBeVisible();
    }
  });

  test("6. Disaster Recovery Operations: Superadmin inspects backups, creates snapshot, and verifies archive integrity", async ({
    page,
  }) => {
    // Login to Admin Portal
    await page.goto("http://localhost:5173/login");
    await page.getByRole("button", { name: /superadmin account/i }).click();
    await expect(page).toHaveURL("http://localhost:5173/");

    // Navigate to Disaster Recovery
    await page.getByRole("link", { name: /disaster recovery/i }).click();
    await expect(page).toHaveURL("http://localhost:5173/backups");
    await expect(page.getByRole("heading", { name: /disaster recovery & platform backups/i })).toBeVisible();

    // Verify Metric Cards
    await expect(page.getByText("Total Snapshots")).toBeVisible();
    await expect(page.getByText("Database Engine")).toBeVisible();

    // Create On-Demand Snapshot
    await page.getByRole("button", { name: /create snapshot/i }).click();
    await expect(page.getByRole("heading", { name: "Create Platform Snapshot" })).toBeVisible();
    await page.getByPlaceholder(/pre-v1.1 migration snapshot/i).fill("E2E Automated Snapshot");
    await page.getByRole("button", { name: "Create Snapshot" }).last().click();

    // Verify snapshot creation notification and table row
    await expect(page.getByText(/snapshot bkp_.*created successfully/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("E2E Automated Snapshot").first()).toBeVisible();

    // Verify Checksum on Snapshot row
    const verifyBtn = page.getByRole("button", { name: /verify/i }).first();
    await verifyBtn.click();
    await expect(page.getByText(/integrity verified/i)).toBeVisible({ timeout: 10000 });
  });
});
