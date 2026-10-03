import React, { useEffect, useState } from "react";
import { Users as UsersIcon, Shield, Search } from "lucide-react";
import { apiRequest } from "../lib/api.js";

interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  isSuperadmin: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export const Users: React.FC = () => {
  const [userList, setUserList] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const data = await apiRequest<UserRecord[]>("/api/v1/admin/users");
        setUserList(data);
      } catch {
        setUserList([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filtered = userList.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-emerald-400" />
            <span>Users Directory</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Global view of registered users across all tenant organizations.
          </p>
        </div>

        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-mono">
          Loading users directory...
        </div>
      ) : (
        <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role / Scope</th>
                <th className="py-3 px-4">Verified</th>
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-200">{u.name || "Unnamed"}</div>
                    <div className="text-[11px] text-slate-400">{u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    {u.isSuperadmin ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Shield className="w-3 h-3" />
                        Superadmin
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        Tenant User
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        u.emailVerifiedAt
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {u.emailVerifiedAt ? "YES" : "NO"}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-indigo-400 text-[11px]">
                    {u.id.substring(0, 8)}...
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
