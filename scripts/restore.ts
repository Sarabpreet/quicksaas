#!/usr/bin/env node
import { restoreBackup, listBackups, verifyBackup } from "../backend/src/lib/backup.js";

async function main() {
  let targetId = process.argv[2];

  if (!targetId) {
    const existing = await listBackups();
    if (existing.length === 0) {
      console.error("❌ No backups found to restore.");
      process.exit(1);
    }
    targetId = existing[0].id;
    console.log(`ℹ️  No backup ID specified. Defaulting to latest snapshot: ${targetId}`);
  }

  console.log(`\n🔄 QuickSaaS Disaster Recovery: Restoring Snapshot...`);
  console.log(`   Target ID: ${targetId}\n`);

  console.log(`🔍 Step 1: Verifying archive checksum and integrity...`);
  const verification = await verifyBackup(targetId);
  if (!verification.valid) {
    console.error(`❌ Checksum mismatch! Archive may be corrupted or tampered with.`);
    process.exit(1);
  }
  console.log(`   Checksum valid (${verification.actualSha256.substring(0, 16)}...)`);

  console.log(`📦 Step 2: Unpacking archive and restoring database & files...`);
  const startTime = Date.now();
  const result = await restoreBackup(targetId);
  const durationMs = Date.now() - startTime;

  console.log(`\n✅ Platform successfully restored in ${durationMs}ms!`);
  console.log(`----------------------------------------------------------------`);
  console.log(`   Backup ID:        ${result.backupId}`);
  console.log(`   Restored At:      ${result.restoredAt}`);
  console.log(`   Database Status:  ${result.verification.databaseReachable ? "Reachable & Healthy" : "Error"}`);
  console.log(`----------------------------------------------------------------`);
  console.log(`   Restored Record Counts:`);
  for (const [table, count] of Object.entries(result.verification.restoredTables)) {
    console.log(`     - ${table.padEnd(18)}: ${count}`);
  }
  console.log(`----------------------------------------------------------------\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Restore failed:", err);
  process.exit(1);
});
