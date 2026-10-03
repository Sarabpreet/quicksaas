import React, { useEffect, useState } from "react";
import { Webhook, Plus, Send, Trash2, Eye, X, CheckCircle, AlertTriangle } from "lucide-react";
import { apiRequest } from "../lib/api.js";

interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

interface Delivery {
  id: string;
  event: string;
  responseStatus: number | null;
  status: string;
  createdAt: string;
}

export const Webhooks: React.FC = () => {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Register Modal
  const [showRegister, setShowRegister] = useState(false);
  const [url, setUrl] = useState("");
  const [registering, setRegistering] = useState(false);

  // Deliveries Drawer
  const [selectedEndpoint, setSelectedEndpoint] = useState<WebhookEndpoint | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  const fetchEndpoints = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<WebhookEndpoint[]>("/api/v1/webhooks");
      setEndpoints(data);
    } catch {
      setEndpoints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    try {
      await apiRequest("/api/v1/webhooks", {
        method: "POST",
        body: JSON.stringify({ url, events: ["*"] }),
      });
      setShowRegister(false);
      setUrl("");
      await fetchEndpoints();
    } catch (err: any) {
      alert("Failed to register webhook: " + err.message);
    } finally {
      setRegistering(false);
    }
  };

  const handleTestPing = async (id: string) => {
    try {
      const res = await apiRequest(`/api/v1/webhooks/${id}/test`, { method: "POST" });
      alert(`Test ping dispatched successfully!\nHMAC Signature: ${res.signature}`);
      if (selectedEndpoint?.id === id) {
        openDeliveries(selectedEndpoint);
      }
    } catch (err: any) {
      alert("Failed to send ping: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this webhook subscription?")) return;
    try {
      await apiRequest(`/api/v1/webhooks/${id}`, { method: "DELETE" });
      await fetchEndpoints();
    } catch (err: any) {
      alert("Failed to delete webhook: " + err.message);
    }
  };

  const openDeliveries = async (ep: WebhookEndpoint) => {
    setSelectedEndpoint(ep);
    setLoadingDeliveries(true);
    try {
      const list = await apiRequest<Delivery[]>(`/api/v1/webhooks/${ep.id}/deliveries`);
      setDeliveries(list);
    } catch {
      setDeliveries([]);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Webhook className="w-5 h-5 text-indigo-400" />
            <span>Webhooks Dispatcher</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dispatch signed HMAC-SHA256 event payloads to third-party endpoints and inspect deliveries.
          </p>
        </div>

        <button
          onClick={() => setShowRegister(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Endpoint</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-mono">
          Loading webhook endpoints...
        </div>
      ) : endpoints.length === 0 ? (
        <div className="p-12 rounded-xl bg-slate-950 border border-slate-800 text-center">
          <Webhook className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-300">No webhooks registered</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Click &ldquo;New Endpoint&rdquo; to register an external webhook URL.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {endpoints.map((ep) => (
            <div
              key={ep.id}
              className="p-5 rounded-xl bg-slate-950 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-white truncate">{ep.url}</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                  <span>Secret: {ep.secret.substring(0, 14)}••••••••</span>
                  <span>•</span>
                  <span>Events: {JSON.stringify(ep.events)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleTestPing(ep.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Ping</span>
                </button>
                <button
                  onClick={() => openDeliveries(ep)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Deliveries</span>
                </button>
                <button
                  onClick={() => handleDelete(ep.id)}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REGISTER MODAL */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Webhook className="w-4 h-4 text-indigo-400" />
                <span>Register Webhook Endpoint</span>
              </h3>
              <button onClick={() => setShowRegister(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Endpoint URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://api.external.com/webhooks"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md disabled:opacity-50"
                >
                  {registering ? "Registering..." : "Save Endpoint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELIVERIES DRAWER / MODAL */}
      {selectedEndpoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Delivery History</h3>
                <div className="text-[11px] text-slate-400 font-mono truncate max-w-sm">
                  {selectedEndpoint.url}
                </div>
              </div>
              <button
                onClick={() => setSelectedEndpoint(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2">
              {loadingDeliveries ? (
                <div className="p-8 text-center text-xs font-mono text-slate-500">
                  Loading deliveries...
                </div>
              ) : deliveries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No delivery attempts yet.
                </div>
              ) : (
                deliveries.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono text-white font-medium">{d.event}</div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(d.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-400">
                        HTTP {d.responseStatus || 200}
                      </span>
                      {d.status === "success" ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
