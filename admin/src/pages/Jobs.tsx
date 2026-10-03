import React, { useEffect, useState } from "react";
import { Activity, Play, RotateCcw, Plus, CheckCircle, Clock, AlertTriangle, X } from "lucide-react";
import { apiRequest } from "../lib/api.js";

interface JobRecord {
  id: string;
  name: string;
  queueName: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  payload: any;
  createdAt: string;
  completedAt: string | null;
}

export const Jobs: React.FC = () => {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Enqueue Modal
  const [showEnqueue, setShowEnqueue] = useState(false);
  const [jobName, setJobName] = useState("send_invoice_pdf");
  const [queueName, setQueueName] = useState("default");
  const [payloadText, setPayloadText] = useState('{\n  "invoiceId": "inv_123",\n  "amount": 499\n}');
  const [enqueuing, setEnqueuing] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<JobRecord[]>("/api/v1/jobs");
      setJobs(data);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleProcessNext = async () => {
    try {
      const res = await apiRequest("/api/v1/jobs/worker/process-next", { method: "POST" });
      alert(res.message || "Processed");
      await fetchJobs();
    } catch (err: any) {
      alert("Worker error: " + err.message);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await apiRequest(`/api/v1/jobs/${id}/retry`, { method: "POST" });
      await fetchJobs();
    } catch (err: any) {
      alert("Retry failed: " + err.message);
    }
  };

  const handleEnqueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnqueuing(true);
    try {
      let payload = {};
      try {
        payload = JSON.parse(payloadText);
      } catch {
        alert("Invalid JSON payload");
        return;
      }

      await apiRequest("/api/v1/jobs/enqueue", {
        method: "POST",
        body: JSON.stringify({ name: jobName, queueName, payload }),
      });
      setShowEnqueue(false);
      await fetchJobs();
    } catch (err: any) {
      alert("Failed to enqueue job: " + err.message);
    } finally {
      setEnqueuing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3" />
            COMPLETED
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3" />
            FAILED
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Activity className="w-3 h-3 animate-spin" />
            PROCESSING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            <Clock className="w-3 h-3" />
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-400" />
            <span>Background Jobs & Queue Console</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Inspect Redis/PostgreSQL asynchronous worker jobs, monitor retries, and trigger execution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleProcessNext}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-md shadow-emerald-600/20"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Worker (Process Next)</span>
          </button>
          <button
            onClick={() => setShowEnqueue(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Enqueue Job</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-mono">
          Loading background queue...
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-12 rounded-xl bg-slate-950 border border-slate-800 text-center">
          <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-300">Queue is idle</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Click &ldquo;Enqueue Job&rdquo; to test an asynchronous background task.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Job Name</th>
                <th className="py-3 px-4">Queue</th>
                <th className="py-3 px-4">Attempts</th>
                <th className="py-3 px-4">Payload</th>
                <th className="py-3 px-4">Queued At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4">{getStatusBadge(job.status)}</td>
                  <td className="py-3 px-4 text-white font-sans font-medium text-xs">
                    {job.name}
                  </td>
                  <td className="py-3 px-4 text-indigo-400 text-[11px]">{job.queueName}</td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {job.attempts} / {job.maxAttempts}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                    {JSON.stringify(job.payload)}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {new Date(job.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleRetry(job.id)}
                      className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded font-sans text-[11px] inline-flex items-center gap-1"
                      title="Retry job"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Replay</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ENQUEUE MODAL */}
      {showEnqueue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>Enqueue Background Task</span>
              </h3>
              <button onClick={() => setShowEnqueue(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEnqueue} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Job Name</label>
                <input
                  type="text"
                  required
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Queue Name</label>
                <input
                  type="text"
                  required
                  value={queueName}
                  onChange={(e) => setQueueName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">JSON Payload</label>
                <textarea
                  rows={4}
                  value={payloadText}
                  onChange={(e) => setPayloadText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEnqueue(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enqueuing}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md disabled:opacity-50"
                >
                  {enqueuing ? "Enqueueing..." : "Enqueue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
