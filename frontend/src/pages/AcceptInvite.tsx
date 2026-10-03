import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Mail, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { apiRequest } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.js";

export const AcceptInvite: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { user, refreshUser, switchOrganization } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ organizationId: string }>(
        `/api/v1/organizations/invites/${token}/accept`,
        { method: "POST" }
      );
      setSuccess(true);
      await refreshUser();
      setTimeout(() => {
        switchOrganization(res.organizationId);
        navigate("/");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl text-center">
        <div className="inline-flex h-12 w-12 rounded-full bg-indigo-600/20 text-indigo-400 items-center justify-center mb-4">
          <Mail className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight">Team Workspace Invitation</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          You have been invited to join a team workspace on QuickSaaS.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>Successfully joined! Redirecting to workspace...</span>
          </div>
        ) : user ? (
          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-indigo-600/25 disabled:opacity-50"
          >
            <span>{loading ? "Accepting..." : "Accept Invitation & Join"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Please sign in or create an account to accept this invitation.
            </p>
            <Link
              to="/login"
              className="w-full block py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
            >
              Sign In First
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
