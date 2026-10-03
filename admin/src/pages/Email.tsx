import React, { useEffect, useState } from "react";
import { Mail, Plus, Send, Eye, X, CheckCircle } from "lucide-react";
import { apiRequest } from "../lib/api.js";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
}

interface EmailLog {
  id: string;
  toAddress: string;
  templateName: string;
  subject: string;
  status: string;
  createdAt: string;
}

export const Email: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Preview Modal
  const [previewData, setPreviewData] = useState<{
    subject: string;
    html: string;
    template: string;
  } | null>(null);

  // Send Test Modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState<EmailTemplate | null>(null);
  const [targetEmail, setTargetEmail] = useState("");
  const [varJson, setVarJson] = useState('{\n  "name": "Jane Doe"\n}');
  const [sending, setSending] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tpls, emailLogs] = await Promise.all([
        apiRequest<EmailTemplate[]>("/api/v1/email/templates"),
        apiRequest<EmailLog[]>("/api/v1/email/logs"),
      ]);
      setTemplates(tpls);
      setLogs(emailLogs);
    } catch {
      setTemplates([]);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePreview = async (tpl: EmailTemplate) => {
    try {
      const vars: Record<string, any> = {};
      tpl.variables.forEach((v) => (vars[v] = `[${v}_sample]`));
      const res = await apiRequest("/api/v1/email/preview", {
        method: "POST",
        body: JSON.stringify({ templateName: tpl.name, variables: vars }),
      });
      setPreviewData({
        subject: res.renderedSubject,
        html: res.renderedHtml,
        template: tpl.name,
      });
    } catch (err: any) {
      alert("Failed to render preview: " + err.message);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTpl) return;
    setSending(true);
    try {
      let variables = {};
      try {
        variables = JSON.parse(varJson);
      } catch {
        alert("Invalid JSON in variables");
        return;
      }
      await apiRequest("/api/v1/email/send", {
        method: "POST",
        body: JSON.stringify({
          to: targetEmail,
          templateName: selectedTpl.name,
          variables,
        }),
      });
      alert("Test email dispatched and logged!");
      setShowSendModal(false);
      setTargetEmail("");
      await fetchData();
    } catch (err: any) {
      alert("Failed to send: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-400" />
          <span>Transactional Email Studio</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage reusable templates, preview dynamic variable interpolation, and monitor delivery logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Templates List */}
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-5 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Available Templates ({templates.length})
          </div>

          <div className="space-y-3">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-white font-mono">{tpl.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                    Subject: {tpl.subject}
                  </div>
                  <div className="flex gap-1 mt-2">
                    {tpl.variables.map((v) => (
                      <span
                        key={v}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-400 font-mono"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(tpl)}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTpl(tpl);
                      setShowSendModal(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 text-xs font-medium"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Logs */}
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-5 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Recent Delivery Logs ({logs.length})
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No emails sent yet.</div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-medium text-white">{log.toAddress}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Template: {log.templateName || "custom"} • {new Date(log.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle className="w-3 h-3" />
                    SENT
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Preview: {previewData.template}</h3>
                <div className="text-xs text-indigo-400 font-mono mt-0.5">
                  Subject: {previewData.subject}
                </div>
              </div>
              <button onClick={() => setPreviewData(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white text-slate-900 p-5 rounded-lg border border-slate-800 shadow-inner">
              <div dangerouslySetInnerHTML={{ __html: previewData.html }} />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setPreviewData(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-medium"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEND TEST MODAL */}
      {showSendModal && selectedTpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-400" />
                <span>Send Test: {selectedTpl.name}</span>
              </h3>
              <button onClick={() => setShowSendModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendTest} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="test@example.com"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Variables (JSON)
                </label>
                <textarea
                  rows={4}
                  value={varJson}
                  onChange={(e) => setVarJson(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Dispatch Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
