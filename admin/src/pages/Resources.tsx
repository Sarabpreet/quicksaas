import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Layers,
  Plus,
  Code2,
  Trash2,
  Database,
  Copy,
  Check,
  AlertCircle,
  X,
} from "lucide-react";
import { apiRequest } from "../lib/api.js";

interface FieldDef {
  name: string;
  type: "text" | "number" | "boolean" | "date" | "json";
  required?: boolean;
  defaultValue?: any;
}

interface ResourceDef {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fields: FieldDef[];
  isPublished: boolean;
  createdAt: string;
}

export const Resources: React.FC = () => {
  const [resources, setResources] = useState<ResourceDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Resource Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldDef[]>([
    { name: "title", type: "text", required: true },
  ]);
  const [saving, setSaving] = useState(false);

  // Promote Modal State
  const [promoteData, setPromoteData] = useState<{
    resource: string;
    slug: string;
    generatedSchema: string;
    destinationHint: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ResourceDef[]>("/api/v1/resources");
      setResources(data);
    } catch (err: any) {
      setError(err.message || "Failed to load dynamic resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleAddField = () => {
    setFields([...fields, { name: "", type: "text", required: false }]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: keyof FieldDef, value: any) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [key]: value };
    setFields(updated);
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiRequest("/api/v1/resources", {
        method: "POST",
        body: JSON.stringify({
          name,
          slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          description,
          fields: fields.filter((f) => f.name.trim().length > 0),
        }),
      });
      setShowCreateModal(false);
      setName("");
      setSlug("");
      setDescription("");
      setFields([{ name: "title", type: "text", required: true }]);
      await fetchResources();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePromote = async (id: string) => {
    try {
      const data = await apiRequest(`/api/v1/resources/${id}/promote`, {
        method: "POST",
      });
      setPromoteData(data);
      setCopied(false);
    } catch (err: any) {
      alert("Failed to generate code blueprint: " + err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>API Studio: Resource Definitions</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Build and manage dynamic CRUD resources with instant REST endpoints, validation, and zero-downtime code promotion.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Dynamic Resource</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Resources Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-mono">
          Loading resource definitions...
        </div>
      ) : resources.length === 0 ? (
        <div className="p-12 rounded-xl bg-slate-950 border border-slate-800 text-center">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200">No dynamic resources created yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Use the API Studio to define your first CRUD entity without writing backend schema code.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium"
          >
            Create First Resource
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {resources.map((res) => (
            <div
              key={res.id}
              className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{res.name}</h3>
                    <div className="font-mono text-xs text-indigo-400 mt-0.5">
                      /api/v1/data/{res.slug}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Published
                  </span>
                </div>

                {res.description && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{res.description}</p>
                )}

                {/* Field Tags */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
                    Schema Fields ({res.fields.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {res.fields.map((f, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-300 font-mono"
                      >
                        {f.name} <span className="text-indigo-400">:{f.type}</span>
                        {f.required && <span className="text-rose-400 ml-0.5">*</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                <Link
                  to={`/data/${res.slug}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 text-xs font-medium border border-indigo-500/30 transition-colors"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Browse Data</span>
                </Link>

                <button
                  onClick={() => handlePromote(res.id)}
                  title="Promote to TypeScript Drizzle Code"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
                >
                  <Code2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Promote</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE RESOURCE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Define New Dynamic Resource</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Resource Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Customer, Invoice, Project"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slug) {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    API Slug
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. customers"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Optional description of this resource"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Dynamic Fields List */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Fields Specification
                  </label>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Field</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {fields.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800"
                    >
                      <input
                        type="text"
                        required
                        placeholder="field_name"
                        value={f.name}
                        onChange={(e) => handleFieldChange(idx, "name", e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white placeholder-slate-500 font-mono"
                      />
                      <select
                        value={f.type}
                        onChange={(e) => handleFieldChange(idx, "type", e.target.value as any)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                      >
                        <option value="text">text</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="date">date</option>
                        <option value="json">json</option>
                      </select>
                      <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={f.required || false}
                          onChange={(e) => handleFieldChange(idx, "required", e.target.checked)}
                          className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                        />
                        <span>Required</span>
                      </label>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveField(idx)}
                          className="text-slate-400 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md disabled:opacity-50"
                >
                  {saving ? "Publishing..." : "Publish Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROMOTE TO CODE MODAL */}
      {promoteData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-amber-400" />
                  <span>Promote Resource: {promoteData.resource}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Static TypeScript schema generated. Copy directly into your code-owned module.
                </p>
              </div>
              <button
                onClick={() => setPromoteData(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  Destination File
                </label>
                <div className="font-mono text-xs text-indigo-400 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5">
                  backend/{promoteData.destinationHint}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] uppercase font-semibold text-slate-400">
                    Generated TypeScript Drizzle Schema
                  </label>
                  <button
                    onClick={() => copyToClipboard(promoteData.generatedSchema)}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied!" : "Copy Code"}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed max-h-72">
                  {promoteData.generatedSchema}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setPromoteData(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium"
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
