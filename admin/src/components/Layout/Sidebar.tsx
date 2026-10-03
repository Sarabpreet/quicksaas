import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Layers,
  Database,
  Building2,
  Users,
  Key,
  FileText,
  Mail,
  Activity,
  Webhook,
  Sliders,
  Flag,
  LogOut,
  Shield,
  ChevronDown,
  Archive,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", path: "/", icon: LayoutDashboard },
    ],
  },
  {
    title: "API Studio",
    items: [
      { name: "Resource Definitions", path: "/resources", icon: Layers },
      { name: "Dynamic Entities", path: "/data", icon: Database },
    ],
  },
  {
    title: "Tenants & Access",
    items: [
      { name: "Organizations", path: "/organizations", icon: Building2 },
      { name: "Users Directory", path: "/users", icon: Users },
      { name: "API Keys", path: "/api-keys", icon: Key },
    ],
  },
  {
    title: "Platform Operations",
    items: [
      { name: "Audit Trail", path: "/audit-logs", icon: FileText },
      { name: "Background Jobs", path: "/jobs", icon: Activity },
      { name: "Webhooks Dispatcher", path: "/webhooks", icon: Webhook },
      { name: "Transactional Email", path: "/email", icon: Mail },
      { name: "Feature Flags", path: "/feature-flags", icon: Flag },
      { name: "Disaster Recovery", path: "/backups", icon: Archive },
      { name: "Settings", path: "/settings", icon: Sliders },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { user, organizations, activeOrgId, switchOrganization, logout } = useAuth();

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
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Admin
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">Kernel v1.0</div>
          </div>
        </div>
      </div>

      {/* Organization Switcher */}
      {organizations.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/40">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
            Active Tenant
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
        {navSections.map((sec) => (
          <div key={sec.title}>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 px-3 mb-2">
              {sec.title}
            </div>
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-indigo-400 shrink-0 border border-slate-700">
              {user?.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-200 truncate flex items-center gap-1">
                {user?.name || user?.email}
                {user?.isSuperadmin && (
                  <span title="Superadmin">
                    <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
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
