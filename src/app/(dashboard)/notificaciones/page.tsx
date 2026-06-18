"use client";

import { useState, useEffect } from "react";
import {
  getNotificationsAction,
  markAllReadAction,
  markOneReadAction,
  clearAllNotificationsAction,
} from "@/app/actions/notifications";
import { Bell, UserPlus, Trash, UserCircleGear, Key, Checks, BellSimpleSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  if (secs < 604800) return `hace ${Math.floor(secs / 86400)} d`;
  return new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function typeLabel(type: string) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    USER_REGISTERED: { label: "Registro", color: "bg-green-100 text-green-700", icon: <UserPlus size={15} weight="fill" /> },
    USER_DELETED:    { label: "Eliminado", color: "bg-red-100 text-red-700", icon: <Trash size={15} weight="fill" /> },
    USER_TRASH:      { label: "Papelera", color: "bg-orange-100 text-orange-700", icon: <Trash size={15} weight="fill" /> },
    ROLE_CHANGED:    { label: "Rol", color: "bg-blue-100 text-blue-700", icon: <UserCircleGear size={15} weight="fill" /> },
    API_KEY_CHANGED: { label: "API Key", color: "bg-violet-100 text-violet-700", icon: <Key size={15} weight="fill" /> },
  };
  return map[type] ?? { label: type, color: "bg-muted text-muted-foreground", icon: <Bell size={15} /> };
}

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = async () => {
    setLoading(true);
    const result = await getNotificationsAction();
    if (Array.isArray(result)) setNotifications(result as Notification[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayed = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const handleMarkAll = async () => {
    await markAllReadAction();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkOne = async (id: string) => {
    await markOneReadAction(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const handleClear = async () => {
    await clearAllNotificationsAction();
    setNotifications([]);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell size={22} className="text-primary" weight="duotone" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">Notificaciones</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al día"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAll} className="gap-1.5 text-xs">
              <Checks size={13} /> Marcar todas leídas
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClear} className="gap-1.5 text-xs text-destructive hover:text-destructive">
              <Trash size={13} /> Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-muted rounded-lg w-fit">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "all" ? `Todas (${notifications.length})` : `Sin leer (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
          ))
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BellSimpleSlash size={40} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {filter === "unread" ? "No hay notificaciones sin leer" : "No hay notificaciones"}
            </p>
          </div>
        ) : (
          displayed.map((n) => {
            const meta = typeLabel(n.type);
            return (
              <button
                key={n.id}
                onClick={() => !n.read && handleMarkOne(n.id)}
                className={cn(
                  "w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all",
                  n.read
                    ? "bg-background border-border hover:bg-muted/30"
                    : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                )}
              >
                {/* Icon */}
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", meta.color)}>
                  {meta.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={cn("text-sm font-semibold", n.read ? "text-foreground" : "text-primary")}>
                      {n.title}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", meta.color)}>
                        {meta.label}
                      </span>
                      {!n.read && <span className="w-2 h-2 bg-primary rounded-full" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1.5">{timeAgo(n.createdAt)}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
