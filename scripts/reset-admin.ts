import readline from "node:readline/promises";
import crypto from "node:crypto";
import { eq, or } from "drizzle-orm";
import { db, rawClient } from "../backend/src/db/client.js";
import { users } from "../backend/src/db/schema/index.js";
import { hashPassword } from "../backend/src/lib/crypto.js";

function generateSecurePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let pass = "";
  for (let i = 0; i < 16; i++) {
    pass += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return `QsAdmin_${pass}`;
}

export async function resetAdminPassword() {
  const args = process.argv.slice(2);
  let targetEmail: string | undefined;
  let newPassword: string | undefined;
  let autoGenerate = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--email=")) {
      targetEmail = arg.split("=")[1];
    } else if (arg === "--email" && args[i + 1]) {
      targetEmail = args[++i];
    } else if (arg.startsWith("--password=")) {
      newPassword = arg.split("=")[1];
    } else if (arg === "--password" && args[i + 1]) {
      newPassword = args[++i];
    } else if (arg === "--generate" || arg === "-g") {
      autoGenerate = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
QuickSaaS Admin Password Reset Tool

USAGE:
  npm run admin:reset-password -- [options]

OPTIONS:
  --email=<email>         Email address of the superadmin user to reset
  --password=<pass>       New password (minimum 8 characters)
  --generate, -g          Auto-generate a secure random 24-character password
  -h, --help              Show this help message
`);
      process.exit(0);
    }
  }

  // Interactive prompts if values missing
  if (!targetEmail || (!newPassword && !autoGenerate)) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(`
┌──────────────────────────────────────────────────────────────┐
│  🔐 QuickSaaS - Superadmin Password Reset Tool               │
└──────────────────────────────────────────────────────────────┘
`);

    if (!targetEmail) {
      // Find default superadmin from DB if available
      let defaultAdminEmail = "superadmin@quicksaas.dev";
      try {
        const adminUser = await db.query.users.findFirst({
          where: eq(users.isSuperadmin, true),
        });
        if (adminUser) defaultAdminEmail = adminUser.email;
      } catch {}

      const rawEmail = await rl.question(`📧 Superadmin Email [${defaultAdminEmail}]: `);
      targetEmail = rawEmail.trim() || defaultAdminEmail;
    }

    if (!newPassword && !autoGenerate) {
      const rawPass = await rl.question(`🔑 New Password [press Enter to auto-generate secure password]: `);
      if (rawPass.trim()) {
        newPassword = rawPass.trim();
      } else {
        newPassword = generateSecurePassword();
        autoGenerate = true;
      }
    }

    rl.close();
  } else if (autoGenerate && !newPassword) {
    newPassword = generateSecurePassword();
  }

  if (!targetEmail) {
    console.error("❌ Target email is required.");
    process.exit(1);
  }

  if (!newPassword || newPassword.length < 8) {
    console.error("❌ Password must be at least 8 characters long.");
    process.exit(1);
  }

  // Find user in database
  const user = await db.query.users.findFirst({
    where: eq(users.email, targetEmail),
  });

  if (!user) {
    console.error(`❌ User with email '${targetEmail}' was not found in database.`);
    const existingAdmins = await db.query.users.findMany({
      where: eq(users.isSuperadmin, true),
      limit: 5,
    });
    if (existingAdmins.length > 0) {
      console.log(`\nExisting superadmin accounts found:`);
      existingAdmins.forEach((a) => console.log(` - ${a.name} (${a.email})`));
    }
    process.exit(1);
  }

  // Hash and update password
  const passwordHash = hashPassword(newPassword);
  await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`
┌──────────────────────────────────────────────────────────────┐
│  ✅ Superadmin Password Reset Successfully!                  │
├──────────────────────────────────────────────────────────────┤
│  User Name  : ${(user.name || "Administrator").padEnd(46)} │
│  Email      : ${user.email.padEnd(46)} │
│  Role       : ${(user.isSuperadmin ? "Superadmin (Platform Owner)" : "Standard User").padEnd(46)} │
│  Password   : ${newPassword.padEnd(46)} │
│  Login URL  : http://localhost:5173/login                    │
└──────────────────────────────────────────────────────────────┘
⚠️  Please store this password in a secure password manager.
`);

  if (rawClient && typeof rawClient.close === "function") {
    await rawClient.close();
  }
}

if (process.argv[1]?.endsWith("reset-admin.ts") || process.argv[1]?.endsWith("reset-admin.js")) {
  resetAdminPassword()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Password reset error:", err.message);
      process.exit(1);
    });
}
