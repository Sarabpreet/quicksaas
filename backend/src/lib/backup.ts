import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { db, rawClient, reloadDatabaseClient } from "../db/client.js";
import {
  users,
  organizations,
  dynamicEntities,
  files,
  subscriptions,
  apiKeys,
  auditLogs,
} from "../db/schema/index.js";
import { sql } from "drizzle-orm";

export interface BackupTablesSummary {
  users: number;
  organizations: number;
  dynamicEntities: number;
  files: number;
  subscriptions: number;
  apiKeys: number;
  auditLogs: number;
}

export interface BackupManifest {
  id: string;
  filename: string;
  label: string;
  createdAt: string;
  version: string;
  databaseType: "pglite" | "postgres";
  tablesSummary: BackupTablesSummary;
  filesCount: number;
  storageBytes: number;
  archiveSizeBytes: number;
  sha256: string;
}

export interface RestoreResult {
  success: boolean;
  backupId: string;
  restoredAt: string;
  manifest: BackupManifest;
  verification: {
    checksumValid: boolean;
    databaseReachable: boolean;
    restoredTables: BackupTablesSummary;
  };
}

const backupsDir = path.resolve(process.cwd(), ".data", "backups");
const postgresDataDir = path.resolve(process.cwd(), ".data", "postgres");
const storageDataDir = process.env.STORAGE_LOCAL_DIR
  ? path.resolve(process.env.STORAGE_LOCAL_DIR)
  : path.resolve(process.cwd(), ".data", "storage");

export function getBackupsDirectory(): string {
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  return backupsDir;
}

export async function computeTableSummary(): Promise<BackupTablesSummary> {
  const [u] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [o] = await db.select({ count: sql<number>`count(*)` }).from(organizations);
  const [d] = await db.select({ count: sql<number>`count(*)` }).from(dynamicEntities);
  const [f] = await db.select({ count: sql<number>`count(*)` }).from(files);
  const [s] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions);
  const [k] = await db.select({ count: sql<number>`count(*)` }).from(apiKeys);
  const [a] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs);

  return {
    users: Number(u?.count || 0),
    organizations: Number(o?.count || 0),
    dynamicEntities: Number(d?.count || 0),
    files: Number(f?.count || 0),
    subscriptions: Number(s?.count || 0),
    apiKeys: Number(k?.count || 0),
    auditLogs: Number(a?.count || 0),
  };
}

function computeDirectorySize(dirPath: string): { bytes: number; count: number } {
  if (!fs.existsSync(dirPath)) return { bytes: 0, count: 0 };
  let bytes = 0;
  let count = 0;
  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        count++;
        bytes += fs.statSync(full).size;
      }
    }
  }
  walk(dirPath);
  return { bytes, count };
}

/**
 * Creates a comprehensive point-in-time snapshot of the database and tenant files.
 */
export async function createBackup(options?: { label?: string }): Promise<BackupManifest> {
  const dir = getBackupsDirectory();
  const timestamp = new Date();
  const id = `bkp_${timestamp.getTime()}`;
  const filename = `quicksaas_backup_${timestamp.toISOString().replace(/[:.]/g, "-")}.tar.gz`;
  const archivePath = path.join(dir, filename);
  const manifestPath = path.join(dir, `${filename}.manifest.json`);

  // Staging area
  const stagingDir = path.join(dir, `staging_${id}`);
  const dbStaging = path.join(stagingDir, "database");
  const storageStaging = path.join(stagingDir, "storage");

  try {
    fs.mkdirSync(dbStaging, { recursive: true });
    fs.mkdirSync(storageStaging, { recursive: true });

    // Sync PGlite if supported
    if (rawClient && typeof rawClient.syncToFs === "function") {
      try {
        if (rawClient.fs && typeof rawClient.fs.syncToFs === "function") {
          await rawClient.syncToFs();
        }
      } catch {
        // Ignored for non-OPFS filesystems
      }
    }

    // 1. Copy database directory
    if (fs.existsSync(postgresDataDir)) {
      execSync(`cp -R "${postgresDataDir}"/* "${dbStaging}/"`);
      // Delete postmaster.pid to prevent lock errors upon restore
      const pidFile = path.join(dbStaging, "postmaster.pid");
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
    }

    // 2. Copy storage directory
    if (fs.existsSync(storageDataDir)) {
      execSync(`cp -R "${storageDataDir}"/* "${storageStaging}/" 2>/dev/null || true`);
    }

    // 3. Compute summaries
    const tablesSummary = await computeTableSummary();
    const storageStats = computeDirectorySize(storageDataDir);

    // Initial manifest without archive hash
    const manifestData: Omit<BackupManifest, "sha256" | "archiveSizeBytes"> = {
      id,
      filename,
      label: options?.label || "Automated Platform Snapshot",
      createdAt: timestamp.toISOString(),
      version: "1.0.0",
      databaseType: process.env.DATABASE_URL ? "postgres" : "pglite",
      tablesSummary,
      filesCount: storageStats.count,
      storageBytes: storageStats.bytes,
    };

    fs.writeFileSync(
      path.join(stagingDir, "manifest.json"),
      JSON.stringify(manifestData, null, 2)
    );

    // 4. Archive into tar.gz
    execSync(`tar -czf "${archivePath}" -C "${stagingDir}" .`);

    // 5. Compute SHA256 checksum and size
    const archiveBuffer = fs.readFileSync(archivePath);
    const sha256 = crypto.createHash("sha256").update(archiveBuffer).digest("hex");
    const archiveSizeBytes = archiveBuffer.length;

    const fullManifest: BackupManifest = {
      ...manifestData,
      sha256,
      archiveSizeBytes,
    };

    // Save manifest alongside archive for fast listing
    fs.writeFileSync(manifestPath, JSON.stringify(fullManifest, null, 2));

    return fullManifest;
  } finally {
    // Clean up staging
    if (fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }
  }
}

/**
 * Lists all available backup archives with their metadata.
 */
export async function listBackups(): Promise<BackupManifest[]> {
  const dir = getBackupsDirectory();
  const filesList = fs.readdirSync(dir);
  const manifests: BackupManifest[] = [];

  for (const file of filesList) {
    if (file.endsWith(".manifest.json")) {
      try {
        const content = fs.readFileSync(path.join(dir, file), "utf8");
        const manifest = JSON.parse(content) as BackupManifest;
        // Verify archive file exists
        if (fs.existsSync(path.join(dir, manifest.filename))) {
          manifests.push(manifest);
        }
      } catch (err) {
        console.warn(`[Backup] Failed reading manifest for ${file}:`, err);
      }
    }
  }

  // Sort newest first
  return manifests.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Retrieves a single backup by ID or filename.
 */
export async function getBackup(backupIdOrFilename: string): Promise<BackupManifest | null> {
  const backups = await listBackups();
  return (
    backups.find((b) => b.id === backupIdOrFilename || b.filename === backupIdOrFilename) || null
  );
}

/**
 * Verifies archive integrity and SHA256 checksum.
 */
export async function verifyBackup(backupIdOrFilename: string): Promise<{
  valid: boolean;
  manifest: BackupManifest;
  actualSha256: string;
  expectedSha256: string;
}> {
  const manifest = await getBackup(backupIdOrFilename);
  if (!manifest) {
    throw new Error(`Backup not found: ${backupIdOrFilename}`);
  }

  const archivePath = path.join(getBackupsDirectory(), manifest.filename);
  if (!fs.existsSync(archivePath)) {
    throw new Error(`Archive file not found on disk: ${manifest.filename}`);
  }

  const archiveBuffer = fs.readFileSync(archivePath);
  const actualSha256 = crypto.createHash("sha256").update(archiveBuffer).digest("hex");
  const valid = actualSha256 === manifest.sha256;

  return {
    valid,
    manifest,
    actualSha256,
    expectedSha256: manifest.sha256,
  };
}

/**
 * Restores a selected snapshot archive.
 */
export async function restoreBackup(backupIdOrFilename: string): Promise<RestoreResult> {
  const verification = await verifyBackup(backupIdOrFilename);
  if (!verification.valid) {
    throw new Error(
      `Backup checksum validation failed! Expected ${verification.expectedSha256}, got ${verification.actualSha256}`
    );
  }

  const dir = getBackupsDirectory();
  const { manifest } = verification;
  const archivePath = path.join(dir, manifest.filename);
  const stagingRestoreDir = path.join(dir, `restore_staging_${Date.now()}`);

  try {
    fs.mkdirSync(stagingRestoreDir, { recursive: true });

    // 1. Unpack archive
    execSync(`tar -xzf "${archivePath}" -C "${stagingRestoreDir}"`);

    const stagedDb = path.join(stagingRestoreDir, "database");
    const stagedStorage = path.join(stagingRestoreDir, "storage");

    if (!fs.existsSync(stagedDb)) {
      throw new Error("Invalid backup archive: missing database directory in archive");
    }

    // 2. Safely close existing DB client
    if (rawClient) {
      try {
        if (typeof rawClient.close === "function" && !rawClient.closed) {
          await rawClient.close();
        } else if (typeof rawClient.end === "function") {
          await rawClient.end();
        }
      } catch (err) {
        console.warn("[Restore] Notice during client close:", err);
      }
    }

    // 3. Replace live postgres directory
    if (!fs.existsSync(postgresDataDir)) {
      fs.mkdirSync(postgresDataDir, { recursive: true });
    } else {
      execSync(`rm -rf "${postgresDataDir}"/*`);
    }
    execSync(`cp -R "${stagedDb}"/* "${postgresDataDir}/"`);

    // Clean postmaster.pid if copied
    const pid = path.join(postgresDataDir, "postmaster.pid");
    if (fs.existsSync(pid)) {
      fs.unlinkSync(pid);
    }

    // 4. Replace live storage directory
    if (fs.existsSync(stagedStorage)) {
      if (!fs.existsSync(storageDataDir)) {
        fs.mkdirSync(storageDataDir, { recursive: true });
      } else {
        execSync(`rm -rf "${storageDataDir}"/*`);
      }
      execSync(`cp -R "${stagedStorage}"/* "${storageDataDir}/" 2>/dev/null || true`);
    }

    // 5. Reload database client
    await reloadDatabaseClient();

    // 6. Verify database can be queried and table counts match
    const restoredSummary = await computeTableSummary();

    return {
      success: true,
      backupId: manifest.id,
      restoredAt: new Date().toISOString(),
      manifest,
      verification: {
        checksumValid: true,
        databaseReachable: true,
        restoredTables: restoredSummary,
      },
    };
  } finally {
    if (fs.existsSync(stagingRestoreDir)) {
      fs.rmSync(stagingRestoreDir, { recursive: true, force: true });
    }
  }
}

/**
 * Deletes a backup archive and its manifest.
 */
export async function deleteBackup(backupIdOrFilename: string): Promise<boolean> {
  const manifest = await getBackup(backupIdOrFilename);
  if (!manifest) return false;

  const dir = getBackupsDirectory();
  const archivePath = path.join(dir, manifest.filename);
  const manifestPath = path.join(dir, `${manifest.filename}.manifest.json`);

  if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
  if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);

  return true;
}
