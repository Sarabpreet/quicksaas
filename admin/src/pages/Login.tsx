import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setLoading(true);
    try {
      await login(demoEmail, demoPass);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Quick login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-xl bg-indigo-600 items-center justify-center font-bold text-xl text-white shadow-xl shadow-indigo-500/25 mb-3">
            QS
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">QuickSaaS Admin Portal</h1>
          <p className="text-xs text-slate-400 mt-1">
            Headless Kernel Operations, API Studio & System Management
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-indigo-600/25 disabled:opacity-50"
            >
              <span>{loading ? "Authenticating..." : "Sign In to Admin"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Demo Accounts</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("superadmin@quicksaas.dev", "AdminPass123!")}
                className="w-full text-left p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>Superadmin Account</span>
                  </div>
                  <div className="text-[11px] text-slate-400">superadmin@quicksaas.dev</div>
                </div>
                <span className="text-[10px] text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                  Login &rarr;
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("founder@startup.io", "StartupPass123!")}
                className="w-full text-left p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-medium text-slate-200">
                    Startup Founder (Owner)
                  </div>
                  <div className="text-[11px] text-slate-400">founder@startup.io</div>
                </div>
                <span className="text-[10px] text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                  Login &rarr;
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("viewer@startup.io", "ViewerPass123!")}
                className="w-full text-left p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-medium text-slate-200">
                    Team Member (Viewer)
                  </div>
                  <div className="text-[11px] text-slate-400">viewer@startup.io</div>
                </div>
                <span className="text-[10px] text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                  Login &rarr;
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
