import React, { useEffect, useState } from "react";
import { Sliders, Save, Check } from "lucide-react";
import { apiRequest } from "../lib/api.js";

export const Settings: React.FC = () => {
  const [settingsJson, setSettingsJson] = useState('{\n  "theme": "dark",\n  "allowSignups": true\n}');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const data = await apiRequest<{ settings: Record<string, any> }>("/api/v1/settings");
        if (data.settings && Object.keys(data.settings).length > 0) {
          setSettingsJson(JSON.stringify(data.settings, null, 2));
        }
      } catch {
        // Keep default
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(settingsJson);
      } catch {
        alert("Invalid JSON format");
        return;
      }

      for (const [key, value] of Object.entries(parsed)) {
        await apiRequest(`/api/v1/settings/${key}`, {
          method: "PUT",
          body: JSON.stringify({ value }),
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <span>Tenant Configuration & Settings</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Organization-scoped JSON settings and environment parameters.
        </p>
      </div>

      <div className="rounded-xl bg-slate-950 border border-slate-800 p-6 shadow-xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Settings JSON Payload
            </label>
            <textarea
              rows={12}
              value={settingsJson}
              onChange={(e) => setSettingsJson(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500">
              Settings are stored as native JSONB in PostgreSQL.
            </span>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md transition-colors disabled:opacity-50"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved Successfully!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Settings"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
