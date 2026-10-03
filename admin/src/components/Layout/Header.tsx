import React, { useEffect, useState } from "react";
import { ExternalLink, Database, Server } from "lucide-react";
import { apiRequest } from "../../lib/api.js";

interface HealthStatus {
  status: string;
  database: { status: string; engine: string };
  redis: { status: string };
}

export const Header: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const fetchHealth = async () => {
    try {
      const data = await apiRequest<HealthStatus>("/health");
      setHealth(data);
    } catch {
      setHealth({
        status: "offline",
        database: { status: "unreachable", engine: "unknown" },
        redis: { status: "unreachable" },
      });
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === "healthy";

  return (
    <header className="h-16 bg-slate-900/60 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-semibold text-slate-200 tracking-tight">
          Internal Operations & API Studio
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* System Health Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isHealthy ? "bg-emerald-400" : "bg-rose-400"
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isHealthy ? "bg-emerald-500" : "bg-rose-500"
              }`}
            ></span>
          </span>
          <span className="text-slate-300 font-mono text-[11px] flex items-center gap-1.5">
            <Database className="w-3 h-3 text-indigo-400" />
            {health?.database.engine === "postgresql-pglite" ? "PGlite" : "Postgres"}
            <span className="text-slate-600">|</span>
            <Server className="w-3 h-3 text-rose-400" />
            Redis
          </span>
        </div>

        {/* OpenAPI Docs Link */}
        <a
          href="http://localhost:4000/documentation"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-medium transition-colors"
        >
          <span>OpenAPI Docs</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </header>
  );
};
