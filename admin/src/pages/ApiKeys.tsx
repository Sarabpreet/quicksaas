import React, { useEffect, useState } from "react";
import { Key, Plus, Trash2, Copy, Check, X, ShieldAlert } from "lucide-react";
import { apiRequest } from "../lib/api.js";

interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  revokedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export const ApiKeys: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate Key Modal
  const [showModal, setShowModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<ApiKeyRecord[]>("/api/v1/api-keys");
      setKeys(data);
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await apiRequest("/api/v1/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: keyName, expiresInDays }),
      });
      setGeneratedKey(res.apiKey);
      setCopied(false);
      setKeyName("");
      await fetchKeys();
    } catch (err: any) {
      alert("Failed to generate key: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this API Key immediately?")) return;
    try {
      await apiRequest(`/api/v1/api-keys/${id}`, { method: "DELETE" });
      await fetchKeys();
    } catch (err: any) {
      alert("Failed to revoke: " + err.message);
    }
  };

  const copyKey = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            <span>API Keys & Machine Access</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Programmatic bearer credentials for machine-to-machine integrations and CI pipelines.
          </p>
        </div>

        <button
          onClick={() => {
            setGeneratedKey(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Generate New Key</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-mono">
          Loading credentials...
        </div>
      ) : keys.length === 0 ? (
        <div className="p-12 rounded-xl bg-slate-950 border border-slate-800 text-center">
          <Key className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-300">No active API keys</div>
        </div>
      ) : (
        <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Key Name</th>
                <th className="py-3 px-4">Prefix</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Expires</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4 font-sans font-medium text-white text-xs">
                    {k.name}
                  </td>
                  <td className="py-3 px-4 text-indigo-400 font-mono text-xs">
                    {k.keyPrefix}••••••••
                  </td>
                  <td className="py-3 px-4">
                    {k.revokedAt ? (
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        REVOKED
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        ACTIVE
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {!k.revokedAt && (
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded font-sans text-xs inline-flex items-center gap-1"
                        title="Revoke key"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* GENERATE KEY MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-400" />
                <span>Generate API Key</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {generatedKey ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Copy this key now. For security, it will never be displayed again.
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-400 break-all flex items-center justify-between gap-2">
                  <span>{generatedKey}</span>
                  <button
                    onClick={() => copyKey(generatedKey)}
                    className="p-1 text-slate-400 hover:text-white shrink-0"
                    title="Copy Key"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full py-2 rounded-lg bg-slate-800 text-white text-xs font-medium"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Key Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GitHub Actions Deploy Key"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Expiration
                  </label>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                    <option value={365}>1 Year</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md disabled:opacity-50"
                  >
                    {generating ? "Generating..." : "Generate Key"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
