"use client";

import { useState } from "react";
import { MapPin, Info } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SAMPLE_ZIPCODES = [
  { code: "85001", city: "Phoenix", state: "AZ", reach: 4200, spend: 320 },
  { code: "85003", city: "Phoenix", state: "AZ", reach: 3100, spend: 210 },
  { code: "85004", city: "Phoenix", state: "AZ", reach: 2800, spend: 180 },
  { code: "85006", city: "Phoenix", state: "AZ", reach: 5600, spend: 440 },
  { code: "85007", city: "Phoenix", state: "AZ", reach: 1900, spend: 150 },
];

export default function MetaMapPage() {
  const [search, setSearch] = useState("");
  const filtered = SAMPLE_ZIPCODES.filter(
    (z) => z.code.includes(search) || z.city.toLowerCase().includes(search.toLowerCase())
  );

  const maxReach = Math.max(...SAMPLE_ZIPCODES.map((z) => z.reach));

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
          <MapPin size={24} weight="duotone" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Mapa de Zonas</h1>
          <p className="text-muted-foreground text-sm">Distribución geográfica del alcance por código postal</p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
        <Info size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
        <p>Este módulo muestra datos de ejemplo. La integración completa con la Meta Insights API por código postal requiere permisos adicionales de la cuenta publicitaria.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Alcance por Zona</CardTitle>
                <Input
                  placeholder="Buscar código o ciudad..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-48 h-8 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {filtered.map((z) => (
                  <div key={z.code} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="w-16 text-center">
                      <p className="font-mono font-bold text-sm text-primary">{z.code}</p>
                      <p className="text-xs text-muted-foreground">{z.state}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{z.city}</p>
                      <div className="mt-1.5 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all"
                          style={{ width: `${(z.reach / maxReach) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-sm">{z.reach.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">alcance</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-sm text-secondary">${z.spend}</p>
                      <p className="text-xs text-muted-foreground">gasto</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Resumen</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Total zonas", value: SAMPLE_ZIPCODES.length },
                { label: "Alcance total", value: SAMPLE_ZIPCODES.reduce((s, z) => s + z.reach, 0).toLocaleString() },
                { label: "Gasto total", value: `$${SAMPLE_ZIPCODES.reduce((s, z) => s + z.spend, 0).toLocaleString()}` },
                { label: "Promedio alcance", value: Math.round(SAMPLE_ZIPCODES.reduce((s, z) => s + z.reach, 0) / SAMPLE_ZIPCODES.length).toLocaleString() },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{stat.label}</span>
                  <span className="font-semibold">{stat.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Top Zonas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[...SAMPLE_ZIPCODES].sort((a, b) => b.reach - a.reach).slice(0, 3).map((z, i) => (
                <div key={z.code} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{z.city} ({z.code})</p>
                    <p className="text-xs text-muted-foreground">{z.reach.toLocaleString()} personas</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
