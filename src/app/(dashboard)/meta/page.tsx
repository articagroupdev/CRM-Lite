"use client";

import Link from "next/link";
import { Megaphone, ChartBar, ImagesSquare, MapPin, ArrowRight } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";

const cards = [
  {
    href: "/meta/insights",
    icon: <ChartBar size={24} weight="duotone" />,
    label: "Insights & Campañas",
    description: "Analiza el rendimiento de tus campañas publicitarias con métricas detalladas.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    href: "/meta/contenido",
    icon: <ImagesSquare size={24} weight="duotone" />,
    label: "Contenido",
    description: "Revisa posts de Facebook e imágenes de Instagram en un solo lugar.",
    color: "bg-pink-50 text-pink-600 border-pink-100",
    gradient: "from-pink-500 to-rose-600",
  },
  {
    href: "/meta/map",
    icon: <MapPin size={24} weight="duotone" />,
    label: "Mapa de Zonas",
    description: "Visualiza el alcance geográfico de tus campañas por código postal.",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    gradient: "from-emerald-500 to-teal-600",
  },
];

export default function MetaPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
          <Megaphone size={24} weight="duotone" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Meta Ads</h1>
          <p className="text-muted-foreground text-sm">Gestiona tus campañas de Facebook e Instagram</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer h-full overflow-hidden">
              <CardContent className="p-0 h-full flex flex-col">
                <div className={`bg-gradient-to-br ${card.gradient} p-5 text-white`}>
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-white/20 rounded-lg">{card.icon}</div>
                    <ArrowRight size={16} className="mt-1 opacity-70 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h2 className="font-heading font-semibold mt-3 text-base">{card.label}</h2>
                </div>
                <div className="p-4 flex-1 bg-background">
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
