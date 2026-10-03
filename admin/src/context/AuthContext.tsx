import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "../lib/api.js";

export interface User {
  id: string;
  email: string;
  name: string | null;
  isSuperadmin: boolean;
}

export interface OrganizationMembership {
  role: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
}

interface AuthContextType {
  user: User | null;
  organizations: OrganizationMembership[];
  activeOrgId: string | null;
  activeOrg: OrganizationMembership | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchOrganization: (orgId: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(
    localStorage.getItem("qs_active_org_id")
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const token = localStorage.getItem("qs_token");
    if (!token) {
      setUser(null);
      setOrganizations([]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiRequest<{ user: User; organizations: OrganizationMembership[] }>(
        "/api/v1/auth/me"
      );
      setUser(data.user);
      setOrganizations(data.organizations || []);

      if (data.organizations && data.organizations.length > 0) {
        const storedOrgId = localStorage.getItem("qs_active_org_id");
        const validOrg = data.organizations.find((o) => o.organizationId === storedOrgId);
        const selectedId = validOrg ? validOrg.organizationId : data.organizations[0].organizationId;
        setActiveOrgId(selectedId);
        localStorage.setItem("qs_active_org_id", selectedId);
      }
    } catch (err) {
      console.error("[Auth] Session expired or invalid:", err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{
        token: string;
        user: User;
        activeOrganizationId?: string;
      }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("qs_token", res.token);
      if (res.activeOrganizationId) {
        localStorage.setItem("qs_active_org_id", res.activeOrganizationId);
        setActiveOrgId(res.activeOrganizationId);
      }
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("qs_token");
    localStorage.removeItem("qs_active_org_id");
    setUser(null);
    setOrganizations([]);
    setActiveOrgId(null);
  };

  const switchOrganization = (orgId: string) => {
    setActiveOrgId(orgId);
    localStorage.setItem("qs_active_org_id", orgId);
    window.location.reload();
  };

  const activeOrg = organizations.find((o) => o.organizationId === activeOrgId) || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        activeOrgId,
        activeOrg,
        isLoading,
        login,
        logout,
        switchOrganization,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
