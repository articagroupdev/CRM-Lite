"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  Megaphone, EnvelopeSimple, Users, HouseLine, ChartBar,
  ImagesSquare, MapPin, SignOut, CaretRight, CaretDown,
  List as ListIcon, X, ChartBarHorizontal, CalendarBlank, ClockCounterClockwise,
} from "@phosphor-icons/react";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: Array<{ label: string; href: string; icon: React.ReactNode }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Inicio", href: "/", icon: <HouseLine size={18} weight="duotone" /> },
  {
    label: "Meta",
    icon: <Megaphone size={18} weight="duotone" />,
    children: [
      { label: "Dashboard", href: "/meta", icon: <HouseLine size={15} /> },
      { label: "Insights", href: "/meta/insights", icon: <ChartBar size={15} /> },
      { label: "Contenido", href: "/meta/contenido", icon: <ImagesSquare size={15} /> },
      { label: "Mapa", href: "/meta/map", icon: <MapPin size={15} /> },
    ],
  },
  {
    label: "Email Hub",
    icon: <EnvelopeSimple size={18} weight="duotone" />,
    children: [
      { label: "Email Hub", href: "/email-hub", icon: <EnvelopeSimple size={15} /> },
    ],
  },
  {
    label: "Analyzer",
    icon: <ChartBarHorizontal size={18} weight="duotone" />,
    children: [
      { label: "Analyzer 4101", href: "/analyzer", icon: <ChartBar size={15} /> },
      { label: "Analyzer Artica", href: "/analyzer/artica", icon: <ChartBar size={15} /> },
      { label: "Historial", href: "/analyzer/history", icon: <ClockCounterClockwise size={15} /> },
    ],
  },
  {
    label: "Email Planner",
    href: "/email-planner",
    icon: <CalendarBlank size={18} weight="duotone" />,
  },
  {
    label: "Usuarios",
    href: "/users",
    icon: <Users size={18} weight="duotone" />,
    adminOnly: true,
  },
];

function NavGroup({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => item.children?.some((c) => pathname.startsWith(c.href)) ?? false);

  const isActive = item.href ? pathname === item.href : item.children?.some((c) => pathname.startsWith(c.href));

  if (item.href) {
    return (
      <Link href={item.href}
        className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          isActive ? "bg-sidebar-primary text-white shadow-sm" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
        )}>
        <span className="flex-shrink-0">{item.icon}</span>
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  }

  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          isActive ? "text-white bg-sidebar-accent" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
        )}>
        <span className="flex-shrink-0">{item.icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {open ? <CaretDown size={14} /> : <CaretRight size={14} />}
          </>
        )}
      </button>
      {!collapsed && open && (
        <div className="ml-6 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
          {item.children?.map((child) => {
            const childActive = pathname === child.href;
            return (
              <Link key={child.href} href={child.href}
                className={cn("flex items-center gap-2 px-2 py-2 rounded-md text-xs font-medium transition-all duration-200",
                  childActive ? "bg-sidebar-primary text-white" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
                )}>
                {child.icon}
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const { user, isAdmin, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  const sidebarContent = (
    <div className={cn("flex flex-col h-full bg-sidebar text-sidebar-foreground", mobile ? "w-72" : collapsed ? "w-16" : "w-64", "transition-all duration-300")}>
      {/* Header */}
      <div className={cn("flex items-center h-16 px-4 border-b border-sidebar-border flex-shrink-0", collapsed ? "flex-col justify-center gap-2" : "justify-between")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/iso-logo.png" alt="Artica" className={cn("object-contain flex-shrink-0", collapsed ? "w-6 h-6" : "w-7 h-7")} />
        {!collapsed && (
          <div className="flex-1 ml-2.5">
            <p className="text-white font-heading font-semibold text-sm leading-tight">CRM Lite</p>
            <p className="text-sidebar-foreground/50 text-[10px]">Artica Creative Studio</p>
          </div>
        )}
        {mobile ? (
          <button onClick={onClose} className="text-sidebar-foreground hover:text-white transition-colors"><X size={20} /></button>
        ) : (
          <button onClick={() => setCollapsed(!collapsed)} className="text-sidebar-foreground/60 hover:text-white transition-colors p-1 rounded-md hover:bg-sidebar-accent">
            <ListIcon size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-thin">
        {visibleItems.map((item) => (
          <NavGroup key={item.label} item={item} collapsed={!mobile && collapsed} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3 flex-shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-sidebar-foreground/60 text-[10px] truncate">{user?.email}</p>
            </div>
            <button onClick={() => signOut()} title="Cerrar sesión" className="text-sidebar-foreground/60 hover:text-red-400 transition-colors">
              <SignOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button onClick={() => signOut()} title="Cerrar sesión" className="text-sidebar-foreground/60 hover:text-red-400 transition-colors p-1">
              <SignOut size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return sidebarContent;
}
