import React, { useEffect, useState } from "react";
import { Building2, Plus, Users, UserPlus, X, Mail } from "lucide-react";
import { apiRequest } from "../lib/api.js";

interface Org {
  id: string;
  name: string;
  slug: string;
  role?: string;
  createdAt: string;
}

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

export const Organizations: React.FC = () => {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  // Create Org Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Org[]>("/api/v1/organizations");
      setOrgs(data);
      if (data.length > 0 && !selectedOrg) {
        setSelectedOrg(data[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      const fetchMembers = async () => {
        setLoadingMembers(true);
        try {
          const list = await apiRequest<Member[]>(
            `/api/v1/organizations/${selectedOrg.id}/members`
          );
          setMembers(list);
        } catch {
          setMembers([]);
        } finally {
          setLoadingMembers(false);
        }
      };
      fetchMembers();
    }
  }, [selectedOrg]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await apiRequest<{ invite: { token: string } }>(
        `/api/v1/organizations/${selectedOrg.id}/invites`,
        {
          method: "POST",
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        }
      );
      setInviteResult(
        `Invite token created: ${res.invite.token} (Share this token with the user)`
      );
      setInviteEmail("");
    } catch (err: any) {
      alert("Failed to create invite: " + err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiRequest("/api/v1/organizations", {
        method: "POST",
        body: JSON.stringify({ name: newOrgName }),
      });
      setShowCreateModal(false);
      setNewOrgName("");
      await fetchOrgs();
    } catch (err: any) {
      alert("Failed to create org: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <span>Organizations & Teams</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage multi-tenant organizations, team member roles, and secure invite tokens.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Organization</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organizations List */}
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">
            Your Organizations ({orgs.length})
          </div>

          <div className="space-y-2">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org)}
                className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                  selectedOrg?.id === org.id
                    ? "bg-indigo-600/15 border-indigo-500/30 text-white"
                    : "bg-slate-900 border-slate-800/80 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="text-xs font-semibold">{org.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{org.slug}</div>
                </div>
                {org.role && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                    {org.role}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Org Members Detail */}
        <div className="lg:col-span-2 rounded-xl bg-slate-950 border border-slate-800 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {selectedOrg?.name || "Organization"}
                </h3>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  ID: {selectedOrg?.id}
                </div>
              </div>

              <button
                onClick={() => {
                  setInviteResult(null);
                  setShowInviteModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite Member</span>
              </button>
            </div>

            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Team Members ({members.length})</span>
            </div>

            {loadingMembers ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                Loading members...
              </div>
            ) : members.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No members found.</div>
            ) : (
              <div className="divide-y divide-slate-800/80 font-sans">
                {members.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-200">
                        {m.user.name || m.user.email}
                      </div>
                      <div className="text-[11px] text-slate-400">{m.user.email}</div>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-400">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* INVITE MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                <span>Invite to {selectedOrg?.name}</span>
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
                    placeholder="colleague@example.com"
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
                    <option value="admin">Admin (manage members, API studio, keys)</option>
                    <option value="member">Member (CRUD dynamic data, upload files)</option>
                    <option value="viewer">Viewer (Read-only access)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md disabled:opacity-50"
                  >
                    {inviting ? "Creating Invite..." : "Generate Invite Token"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CREATE ORG MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>Create New Organization</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme International"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Organization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
