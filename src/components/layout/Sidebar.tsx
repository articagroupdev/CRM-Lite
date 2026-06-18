"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMyProfileAction } from "@/app/actions/users";
import {
  Megaphone, EnvelopeSimple, Users, ChartBar,
  SignOut, CaretRight, CaretDown,
  List as ListIcon, X, ChartBarHorizontal, CalendarBlank, ClockCounterClockwise,
  GearSix, UserCircle, Bell, NotePencil,
} from "@phosphor-icons/react";

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  // perceived luminance
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.35;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: Array<{ label: string; href: string; icon: React.ReactNode }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Meta",
    icon: <Megaphone size={18} weight="duotone" />,
    children: [
      { label: "Analyzer 4101", href: "/analyzer", icon: <ChartBar size={15} /> },
      { label: "Analyzer Artica", href: "/analyzer/artica", icon: <ChartBar size={15} /> },
      { label: "Analyzer TikTok", href: "/analyzer/tiktok", icon: <ChartBar size={15} /> },
      { label: "Historial", href: "/analyzer/history", icon: <ClockCounterClockwise size={15} /> },
    ],
  },
  {
    label: "Email Hub",
    icon: <EnvelopeSimple size={18} weight="duotone" />,
    children: [
      { label: "Email Planner", href: "/email-planner", icon: <CalendarBlank size={15} /> },
    ],
  },
  {
    label: "Usuarios",
    href: "/users",
    icon: <Users size={18} weight="duotone" />,
    adminOnly: true,
  },
  {
    label: "Notificaciones",
    href: "/notificaciones",
    icon: <Bell size={18} weight="duotone" />,
    adminOnly: true,
  },
  {
    label: "Notas",
    href: "/notas",
    icon: <NotePencil size={18} weight="duotone" />,
  },
  {
    label: "Mi Perfil",
    href: "/perfil",
    icon: <UserCircle size={18} weight="duotone" />,
  },
  {
    label: "Configuraciones",
    href: "/configuraciones",
    icon: <GearSix size={18} weight="duotone" />,
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
          isActive ? "bg-sidebar-primary text-white shadow-sm" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
          isActive ? "text-white bg-sidebar-accent" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
                  childActive ? "bg-sidebar-primary text-white" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
  const { theme, customColor } = useAppTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  function fetchProfile() {
    if (!user?.id) return;
    getMyProfileAction().then((profile) => {
      if (profile) {
        setProfileImage(profile.image ?? null);
        const full = [profile.name, profile.lastName].filter(Boolean).join(" ");
        setDisplayName(full || null);
      }
    });
  }

  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  useEffect(() => {
    const handler = () => fetchProfile();
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, [user?.id]);

  const useLightLogo =
    theme === 'light' ||
    (theme === 'custom' && isLightColor(customColor));
  const logoSrc = useLightLogo ? '/img/icon.webp' : '/img/iso-logo.png';
  const titleTextClass = useLightLogo ? 'text-sidebar-foreground' : 'text-white';

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  const sidebarContent = (
    <div className={cn("flex flex-col h-full bg-sidebar text-sidebar-foreground", mobile ? "w-72" : collapsed ? "w-16" : "w-64", "transition-all duration-300")}>
      {/* Header */}
      <div className={cn("flex items-center h-16 px-4 border-b border-sidebar-border flex-shrink-0", collapsed ? "flex-col justify-center gap-2" : "justify-between")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="Artica" className={cn("object-contain flex-shrink-0", collapsed ? "w-6 h-6" : "w-7 h-7")} />
        {!collapsed && (
          <div className="flex-1 ml-2.5">
            <p className={cn(titleTextClass, "font-heading font-semibold text-sm leading-tight")}>CRM Lite</p>
            <p className="text-sidebar-foreground/50 text-[10px]">Artica Creative Studio</p>
          </div>
        )}
        {mobile ? (
          <button onClick={onClose} className="text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"><X size={20} /></button>
        ) : (
          <button onClick={() => setCollapsed(!collapsed)} className="text-sidebar-foreground/60 hover:text-sidebar-accent-foreground transition-colors p-1 rounded-md hover:bg-sidebar-accent">
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
          <div className="flex items-center gap-2.5">
            <Link href="/perfil" className="flex items-center gap-2.5 flex-1 min-w-0 group">
              <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-sidebar-primary/30 group-hover:ring-sidebar-primary/60 transition-all">
                {profileImage && <AvatarImage src={profileImage} alt={displayName ?? user?.name ?? ""} />}
                <AvatarFallback className="bg-sidebar-primary text-white text-xs font-bold">
                  {(displayName ?? user?.name)?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className={cn(titleTextClass, "text-xs font-semibold truncate leading-tight group-hover:opacity-80 transition-opacity")}>
                  {displayName ?? user?.name ?? "Usuario"}
                </p>
                <p className="text-sidebar-foreground/60 text-[10px] truncate">{user?.email}</p>
              </div>
            </Link>
            <button onClick={() => signOut()} title="Cerrar sesión" className="text-sidebar-foreground/60 hover:text-red-400 transition-colors flex-shrink-0">
              <SignOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Link href="/perfil">
              <Avatar className="w-7 h-7 hover:ring-2 hover:ring-sidebar-primary/60 transition-all">
                {profileImage && <AvatarImage src={profileImage} alt={displayName ?? user?.name ?? ""} />}
                <AvatarFallback className="bg-sidebar-primary text-white text-[10px] font-bold">
                  {(displayName ?? user?.name)?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return sidebarContent;
}
