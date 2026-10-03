import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.js";
import { CustomerLayout } from "./components/Layout/CustomerLayout.js";
import { Login } from "./pages/Login.js";
import { Signup } from "./pages/Signup.js";
import { AcceptInvite } from "./pages/AcceptInvite.js";
import { Dashboard } from "./pages/Dashboard.js";
import { DynamicResourceView } from "./pages/DynamicResourceView.js";
import { Team } from "./pages/Team.js";
import { ApiKeys } from "./pages/ApiKeys.js";
import { Files } from "./pages/Files.js";
import { ProfileSettings } from "./pages/ProfileSettings.js";
import { Billing } from "./pages/Billing.js";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading QuickSaaS workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/invite/:token" element={<AcceptInvite />} />

      {/* Protected Customer Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="workspace/:resourceSlug" element={<DynamicResourceView />} />
        <Route path="files" element={<Files />} />
        <Route path="settings/team" element={<Team />} />
        <Route path="settings/api-keys" element={<ApiKeys />} />
        <Route path="settings/billing" element={<Billing />} />
        <Route path="settings/profile" element={<ProfileSettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
