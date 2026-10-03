import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.js";
import { AppLayout } from "./components/Layout/AppLayout.js";
import { Login } from "./pages/Login.js";
import { Dashboard } from "./pages/Dashboard.js";
import { Resources } from "./pages/Resources.js";
import { DynamicData } from "./pages/DynamicData.js";
import { Organizations } from "./pages/Organizations.js";
import { Users } from "./pages/Users.js";
import { Jobs } from "./pages/Jobs.js";
import { Webhooks } from "./pages/Webhooks.js";
import { Email } from "./pages/Email.js";
import { FeatureFlags } from "./pages/FeatureFlags.js";
import { AuditLogs } from "./pages/AuditLogs.js";
import { ApiKeys } from "./pages/ApiKeys.js";
import { Settings } from "./pages/Settings.js";
import { Backups } from "./pages/Backups.js";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/data" element={<DynamicData />} />
            <Route path="/data/:resourceSlug" element={<DynamicData />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/users" element={<Users />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/webhooks" element={<Webhooks />} />
            <Route path="/email" element={<Email />} />
            <Route path="/feature-flags" element={<FeatureFlags />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/api-keys" element={<ApiKeys />} />
            <Route path="/backups" element={<Backups />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
