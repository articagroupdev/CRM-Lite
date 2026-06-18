"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell } from "@phosphor-icons/react";
import { getUnreadCountAction } from "@/app/actions/notifications";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const ROUTE_LABELS: Record<string, string> = {
  "/": "Inicio",
  "/perfil": "Mi Perfil",
  "/configuraciones": "Configuraciones",
  "/notificaciones": "Notificaciones",
  "/users": "Usuarios",
  "/analyzer": "Analyzer 4101",
  "/analyzer/artica": "Analyzer Artica",
  "/analyzer/tiktok": "Analyzer TikTok",
  "/analyzer/history": "Historial",
  "/email-planner": "Email Planner",
  "/email-hub": "Email Hub",
  "/notas": "Notas",
};

export function TopBar() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  const label = ROUTE_LABELS[pathname] ?? "";

  useEffect(() => {
    if (!isAdmin) return;
    const fetch = async () => {
      const count = await getUnreadCountAction();
      setUnread(typeof count === "number" ? count : 0);
    };
    fetch();
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  return (
    <header className="h-12 flex items-center justify-between px-6 border-b border-border bg-background flex-shrink-0">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <button
            onClick={() => router.push("/notificaciones")}
            className={cn(
              "relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title="Notificaciones"
          >
            <Bell size={18} weight="duotone" />
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
