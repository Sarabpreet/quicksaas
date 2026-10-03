import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Database,
  Plus,
  Search,
  Trash2,
  Edit2,
  AlertCircle,
  X,
  ArrowUpDown,
  Layers,
} from "lucide-react";
import { apiRequest } from "../lib/api.js";

interface FieldDef {
  name: string;
  type: string;
  required?: boolean;
}

interface ResourceMeta {
  id: string;
  name: string;
  slug: string;
  fields: FieldDef[];
}

export const DynamicData: React.FC = () => {
  const { resourceSlug } = useParams<{ resourceSlug?: string }>();
  const [resources, setResources] = useState<ResourceMeta[]>([]);
  const [currentResource, setCurrentResource] = useState<ResourceMeta | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // Load all resource definitions first
  useEffect(() => {
    const loadDefs = async () => {
      try {
        const defs = await apiRequest<ResourceMeta[]>("/api/v1/resources");
        setResources(defs);
        if (resourceSlug) {
          const match = defs.find((d) => d.slug === resourceSlug);
          setCurrentResource(match || null);
        } else if (defs.length > 0) {
          setCurrentResource(defs[0]);
        }
      } catch (err: any) {
        setError(err.message);
      }
    };
    loadDefs();
  }, [resourceSlug]);

  // Load dynamic records when active resource changes
  const fetchRecords = async () => {
    if (!currentResource) return;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        sort: sortOrder,
        ...(search ? { search } : {}),
      });
      const res = await apiRequest<{ data: any[] }>(
        `/api/v1/data/${currentResource.slug}?${q.toString()}`
      );
      setRecords(res.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentResource) {
      fetchRecords();
    }
  }, [currentResource, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  const handleOpenCreate = () => {
    setEditingRecord(null);
    const initial: Record<string, any> = {};
    currentResource?.fields.forEach((f) => {
      initial[f.name] = f.type === "boolean" ? false : "";
    });
    setFormData(initial);
    setShowModal(true);
  };

  const handleOpenEdit = (record: any) => {
    setEditingRecord(record);
    const initial: Record<string, any> = {};
    currentResource?.fields.forEach((f) => {
      initial[f.name] = record[f.name] ?? "";
    });
    setFormData(initial);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      await apiRequest(`/api/v1/data/${currentResource?.slug}/${id}`, {
        method: "DELETE",
      });
      await fetchRecords();
    } catch (err: any) {
      alert("Failed to delete record: " + err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentResource) return;
    setSaving(true);
    setError(null);

    try {
      if (editingRecord) {
        await apiRequest(`/api/v1/data/${currentResource.slug}/${editingRecord.id}`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });
      } else {
        await apiRequest(`/api/v1/data/${currentResource.slug}`, {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      await fetchRecords();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              <span>Dynamic Data Explorer: {currentResource?.name || "Entities"}</span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time CRUD operations over your API Studio dynamic resources.
          </p>
        </div>

        {currentResource && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create {currentResource.name}</span>
          </button>
        )}
      </div>

      {/* Resource Tabs Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {resources.map((res) => (
          <Link
            key={res.slug}
            to={`/data/${res.slug}`}
            onClick={() => setCurrentResource(res)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              currentResource?.slug === res.slug
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{res.name}</span>
          </Link>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search and Sort Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-72">
          <input
            type="text"
            placeholder="Search records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </form>

        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 hover:text-white"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
          <span>Sort: {sortOrder.toUpperCase()}</span>
        </button>
      </div>

      {/* Dynamic Data Table */}
      {!currentResource ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          No dynamic resources defined yet. Go to{" "}
          <Link to="/resources" className="text-indigo-400 underline">
            API Studio
          </Link>{" "}
          to create one.
        </div>
      ) : loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-mono">
          Loading {currentResource.name} records...
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 rounded-xl bg-slate-950 border border-slate-800 text-center">
          <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-300">No records found</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Click &ldquo;Create {currentResource.name}&rdquo; above to add your first entry.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                <tr>
                  <th className="py-3 px-4">Record ID</th>
                  {currentResource.fields.map((f) => (
                    <th key={f.name} className="py-3 px-4">
                      {f.name}
                    </th>
                  ))}
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 text-indigo-400 font-mono text-[11px]">
                      {r.id.substring(0, 8)}...
                    </td>
                    {currentResource.fields.map((f) => (
                      <td key={f.name} className="py-3 px-4 text-slate-200 font-sans text-xs">
                        {typeof r[f.name] === "boolean" ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              r[f.name]
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {r[f.name] ? "TRUE" : "FALSE"}
                          </span>
                        ) : typeof r[f.name] === "object" ? (
                          JSON.stringify(r[f.name])
                        ) : (
                          String(r[f.name] ?? "—")
                        )}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded"
                          title="Delete"
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
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && currentResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400" />
                <span>
                  {editingRecord ? "Edit" : "Create"} {currentResource.name}
                </span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {currentResource.fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {field.name}{" "}
                    {field.required && <span className="text-rose-400">*</span>}
                    <span className="text-[10px] text-slate-500 font-mono ml-1.5">
                      ({field.type})
                    </span>
                  </label>

                  {field.type === "boolean" ? (
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={Boolean(formData[field.name])}
                        onChange={(e) =>
                          setFormData({ ...formData, [field.name]: e.target.checked })
                        }
                        className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <span className="text-xs text-slate-300">Enabled / Active</span>
                    </label>
                  ) : field.type === "number" ? (
                    <input
                      type="number"
                      required={field.required}
                      value={formData[field.name] ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  ) : field.type === "date" ? (
                    <input
                      type="date"
                      required={field.required}
                      value={formData[field.name] ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.name]: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  ) : (
                    <input
                      type="text"
                      required={field.required}
                      value={formData[field.name] ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.name]: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  )}
                </div>
              ))}

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
