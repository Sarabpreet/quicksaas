import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Database,
  FolderOpen,
  Key,
  Plus,
  ArrowUpRight,
  Shield,
  Layers,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { apiRequest } from "../lib/api.js";

interface WorkspaceMetrics {
  membersCount: number;
  resourcesCount: number;
  filesCount: number;
  apiKeysCount: number;
}

export const Dashboard: React.FC = () => {
  const { user, activeOrg, activeOrgId } = useAuth();
  const [metrics, setMetrics] = useState<WorkspaceMetrics>({
    membersCount: 1,
    resourcesCount: 0,
    filesCount: 0,
    apiKeysCount: 0,
  });
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWorkspaceData = async () => {
      if (!activeOrgId) return;
      setLoading(true);
      try {
        const [membersRes, resDefs, filesRes, keysRes] = await Promise.all([
          apiRequest<any[]>(`/api/v1/organizations/${activeOrgId}/members`).catch(() => []),
          apiRequest<any[]>("/api/v1/resources").catch(() => []),
          apiRequest<any[]>("/api/v1/files").catch(() => []),
          apiRequest<any[]>("/api/v1/api-keys").catch(() => []),
        ]);

        setResources(resDefs || []);
        setMetrics({
          membersCount: membersRes.length || 1,
          resourcesCount: resDefs.length || 0,
          filesCount: filesRes.length || 0,
          apiKeysCount: keysRes.length || 0,
        });
      } finally {
        setLoading(false);
      }
    };
    loadWorkspaceData();
  }, [activeOrgId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Workspace Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-emerald-950/20 to-slate-900 border border-indigo-500/20 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {activeOrg?.organizationName || "Your Workspace"}
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {activeOrg?.role || "Member"}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Welcome back, <strong className="text-white">{user?.name || user?.email}</strong>. Everything in this workspace is tenant-isolated and secure.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/settings/team"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Users className="w-4 h-4" />
            <span>Invite Teammate</span>
          </Link>
          <Link
            to="/files"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Files</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Team Members</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {loading ? "..." : metrics.membersCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Workspace collaborators</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Data Collections</span>
            <Database className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {loading ? "..." : metrics.resourcesCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Published schemas</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Storage Files</span>
            <FolderOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {loading ? "..." : metrics.filesCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Uploaded assets</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Developer Keys</span>
            <Key className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {loading ? "..." : metrics.apiKeysCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Machine integrations</div>
        </div>
      </div>

      {/* Published Collections Grid */}
      <div className="p-6 rounded-xl bg-slate-950 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Workspace Data Collections</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Access and manage live data collections published for this organization.
            </p>
          </div>
        </div>

        {resources.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
            No data collections published in this workspace yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((res) => (
              <Link
                key={res.slug}
                to={`/workspace/${res.slug}`}
                className="p-4 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {res.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {res.fields?.length || 0} fields defined
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
