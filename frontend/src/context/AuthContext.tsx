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
  unreadCount: number;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, orgName?: string) => Promise<void>;
  logout: () => void;
  switchOrganization: (orgId: string) => void;
  refreshUser: () => Promise<void>;
  fetchNotificationsCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(
    localStorage.getItem("qs_customer_org_id")
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotificationsCount = async () => {
    if (!localStorage.getItem("qs_customer_token")) return;
    try {
      const data = await apiRequest<{ unreadCount: number }>("/api/v1/notifications");
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // ignore
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem("qs_customer_token");
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
        const storedOrgId = localStorage.getItem("qs_customer_org_id");
        const validOrg = data.organizations.find((o) => o.organizationId === storedOrgId);
        const selectedId = validOrg ? validOrg.organizationId : data.organizations[0].organizationId;
        setActiveOrgId(selectedId);
        localStorage.setItem("qs_customer_org_id", selectedId);
      }
      await fetchNotificationsCount();
    } catch {
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

      localStorage.setItem("qs_customer_token", res.token);
      if (res.activeOrganizationId) {
        localStorage.setItem("qs_customer_org_id", res.activeOrganizationId);
        setActiveOrgId(res.activeOrganizationId);
      }
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string, orgName?: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{
        token: string;
        user: User;
        organization: { id: string };
      }>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name, organizationName: orgName }),
      });

      localStorage.setItem("qs_customer_token", res.token);
      localStorage.setItem("qs_customer_org_id", res.organization.id);
      setActiveOrgId(res.organization.id);
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("qs_customer_token");
    localStorage.removeItem("qs_customer_org_id");
    setUser(null);
    setOrganizations([]);
    setActiveOrgId(null);
    setUnreadCount(0);
  };

  const switchOrganization = (orgId: string) => {
    setActiveOrgId(orgId);
    localStorage.setItem("qs_customer_org_id", orgId);
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
        unreadCount,
        isLoading,
        login,
        register,
        logout,
        switchOrganization,
        refreshUser,
        fetchNotificationsCount,
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
