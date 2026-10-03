import React, { useEffect, useState } from "react";
import { Flag, Plus, X } from "lucide-react";
import { apiRequest } from "../lib/api.js";

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
}

export const FeatureFlags: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [showCreate, setShowCreate] = useState(false);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<FeatureFlag[]>("/api/v1/feature-flags");
      setFlags(data);
    } catch {
      setFlags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      const updated = await apiRequest(`/api/v1/feature-flags/${flag.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isEnabled: !flag.isEnabled }),
      });
      setFlags(flags.map((f) => (f.id === flag.id ? updated : f)));
    } catch (err: any) {
      alert("Failed to toggle flag: " + err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest("/api/v1/feature-flags", {
        method: "POST",
        body: JSON.stringify({ key, name, description, isEnabled }),
      });
      setShowCreate(false);
      setKey("");
      setName("");
      setDescription("");
      setIsEnabled(false);
      await fetchFlags();
    } catch (err: any) {
      alert("Failed to create flag: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Flag className="w-5 h-5 text-indigo-400" />
            <span>Feature Flags</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Toggle platform capabilities and tenant overrides in real-time without redeploying code.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Feature Flag</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-mono">
          Loading feature flags...
        </div>
      ) : flags.length === 0 ? (
        <div className="p-12 rounded-xl bg-slate-950 border border-slate-800 text-center">
          <Flag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-300">No feature flags configured</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className="p-5 rounded-xl bg-slate-950 border border-slate-800 shadow-md flex items-center justify-between gap-4"
            >
              <div>
                <div className="text-sm font-bold text-white">{flag.name}</div>
                <div className="font-mono text-xs text-indigo-400 mt-0.5">{flag.key}</div>
                {flag.description && (
                  <p className="text-xs text-slate-400 mt-2">{flag.description}</p>
                )}
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => handleToggle(flag)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  flag.isEnabled ? "bg-indigo-600" : "bg-slate-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    flag.isEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flag className="w-4 h-4 text-indigo-400" />
                <span>New Feature Flag</span>
              </h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Flag Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Assistant"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!key) setKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_"));
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Flag Key</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ai_assistant"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span className="text-xs text-slate-300 font-medium">Enable by default</span>
              </label>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create Flag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
