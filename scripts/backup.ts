#!/usr/bin/env node
import { createBackup } from "../backend/src/lib/backup.js";

async function main() {
  const label = process.argv[2] || "Manual CLI Snapshot";
  console.log(`\n📦 QuickSaaS Disaster Recovery: Initiating Snapshot...`);
  console.log(`   Label: "${label}"\n`);

  const startTime = Date.now();
  const manifest = await createBackup({ label });
  const durationMs = Date.now() - startTime;

  console.log(`✅ Snapshot successfully created in ${durationMs}ms!`);
  console.log(`----------------------------------------------------------------`);
  console.log(`   Backup ID:        ${manifest.id}`);
  console.log(`   Filename:         ${manifest.filename}`);
  console.log(`   Created At:       ${manifest.createdAt}`);
  console.log(`   Archive Size:     ${(manifest.archiveSizeBytes / 1024).toFixed(2)} KB`);
  console.log(`   Database Type:    ${manifest.databaseType}`);
  console.log(`   SHA256 Checksum:  ${manifest.sha256}`);
  console.log(`   Tenant Files:     ${manifest.filesCount} (${(manifest.storageBytes / 1024).toFixed(2)} KB)`);
  console.log(`----------------------------------------------------------------`);
  console.log(`   Table Record Counts:`);
  for (const [table, count] of Object.entries(manifest.tablesSummary)) {
    console.log(`     - ${table.padEnd(18)}: ${count}`);
  }
  console.log(`----------------------------------------------------------------\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Backup failed:", err);
  process.exit(1);
});
