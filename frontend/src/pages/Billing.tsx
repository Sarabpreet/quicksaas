import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CreditCard,
  Check,
  Zap,
  Shield,
  Layers,
  Users,
  FolderOpen,
  Key,
  ExternalLink,
  ArrowRight,
  Clock,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { apiRequest } from "../lib/api.js";

interface PlanConfig {
  id: "free" | "pro" | "enterprise";
  name: string;
  description: string;
  priceMonthly: number;
  stripePriceId: string;
  maxMembers: number;
  maxResources: number;
  maxStorageBytes: number;
  maxApiKeys: number;
  features: string[];
}

interface SubscriptionData {
  subscription: {
    id: string;
    plan: string;
    status: string;
    stripeCustomerId: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  plan: PlanConfig;
  usage: {
    membersCount: number;
    resourcesCount: number;
    storageBytes: number;
    apiKeysCount: number;
  };
  limits: {
    maxMembers: number;
    maxResources: number;
    maxStorageBytes: number;
    maxApiKeys: number;
  };
  recentInvoices: Array<{
    id: string;
    amountPaid: number;
    currency: string;
    status: string;
    createdAt: string;
    invoicePdf?: string | null;
  }>;
}

export const Billing: React.FC = () => {
  const { activeOrg } = useAuth();
  const [searchParams] = useSearchParams();
  const [billingData, setBillingData] = useState<SubscriptionData | null>(null);
  const [allPlans, setAllPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sessionId = searchParams.get("session_id");
  const isCanceled = searchParams.get("canceled");

  const isOwnerOrAdmin = activeOrg?.role === "owner" || activeOrg?.role === "admin";

  const fetchBillingInfo = async () => {
    setLoading(true);
    try {
      const [subRes, plansRes] = await Promise.all([
        apiRequest<SubscriptionData>("/api/v1/billing/subscription"),
        apiRequest<{ plans: PlanConfig[] }>("/api/v1/billing/plans"),
      ]);
      setBillingData(subRes);
      setAllPlans(plansRes.plans || []);
    } catch (err: any) {
      console.error("Failed to load billing details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const handleUpgrade = async (planId: string) => {
    if (!isOwnerOrAdmin) return;
    setUpgrading(planId);
    setMessage(null);
    try {
      // Initiate checkout session
      const res = await apiRequest<{ checkoutUrl: string; mode: string }>(
        "/api/v1/billing/checkout",
        {
          method: "POST",
          body: JSON.stringify({ plan: planId }),
        }
      );

      if (res.mode === "simulated") {
        // Automatically perform instant simulated upgrade for dev/test
        await apiRequest("/api/v1/billing/simulate-upgrade", {
          method: "POST",
          body: JSON.stringify({ plan: planId }),
        });
        setMessage(`Successfully upgraded workspace to ${planId.toUpperCase()}!`);
        await fetchBillingInfo();
      } else if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    } catch (err: any) {
      alert("Failed to initiate upgrade: " + err.message);
    } finally {
      setUpgrading(null);
    }
  };

  const handleOpenPortal = async () => {
    if (!isOwnerOrAdmin) return;
    setPortalLoading(true);
    try {
      const res = await apiRequest<{ url: string; mode: string }>("/api/v1/billing/portal", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (res.mode === "simulated") {
        alert("Simulated Customer Billing Portal: Card and tax settings are managed by Stripe.");
      } else if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      alert("Portal error: " + err.message);
    } finally {
      setPortalLoading(false);
    }
  };

  const formatStorage = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <span>Billing & Subscription Plans</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage your workspace subscription tier, resource capacity limits, and Stripe payment methods.
          </p>
        </div>

        {isOwnerOrAdmin && (
          <button
            onClick={handleOpenPortal}
            disabled={portalLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{portalLoading ? "Loading Portal..." : "Stripe Customer Portal"}</span>
          </button>
        )}
      </div>

      {sessionId && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-3">
          <Sparkles className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-semibold">Checkout Completed!</div>
            <div className="text-[11px] text-emerald-300/80">Your subscription has been upgraded. All capacity limits have been updated instantly.</div>
          </div>
        </div>
      )}

      {isCanceled && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Checkout session was canceled. Your current plan remains active without changes.</span>
        </div>
      )}

      {message && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-3">
          <Check className="w-5 h-5 text-indigo-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Active Subscription Summary */}
      {loading || !billingData ? (
        <div className="p-12 text-center text-slate-400 text-xs font-mono">
          Loading subscription details...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Current Workspace Plan
                </span>
                <h3 className="text-2xl font-bold text-white tracking-tight mt-1">
                  {billingData.plan.name}
                </h3>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {billingData.subscription.status}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="text-3xl font-extrabold text-white font-mono">
                ${billingData.plan.priceMonthly}
                <span className="text-xs text-slate-400 font-normal font-sans"> / month</span>
              </div>
              {billingData.subscription.currentPeriodEnd && (
                <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    Renews on {new Date(billingData.subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Usage Meters */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Capacity & Resource Entitlements
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Team Members */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Team Collaborators</span>
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {billingData.usage.membersCount} /{" "}
                    {billingData.limits.maxMembers === -1 ? "Unlimited" : billingData.limits.maxMembers}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{
                      width:
                        billingData.limits.maxMembers === -1
                          ? "20%"
                          : `${Math.min(100, (billingData.usage.membersCount / billingData.limits.maxMembers) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Dynamic Collections */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>Data Collections</span>
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {billingData.usage.resourcesCount} /{" "}
                    {billingData.limits.maxResources === -1 ? "Unlimited" : billingData.limits.maxResources}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full"
                    style={{
                      width:
                        billingData.limits.maxResources === -1
                          ? "25%"
                          : `${Math.min(100, (billingData.usage.resourcesCount / billingData.limits.maxResources) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* File Storage */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                    <span>File Storage</span>
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {formatStorage(billingData.usage.storageBytes)} /{" "}
                    {formatStorage(billingData.limits.maxStorageBytes)}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (billingData.usage.storageBytes / billingData.limits.maxStorageBytes) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Developer Keys */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Developer API Keys</span>
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {billingData.usage.apiKeysCount} /{" "}
                    {billingData.limits.maxApiKeys === -1 ? "Unlimited" : billingData.limits.maxApiKeys}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{
                      width:
                        billingData.limits.maxApiKeys === -1
                          ? "15%"
                          : `${Math.min(100, (billingData.usage.apiKeysCount / billingData.limits.maxApiKeys) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Tiers Grid */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Available Subscription Plans</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Upgrade your plan to unlock more dynamic resources, team collaborators, and high-throughput background queues.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {allPlans.map((p) => {
            const isCurrent = billingData?.plan.id === p.id;
            return (
              <div
                key={p.id}
                className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? "bg-slate-950 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-bold text-white tracking-tight">{p.name}</h4>
                    {isCurrent && (
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        Current Plan
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 min-h-[32px]">{p.description}</p>

                  <div className="my-5 pb-5 border-b border-slate-800">
                    <div className="text-3xl font-extrabold text-white font-mono">
                      ${p.priceMonthly}
                      <span className="text-xs text-slate-400 font-normal font-sans"> / month</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {p.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400 cursor-default"
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(p.id)}
                      disabled={!isOwnerOrAdmin || upgrading === p.id}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                    >
                      <span>{upgrading === p.id ? "Processing..." : `Upgrade to ${p.name}`}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice History */}
      {billingData && billingData.recentInvoices.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white tracking-tight">Payment & Invoice History</h3>
          <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                <tr>
                  <th className="py-3 px-4">Invoice Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
                {billingData.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 text-slate-300">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-white">
                      ${(inv.amountPaid / 100).toFixed(2)} {inv.currency.toUpperCase()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {inv.invoicePdf ? (
                        <a
                          href={inv.invoicePdf}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
                        >
                          <span>PDF</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
