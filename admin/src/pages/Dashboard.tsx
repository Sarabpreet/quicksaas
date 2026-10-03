import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  Database,
  Activity,
  Layers,
  ShieldAlert,
  ArrowUpRight,
  Server,
  Zap,
} from "lucide-react";
import { apiRequest } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.js";

interface Stats {
  totalUsers: number;
  totalOrganizations: number;
  totalDynamicRecords: number;
  totalBackgroundJobs: number;
  status: string;
}

export const Dashboard: React.FC = () => {
  const { user, activeOrg } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.isSuperadmin) {
          const data = await apiRequest<Stats>("/api/v1/admin/stats");
          setStats(data);
        } else {
          // Non-superadmin fallback stats
          const orgs = await apiRequest<any[]>("/api/v1/organizations");
          const resources = await apiRequest<any[]>("/api/v1/resources");
          setStats({
            totalUsers: 1,
            totalOrganizations: orgs.length,
            totalDynamicRecords: resources.length,
            totalBackgroundJobs: 0,
            status: "operational",
          });
        }
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-900 border border-indigo-500/20 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Welcome back, {user?.name || "Operator"}
            </h2>
            {user?.isSuperadmin && (
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Superadmin
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Active Tenant: <strong className="text-indigo-400">{activeOrg?.organizationName || "None selected"}</strong> • Role: <span className="font-mono text-slate-400">{activeOrg?.role || "superadmin"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/resources"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Layers className="w-4 h-4" />
            <span>Open API Studio</span>
          </Link>
          <Link
            to="/jobs"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            <Activity className="w-4 h-4" />
            <span>Jobs Console</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Tenant Organizations</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {loading ? "..." : stats?.totalOrganizations || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Multi-tenant isolated</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Platform Users</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {loading ? "..." : stats?.totalUsers || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">RBAC authenticated</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Dynamic Entities</span>
            <Database className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {loading ? "..." : stats?.totalDynamicRecords || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">API Studio runtime</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Background Jobs</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {loading ? "..." : stats?.totalBackgroundJobs || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Redis backed worker</div>
        </div>
      </div>

      {/* Architecture & Quick Access Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Architecture Map */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-slate-950 border border-slate-800">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <span>Kernel Runtime Architecture</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Copy-first, headless SaaS platform where the backend is the single business boundary and Admin is a decoupled client.
          </p>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto">
            <div className="text-indigo-400">frontend / admin / mobile / third-party</div>
            <div className="text-slate-500 pl-14">|</div>
            <div className="text-emerald-400 pl-11">REST API (OpenAPI 3.0)</div>
            <div className="text-slate-500 pl-14">|</div>
            <div className="text-amber-400 pl-11">Fastify Backend Engine</div>
            <div className="text-slate-500 pl-6">/            |            \</div>
            <div className="text-slate-300">
              <span className="text-cyan-400">PostgreSQL (PGlite)</span>{" "}
              <span className="text-rose-400">Redis (Queues)</span>{" "}
              <span className="text-yellow-400">Storage (Files)</span>
            </div>
            <div className="text-slate-500 pl-14">|</div>
            <div className="text-purple-400 pl-10">Worker Processes</div>
          </div>
        </div>

        {/* Quick Launchpad */}
        <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Quick Launchpad</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Direct access to system management and developer studios.
            </p>

            <div className="space-y-2">
              <Link
                to="/resources"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Define New Dynamic Resource</span>
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/audit-logs"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Inspect Audit Logs</span>
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/feature-flags"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Toggle Feature Flags</span>
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
            Postgres storage: <span className="font-mono text-slate-300">backend/.data/postgres</span>
          </div>
        </div>
      </div>
    </div>
  );
};
