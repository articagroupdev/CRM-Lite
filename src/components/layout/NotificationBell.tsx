"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, UserPlus, Trash, UserCircleGear, Key, X, Checks, Dot } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  getNotificationsAction,
  getUnreadCountAction,
  markAllReadAction,
  markOneReadAction,
  clearAllNotificationsAction,
} from "@/app/actions/notifications";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
};

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "ahora mismo";
  if (secs < 3600) return `hace ${Math.floor(secs / 60)} min`;
  if (secs < 86400) return `hace ${Math.floor(secs / 3600)} h`;
  return `hace ${Math.floor(secs / 86400)} d`;
}

function NotifIcon({ type }: { type: string }) {
  const cls = "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center";
  if (type === "USER_REGISTERED") return <span className={cn(cls, "bg-green-100")}><UserPlus size={14} className="text-green-600" weight="fill" /></span>;
  if (type === "USER_DELETED") return <span className={cn(cls, "bg-red-100")}><Trash size={14} className="text-red-600" weight="fill" /></span>;
  if (type === "USER_TRASH") return <span className={cn(cls, "bg-orange-100")}><Trash size={14} className="text-orange-500" weight="fill" /></span>;
  if (type === "ROLE_CHANGED") return <span className={cn(cls, "bg-blue-100")}><UserCircleGear size={14} className="text-blue-600" weight="fill" /></span>;
  if (type === "API_KEY_CHANGED") return <span className={cn(cls, "bg-violet-100")}><Key size={14} className="text-violet-600" weight="fill" /></span>;
  return <span className={cn(cls, "bg-muted")}><Dot size={14} /></span>;
}

export function NotificationBell({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = async () => {
    const count = await getUnreadCountAction();
    setUnread(typeof count === "number" ? count : 0);
  };

  const fetchNotifications = async () => {
    setLoading(true);
    const result = await getNotificationsAction();
    if (Array.isArray(result)) setNotifications(result as Notification[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchNotifications();
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = () => setOpen((v) => !v);

  const handleMarkAllRead = async () => {
    await markAllReadAction();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  const handleMarkOne = async (id: string) => {
    await markOneReadAction(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnread((c) => Math.max(0, c - 1));
  };

  const handleClear = async () => {
    await clearAllNotificationsAction();
    setNotifications([]);
    setUnread(0);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full",
          open
            ? "bg-sidebar-primary text-white shadow-sm"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <span className="flex-shrink-0 relative">
          <Bell size={18} weight="duotone" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </span>
        {!collapsed && <span>Notificaciones</span>}
        {!collapsed && unread > 0 && (
          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className={cn(
          "absolute z-50 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden",
          collapsed ? "left-14 bottom-0 w-80" : "left-0 bottom-12 w-80"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-primary" weight="duotone" />
              <span className="text-sm font-semibold text-foreground">Notificaciones</span>
              {unread > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{unread}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button onClick={handleMarkAllRead} title="Marcar todas como leídas" className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
                  <Checks size={14} />
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={handleClear} title="Limpiar todo" className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors">
                  <Trash size={14} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="py-10 text-center text-muted-foreground text-sm">Cargando...</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={28} className="mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && handleMarkOne(n.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/40 last:border-0",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <NotifIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-xs font-semibold text-foreground truncate", !n.read && "text-primary")}>
                        {n.title}
                      </p>
                      {!n.read && <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
