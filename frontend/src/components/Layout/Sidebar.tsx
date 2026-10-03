import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Database,
  FolderOpen,
  Users,
  Key,
  CreditCard,
  Settings,
  LogOut,
  ChevronDown,
  Layers,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { apiRequest } from "../../lib/api.js";

interface ResourceDef {
  id: string;
  name: string;
  slug: string;
}

export const Sidebar: React.FC = () => {
  const { user, organizations, activeOrgId, activeOrg, switchOrganization, logout } = useAuth();
  const [resources, setResources] = useState<ResourceDef[]>([]);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const data = await apiRequest<ResourceDef[]>("/api/v1/resources");
        setResources(data || []);
      } catch {
        setResources([]);
      }
    };
    if (activeOrgId) {
      fetchResources();
    }
  }, [activeOrgId]);

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            QS
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
              QuickSaaS
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                App
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Customer Workspace</div>
          </div>
        </div>
      </div>

      {/* Organization Switcher */}
      {organizations.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/40">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
            Current Workspace
          </label>
          <div className="relative">
            <select
              value={activeOrgId || ""}
              onChange={(e) => switchOrganization(e.target.value)}
              className="w-full bg-slate-800 text-xs font-medium text-slate-200 border border-slate-700 rounded-md px-2.5 py-1.5 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {organizations.map((org) => (
                <option key={org.organizationId} value={org.organizationId}>
                  {org.organizationName} ({org.role})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 px-3 mb-2">
            Main Menu
          </div>
          <div className="space-y-0.5">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Workspace Dashboard</span>
            </NavLink>

            <NavLink
              to="/files"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`
              }
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span>Files & Storage</span>
            </NavLink>
          </div>
        </div>

        {/* Dynamic Entities in Customer Workspace */}
        {resources.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 px-3 mb-2 flex items-center justify-between">
              <span>Data Collections</span>
              <span className="text-[10px] text-indigo-400 font-mono">{resources.length}</span>
            </div>
            <div className="space-y-0.5">
              {resources.map((res) => (
                <NavLink
                  key={res.slug}
                  to={`/workspace/${res.slug}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`
                  }
                >
                  <Database className="w-4 h-4 shrink-0 text-indigo-400" />
                  <span className="truncate">{res.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 px-3 mb-2">
            Settings & Access
          </div>
          <div className="space-y-0.5">
            <NavLink
              to="/settings/team"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`
              }
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Team Members</span>
            </NavLink>

            <NavLink
              to="/settings/api-keys"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`
              }
            >
              <Key className="w-4 h-4 shrink-0" />
              <span>Developer API Keys</span>
            </NavLink>

            <NavLink
              to="/settings/billing"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`
              }
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>Billing & Plans</span>
            </NavLink>

            <NavLink
              to="/settings/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`
              }
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Account Settings</span>
            </NavLink>
          </div>
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-emerald-400 shrink-0 border border-slate-700">
              {user?.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-200 truncate">
                {user?.name || user?.email}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Role: <span className="font-mono text-indigo-400">{activeOrg?.role || "member"}</span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
