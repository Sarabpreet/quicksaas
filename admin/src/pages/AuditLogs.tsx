import React, { useEffect, useState } from "react";
import { FileText, Search, User, Globe, Clock, X } from "lucide-react";
import { apiRequest } from "../lib/api.js";

interface AuditLogRecord {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: any;
  ipAddress: string | null;
  createdAt: string;
  actor: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [selectedMeta, setSelectedMeta] = useState<any | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        ...(filterAction ? { action: filterAction } : {}),
      });
      const data = await apiRequest<{ logs: AuditLogRecord[] }>(`/api/v1/audit-logs?${q}`);
      setLogs(data.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <span>Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Immutable log of all tenant mutations, administrative actions, and security events.
          </p>
        </div>

        <div className="relative w-64">
          <input
            type="text"
            placeholder="Filter by action (e.g. user.login)..."
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-mono">
          Loading audit trail...
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 rounded-xl bg-slate-950 border border-slate-800 text-center">
          <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-300">No audit records found</div>
        </div>
      ) : (
        <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-white text-xs">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 text-indigo-400 font-mono text-[11px]">
                    {log.resourceType}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>{log.actor?.email || "System / API"}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-slate-600" />
                      <span>{log.ipAddress || "—"}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-600" />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <button
                      onClick={() => setSelectedMeta(log.metadata)}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-400 text-[11px]"
                    >
                      Inspect JSON
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* METADATA DRAWER MODAL */}
      {selectedMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Event Metadata</h3>
              <button onClick={() => setSelectedMeta(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-4 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto max-h-80">
              {JSON.stringify(selectedMeta, null, 2)}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedMeta(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
