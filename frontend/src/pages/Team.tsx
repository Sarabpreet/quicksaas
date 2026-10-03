import React, { useEffect, useState } from "react";
import { Users, UserPlus, Mail, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { apiRequest } from "../lib/api.js";

interface Member {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export const Team: React.FC = () => {
  const { activeOrgId, activeOrg } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const fetchMembers = async () => {
    if (!activeOrgId) return;
    setLoading(true);
    try {
      const data = await apiRequest<Member[]>(`/api/v1/organizations/${activeOrgId}/members`);
      setMembers(data || []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeOrgId]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) return;
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await apiRequest<{ invite: { token: string } }>(
        `/api/v1/organizations/${activeOrgId}/invites`,
        {
          method: "POST",
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        }
      );
      setInviteResult(
        `Invite link generated! Direct link: ${window.location.origin}/invite/${res.invite.token}`
      );
      setInviteEmail("");
    } catch (err: any) {
      alert("Failed to invite: " + err.message);
    } finally {
      setInviting(false);
    }
  };

  const isOwnerOrAdmin = activeOrg?.role === "owner" || activeOrg?.role === "admin";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Team Members</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage collaborators in <strong className="text-white">{activeOrg?.organizationName}</strong>.
          </p>
        </div>

        {isOwnerOrAdmin && (
          <button
            onClick={() => {
              setInviteResult(null);
              setShowInviteModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Team Member</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-mono">
          Loading team members...
        </div>
      ) : (
        <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Joined At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-200">{m.user.name || m.user.email}</div>
                    <div className="text-[11px] text-slate-400">{m.user.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-400">
                      {m.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* INVITE MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                <span>Invite Colleague</span>
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteResult ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono break-all leading-relaxed">
                  {inviteResult}
                </div>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="w-full py-2 rounded-lg bg-slate-800 text-white text-xs font-medium"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="member">Member (CRUD dynamic records, upload files)</option>
                    <option value="admin">Admin (Manage members, API keys)</option>
                    <option value="viewer">Viewer (Read-only)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md disabled:opacity-50"
                  >
                    {inviting ? "Creating Invite..." : "Send Invitation"}
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
