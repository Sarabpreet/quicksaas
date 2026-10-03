import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, ExternalLink, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { apiRequest } from "../../lib/api.js";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export const Header: React.FC = () => {
  const { user, activeOrg, unreadCount, fetchNotificationsCount } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ notifications: NotificationItem[] }>("/api/v1/notifications");
      setNotifications(data.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = async () => {
    if (!showNotifications) {
      await loadNotifications();
    }
    setShowNotifications(!showNotifications);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await apiRequest(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      await fetchNotificationsCount();
    } catch (err: any) {
      console.error("Failed to mark read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest("/api/v1/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await fetchNotificationsCount();
    } catch (err: any) {
      console.error("Failed to mark all read:", err);
    }
  };

  return (
    <header className="h-16 bg-slate-900/60 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-slate-200 tracking-tight">
          {activeOrg?.organizationName || "Workspace"}
        </h1>
        <span className="text-slate-600">/</span>
        <span className="text-xs text-slate-400 capitalize">{activeOrg?.role || "Member"}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={toggleDropdown}
            className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white shadow-md animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Drawer */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60">
                {loading ? (
                  <div className="p-8 text-center text-xs font-mono text-slate-500">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 flex items-start justify-between gap-3 transition-colors ${
                        n.isRead ? "bg-slate-950/40 text-slate-400" : "bg-slate-900/60 text-slate-200"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          )}
                          <span>{n.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">
                          {new Date(n.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="p-1 text-slate-400 hover:text-indigo-400 rounded shrink-0"
                          title="Mark read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold">
            {user?.name ? user.name[0].toUpperCase() : "U"}
          </div>
          <span className="text-xs font-medium text-slate-200 hidden sm:inline">
            {user?.name || user?.email}
          </span>
        </div>
      </div>
    </header>
  );
};
