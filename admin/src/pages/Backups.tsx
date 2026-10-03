import React, { useEffect, useState } from "react";
import {
  Database,
  Archive,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  Trash2,
  ShieldCheck,
  Plus,
  RefreshCw,
  X,
  FileCheck,
} from "lucide-react";
import { apiRequest } from "../lib/api.js";

interface BackupRecord {
  id: string;
  filename: string;
  label: string;
  createdAt: string;
  version: string;
  databaseType: "pglite" | "postgres";
  tablesSummary: {
    users: number;
    organizations: number;
    dynamicEntities: number;
    files: number;
    subscriptions: number;
    apiKeys: number;
    auditLogs: number;
  };
  filesCount: number;
  storageBytes: number;
  archiveSizeBytes: number;
  sha256: string;
}

export const Backups: React.FC = () => {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [selectedForRestore, setSelectedForRestore] = useState<BackupRecord | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [verifiedStatus, setVerifiedStatus] = useState<Record<string, boolean>>({});

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ backups: BackupRecord[] }>("/api/v1/admin/backups");
      setBackups(data.backups || []);
    } catch {
      setBackups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setActionMessage(null);
    try {
      const res = await apiRequest<{ message: string; backup: BackupRecord }>("/api/v1/admin/backups", {
        method: "POST",
        body: JSON.stringify({ label: newLabel.trim() || undefined }),
      });
      setActionMessage({ type: "success", text: `Snapshot ${res.backup.id} created successfully!` });
      setShowCreateModal(false);
      setNewLabel("");
      await fetchBackups();
    } catch (err: any) {
      setActionMessage({ type: "error", text: "Failed to create snapshot: " + err.message });
    } finally {
      setCreating(false);
    }
  };

  const handleVerify = async (backupId: string) => {
    try {
      const res = await apiRequest<{ valid: boolean; actualSha256: string }>(
        `/api/v1/admin/backups/${backupId}/verify`,
        { method: "POST" }
      );
      setVerifiedStatus((prev) => ({ ...prev, [backupId]: res.valid }));
      if (res.valid) {
        setActionMessage({
          type: "success",
          text: `Integrity verified for ${backupId}: SHA256 checksum matches!`,
        });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: `Verification failed for ${backupId}: ` + err.message });
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedForRestore) return;
    setRestoring(true);
    setActionMessage(null);
    try {
      const res = await apiRequest<{ message: string; result: any }>(
        `/api/v1/admin/backups/${selectedForRestore.id}/restore`,
        { method: "POST" }
      );
      setActionMessage({
        type: "success",
        text: `Platform state successfully restored from snapshot ${selectedForRestore.id}!`,
      });
      setSelectedForRestore(null);
      await fetchBackups();
    } catch (err: any) {
      setActionMessage({ type: "error", text: "Restore failed: " + err.message });
    } finally {
      setRestoring(false);
    }
  };

  const handleDelete = async (backupId: string) => {
    if (!confirm(`Are you sure you want to delete backup snapshot ${backupId}?`)) return;
    try {
      await apiRequest(`/api/v1/admin/backups/${backupId}`, { method: "DELETE" });
      setActionMessage({ type: "success", text: `Backup ${backupId} deleted.` });
      await fetchBackups();
    } catch (err: any) {
      setActionMessage({ type: "error", text: "Delete failed: " + err.message });
    }
  };

  const latestBackup = backups[0];
  const totalArchiveBytes = backups.reduce((sum, b) => sum + (b.archiveSizeBytes || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Archive className="w-5 h-5 text-indigo-400" />
            <span>Disaster Recovery & Platform Backups</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated snapshot generation, archive checksum verification, and zero-downtime database recovery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBackups}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh backups list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Snapshot</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            actionMessage.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Snapshots</span>
            <Archive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{backups.length}</div>
          <div className="text-[11px] text-slate-500">Stored in .data/backups/</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Latest Snapshot</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-white truncate">
            {latestBackup ? new Date(latestBackup.createdAt).toLocaleString() : "No backups yet"}
          </div>
          <div className="text-[11px] text-emerald-400/80">
            {latestBackup ? `${(latestBackup.archiveSizeBytes / 1024).toFixed(1)} KB archive` : "Ready"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Database Engine</span>
            <Database className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-white uppercase font-mono">
            {latestBackup?.databaseType || "PGlite"}
          </div>
          <div className="text-[11px] text-slate-400">Zero-Docker embedded storage</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Archive Size</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {(totalArchiveBytes / 1024 / 1024).toFixed(2)} <span className="text-xs text-slate-400 font-sans">MB</span>
          </div>
          <div className="text-[11px] text-slate-500">Gzip-compressed archives</div>
        </div>
      </div>

      {/* Snapshots Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Available Point-in-Time Snapshots ({backups.length})
          </div>
          <span className="text-[11px] text-slate-500 font-mono">SHA256 Checksum Verified</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-mono">Loading backups list...</div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No backup snapshots created yet. Click &quot;Create Snapshot&quot; above to capture a point-in-time image.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Snapshot / Label</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4">Archive Size</th>
                  <th className="py-3 px-4">Table Record Counts</th>
                  <th className="py-3 px-4">SHA256 Hash</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {backups.map((bkp) => (
                  <tr key={bkp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <Archive className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{bkp.label || bkp.id}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{bkp.filename}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono">
                      {new Date(bkp.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono">
                      {(bkp.archiveSizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {bkp.tablesSummary?.users ?? 0} users
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {bkp.tablesSummary?.organizations ?? 0} orgs
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {bkp.tablesSummary?.dynamicEntities ?? 0} records
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {bkp.filesCount ?? 0} files
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        {verifiedStatus[bkp.id] ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span title={bkp.sha256}>{bkp.sha256?.substring(0, 14)}...</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleVerify(bkp.id)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] transition-colors flex items-center gap-1"
                          title="Verify SHA256 checksum"
                        >
                          <FileCheck className="w-3 h-3 text-indigo-400" />
                          <span>Verify</span>
                        </button>
                        <button
                          onClick={() => setSelectedForRestore(bkp)}
                          className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] transition-colors flex items-center gap-1 font-medium"
                          title="Restore live state from this backup"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => handleDelete(bkp.id)}
                          className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                          title="Delete snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Snapshot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Archive className="w-4 h-4 text-indigo-400" />
                <span>Create Platform Snapshot</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Captures an immutable, point-in-time archive of both embedded PostgreSQL data and tenant storage files, with SHA256 integrity checksums.
            </p>

            <form onSubmit={handleCreateSnapshot} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Snapshot Label (Optional)
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Pre-v1.1 Migration Snapshot"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                >
                  {creating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{creating ? "Capturing..." : "Create Snapshot"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Restore Modal */}
      {selectedForRestore && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Disaster Recovery Restore</h3>
                <p className="text-xs text-amber-400/80">Target Snapshot: {selectedForRestore.id}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Label:</span>
                <span className="font-medium text-white">{selectedForRestore.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Snapshot Timestamp:</span>
                <span className="font-mono text-white">
                  {new Date(selectedForRestore.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Users / Orgs in Snapshot:</span>
                <span className="font-mono text-indigo-400">
                  {selectedForRestore.tablesSummary.users} users / {selectedForRestore.tablesSummary.organizations} orgs
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 text-amber-300/90 text-[11px] leading-relaxed">
                ⚠️ <strong>Warning:</strong> Restoring will overwrite the current live database state and replace it with this snapshot. Any modifications made after {new Date(selectedForRestore.createdAt).toLocaleTimeString()} will be rolled back.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForRestore(null)}
                disabled={restoring}
                className="px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={restoring}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-amber-600/25 disabled:opacity-50"
              >
                {restoring && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{restoring ? "Restoring Platform..." : "Yes, Restore Platform State"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
