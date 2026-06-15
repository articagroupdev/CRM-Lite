"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { List, Bell } from "@phosphor-icons/react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
            <span className="text-primary font-bold font-heading">CL</span>
          </div>
          <p className="text-muted-foreground text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-10">
            <Sidebar mobile onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top header (mobile) */}
        <header className="md:hidden flex items-center justify-between h-14 px-4 bg-sidebar border-b border-sidebar-border flex-shrink-0">
          <button onClick={() => setMobileSidebarOpen(true)} className="text-white/70 hover:text-white transition-colors">
            <List size={22} />
          </button>
          <span className="text-white font-heading font-semibold text-sm">CRM Lite</span>
          <div className="w-8" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
