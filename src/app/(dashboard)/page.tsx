"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Megaphone, EnvelopeSimple, Users, ChartBar, ArrowRight } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";

const modules = [
  {
    href: "/meta",
    icon: <Megaphone size={28} weight="duotone" />,
    label: "Meta Ads",
    description: "Gestiona campañas, insights y contenido de Facebook e Instagram.",
    color: "from-[#011b6a] to-[#02308a]",
    badge: "Campañas · Insights · Contenido",
  },
  {
    href: "/email-hub",
    icon: <EnvelopeSimple size={28} weight="duotone" />,
    label: "Email Hub",
    description: "Crea y envía campañas de email, administra listas y contactos.",
    color: "from-[#0ca5c1] to-[#0891aa]",
    badge: "Listas · Campañas · Plantillas",
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-[#011b6a]">
          Bienvenido, {user?.name?.split(" ")[0] ?? "usuario"}
        </h1>
        <p className="text-muted-foreground mt-1">Selecciona un módulo para comenzar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer overflow-hidden">
              <CardContent className="p-0">
                <div className={`bg-gradient-to-br ${mod.color} p-6 text-white`}>
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 bg-white/20 rounded-xl">{mod.icon}</div>
                    <ArrowRight size={18} className="mt-1 opacity-70 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h2 className="text-xl font-heading font-bold mt-4">{mod.label}</h2>
                  <p className="text-white/80 text-sm mt-1">{mod.description}</p>
                </div>
                <div className="px-6 py-3 bg-muted/50">
                  <p className="text-xs text-muted-foreground">{mod.badge}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Módulos activos", value: "2", icon: <ChartBar size={18} weight="duotone" className="text-[#011b6a]" /> },
          { label: "Meta", value: "Campañas, Insights, Contenido, Mapa", icon: <Megaphone size={18} weight="duotone" className="text-[#011b6a]" /> },
          { label: "Email Hub", value: "Listas, Contactos, Campañas, Plantillas", icon: <EnvelopeSimple size={18} weight="duotone" className="text-[#0ca5c1]" /> },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">{stat.icon}<span className="text-xs text-muted-foreground">{stat.label}</span></div>
            <p className="text-sm font-semibold text-foreground">{stat.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
