"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  EnvelopeSimple, Users, List, FileText, PaperPlaneTilt, Plus,
  Trash, Play, CircleNotch, MagnifyingGlass, TrendUp, EnvelopeOpen,
  UserPlus, ListPlus, PencilSimpleLine, CalendarBlank, At, Buildings,
  Phone, WarningCircle, CloudArrowUp, ChartBar, Clock, Eye,
  CursorClick, CheckCircle, XCircle, Buildings as BuildingsIcon,
} from "@phosphor-icons/react";
import {
  getClientsWithEmailMetricsAction, getEmailListsForClientAction,
  getContactsForClientAction, getCampaignsForClientAction,
  getAllTemplatesAction, createEmailListAction, addContactAction,
  importContactsAction, deleteContactAction, deleteEmailListAction,
  createEmailCampaignAction, deleteEmailCampaignAction, scheduleCampaignAction,
  createTemplateAction, deleteTemplateAction,
} from "@/app/actions/email-hub";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────
type ClientWithMetrics = { id: string; name: string; email: string | null; company: string | null; status: string; avatar: string | null; metrics: { totalSubscribers: number; totalCampaigns: number; totalSent: number; openRate: number; clickRate: number }; emailLists: any[] };
type EmailList = { id: string; name: string; description: string | null; isActive: boolean; clientId: string; _count: { contacts: number; campaigns: number } };
type Contact = { id: string; email: string; firstName: string | null; lastName: string | null; phone: string | null; company: string | null; status: string; list: { id: string; name: string } };
type Campaign = { id: string; name: string; subject: string; status: string; listId: string; scheduledAt: Date | null; sentAt: Date | null; createdAt: Date; list: { id: string; name: string }; template: { id: string; name: string } | null; _count: { sentEmails: number } };
type Template = { id: string; name: string; subject: string; htmlContent: string; isActive: boolean; createdAt: Date };

// ─── Small helpers ─────────────────────────────────────────────────────────────
function fmtDate(d: Date | string | null) {
  if (!d) return "—";
  return format(new Date(d), "dd MMM yyyy", { locale: es });
}

function CampaignStatusBadge({ status }: { status: string }) {
  const map: Record<string, any> = {
    DRAFT: { label: "Borrador", variant: "secondary" },
    SCHEDULED: { label: "Programada", variant: "warning" },
    SENDING: { label: "Enviando", variant: "info" },
    SENT: { label: "Enviada", variant: "success" },
    FAILED: { label: "Fallida", variant: "destructive" },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "outline" };
  return <Badge variant={variant}>{label}</Badge>;
}

function MetricTile({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-1 text-primary">{icon}</div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(text: string) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return { email: row.email ?? row.correo ?? "", firstName: row.firstname ?? row.nombre ?? row.first ?? "", lastName: row.lastname ?? row.apellido ?? row.last ?? "", phone: row.phone ?? row.telefono ?? "", company: row.company ?? row.empresa ?? "" };
  }).filter((r) => r.email.includes("@"));
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmailHubPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState("clients");
  const [subTab, setSubTab] = useState("lists");
  const [search, setSearch] = useState("");

  // Dialog states
  const [showCreateList, setShowCreateList] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showSchedule, setShowSchedule] = useState<string | null>(null);

  // Form state
  const [listForm, setListForm] = useState({ name: "", description: "" });
  const [contactForm, setContactForm] = useState({ email: "", firstName: "", lastName: "", phone: "", company: "", listId: "" });
  const [campaignForm, setCampaignForm] = useState({ name: "", subject: "", htmlContent: "", listId: "", templateId: "" });
  const [templateForm, setTemplateForm] = useState({ name: "", subject: "", htmlContent: "" });
  const [importText, setImportText] = useState("");
  const [importListId, setImportListId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["emailClients"],
    queryFn: async () => {
      const r = await getClientsWithEmailMetricsAction();
      return Array.isArray(r) ? r as ClientWithMetrics[] : [];
    },
  });

  const { data: lists = [], isLoading: loadingLists } = useQuery({
    queryKey: ["emailLists", selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const r = await getEmailListsForClientAction(selectedClientId);
      return Array.isArray(r) ? r as EmailList[] : [];
    },
    enabled: !!selectedClientId,
  });

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["emailContacts", selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const r = await getContactsForClientAction(selectedClientId);
      return Array.isArray(r) ? r as Contact[] : [];
    },
    enabled: !!selectedClientId,
  });

  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ["emailCampaigns", selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const r = await getCampaignsForClientAction(selectedClientId);
      return Array.isArray(r) ? r as Campaign[] : [];
    },
    enabled: !!selectedClientId,
  });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["emailTemplates"],
    queryFn: async () => {
      const r = await getAllTemplatesAction();
      return Array.isArray(r) ? r as Template[] : [];
    },
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = useCallback((keys: (string | null)[][]) => { keys.forEach((k) => qc.invalidateQueries({ queryKey: k })); }, [qc]);

  const createList = useMutation({
    mutationFn: () => createEmailListAction({ name: listForm.name, description: listForm.description || undefined, clientId: selectedClientId! }),
    onSuccess: (r) => { if ("error" in r) { toast({ title: "Error", description: r.error, variant: "destructive" }); return; } invalidate([["emailLists", selectedClientId], ["emailClients"]]); setShowCreateList(false); setListForm({ name: "", description: "" }); toast({ title: "Lista creada" }); },
  });

  const deleteList = useMutation({
    mutationFn: (id: string) => deleteEmailListAction(id),
    onSuccess: () => { invalidate([["emailLists", selectedClientId], ["emailClients"]]); toast({ title: "Lista eliminada" }); },
  });

  const addContact = useMutation({
    mutationFn: () => addContactAction({ ...contactForm }),
    onSuccess: (r) => { if ("error" in r) { toast({ title: "Error", description: r.error, variant: "destructive" }); return; } invalidate([["emailContacts", selectedClientId], ["emailClients"]]); setShowAddContact(false); setContactForm({ email: "", firstName: "", lastName: "", phone: "", company: "", listId: "" }); toast({ title: "Contacto agregado" }); },
  });

  const importContacts = useMutation({
    mutationFn: () => importContactsAction(importListId, parseCSV(importText)),
    onSuccess: (r) => { if ("error" in r) { toast({ title: "Error", description: r.error, variant: "destructive" }); return; } invalidate([["emailContacts", selectedClientId], ["emailClients"]]); setShowImport(false); setImportText(""); toast({ title: `Importados: ${r.imported}, duplicados: ${r.duplicates}, inválidos: ${r.invalid}` }); },
  });

  const deleteContact = useMutation({
    mutationFn: (id: string) => deleteContactAction(id),
    onSuccess: () => { invalidate([["emailContacts", selectedClientId], ["emailClients"]]); toast({ title: "Contacto eliminado" }); },
  });

  const createCampaign = useMutation({
    mutationFn: () => createEmailCampaignAction({ name: campaignForm.name, subject: campaignForm.subject, htmlContent: campaignForm.htmlContent, listId: campaignForm.listId, templateId: campaignForm.templateId || undefined }),
    onSuccess: (r) => { if ("error" in r) { toast({ title: "Error", description: r.error, variant: "destructive" }); return; } invalidate([["emailCampaigns", selectedClientId]]); setShowCreateCampaign(false); setCampaignForm({ name: "", subject: "", htmlContent: "", listId: "", templateId: "" }); toast({ title: "Campaña creada" }); },
  });

  const deleteCampaign = useMutation({
    mutationFn: (id: string) => deleteEmailCampaignAction(id),
    onSuccess: () => { invalidate([["emailCampaigns", selectedClientId]]); toast({ title: "Campaña eliminada" }); },
  });

  const sendCampaign = useMutation({
    mutationFn: async (id: string) => { const r = await fetch(`/api/email-hub/campaigns/${id}/send`, { method: "POST" }); return r.json(); },
    onSuccess: (r) => { if (r.error) { toast({ title: "Error", description: r.error, variant: "destructive" }); return; } invalidate([["emailCampaigns", selectedClientId]]); toast({ title: "Campaña enviada", description: `${r.sent} emails enviados` }); },
  });

  const scheduleCampaign = useMutation({
    mutationFn: (campaignId: string) => scheduleCampaignAction({ campaignId, scheduledAt: scheduleDate }),
    onSuccess: (r) => { if ("error" in r) { toast({ title: "Error", description: r.error, variant: "destructive" }); return; } invalidate([["emailCampaigns", selectedClientId]]); setShowSchedule(null); toast({ title: "Campaña programada" }); },
  });

  const createTemplate = useMutation({
    mutationFn: () => createTemplateAction({ name: templateForm.name, subject: templateForm.subject, htmlContent: templateForm.htmlContent }),
    onSuccess: (r) => { if ("error" in r) { toast({ title: "Error", description: r.error, variant: "destructive" }); return; } invalidate([["emailTemplates"]]); setShowCreateTemplate(false); setTemplateForm({ name: "", subject: "", htmlContent: "" }); toast({ title: "Plantilla creada" }); },
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => deleteTemplateAction(id),
    onSuccess: () => { invalidate([["emailTemplates"]]); toast({ title: "Plantilla eliminada" }); },
  });

  // Filter
  const filteredClients = clients.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.company ?? "").toLowerCase().includes(search.toLowerCase()));

  // Template apply
  const applyTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) setCampaignForm((prev) => ({ ...prev, templateId, subject: tpl.subject, htmlContent: tpl.htmlContent }));
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">
      {/* Client Sidebar */}
      <div className="w-72 flex-shrink-0 border-r flex flex-col bg-muted/20">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <EnvelopeSimple size={18} weight="duotone" className="text-primary" />
            <h2 className="font-heading font-semibold text-sm">Email Hub</h2>
          </div>
          <div className="relative">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." className="pl-8 h-8 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loadingClients ? (
            <div className="p-3 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : filteredClients.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">No hay clientes</div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredClients.map((c) => (
                <button key={c.id} onClick={() => { setSelectedClientId(c.id); setMainTab("detail"); }} className={cn("w-full text-left p-3 rounded-lg transition-all duration-150 hover:bg-background hover:shadow-sm", selectedClientId === c.id ? "bg-background shadow-sm border border-border" : "")}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{c.name[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.company ?? c.email ?? "Sin empresa"}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2 ml-10.5">
                    <span className="text-[10px] text-muted-foreground">{c.metrics.totalSubscribers} subs</span>
                    <span className="text-[10px] text-muted-foreground">{c.metrics.totalCampaigns} camp.</span>
                    <span className="text-[10px] text-emerald-600 font-medium">{c.metrics.openRate}% abierto</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {!selectedClientId ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <div className="p-6 rounded-2xl bg-muted/50">
              <EnvelopeSimple size={48} weight="duotone" className="text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="font-medium">Selecciona un cliente</p>
              <p className="text-sm">Elige un cliente para gestionar sus listas y campañas de email.</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Client Header */}
            {selectedClient && (
              <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold flex-shrink-0">{selectedClient.name[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-heading font-bold truncate">{selectedClient.name}</h1>
                  <p className="text-sm text-muted-foreground">{selectedClient.company ?? selectedClient.email ?? ""}</p>
                </div>
                <div className="hidden md:flex gap-6">
                  <MetricTile label="Suscriptores" value={selectedClient.metrics.totalSubscribers.toLocaleString()} icon={<Users size={16} />} />
                  <MetricTile label="Campañas" value={selectedClient.metrics.totalCampaigns} icon={<PaperPlaneTilt size={16} />} />
                  <MetricTile label="Abiertos" value={`${selectedClient.metrics.openRate}%`} icon={<EnvelopeOpen size={16} />} />
                  <MetricTile label="Clics" value={`${selectedClient.metrics.clickRate}%`} icon={<CursorClick size={16} />} />
                </div>
              </div>
            )}

            {/* Sub Tabs */}
            <Tabs value={subTab} onValueChange={setSubTab}>
              <TabsList>
                <TabsTrigger value="lists" className="gap-1.5"><List size={14} />Listas ({lists.length})</TabsTrigger>
                <TabsTrigger value="contacts" className="gap-1.5"><Users size={14} />Contactos ({contacts.length})</TabsTrigger>
                <TabsTrigger value="campaigns" className="gap-1.5"><PaperPlaneTilt size={14} />Campañas ({campaigns.length})</TabsTrigger>
                <TabsTrigger value="templates" className="gap-1.5"><FileText size={14} />Plantillas ({templates.length})</TabsTrigger>
              </TabsList>

              {/* LISTS */}
              <TabsContent value="lists" className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading font-semibold">Listas de Email</h2>
                  <Button size="sm" onClick={() => setShowCreateList(true)}><Plus size={14} />Nueva Lista</Button>
                </div>
                {loadingLists ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
                ) : lists.length === 0 ? (
                  <Card className="p-12 text-center text-muted-foreground">
                    <ListPlus size={36} className="mx-auto mb-3 opacity-40" />
                    <p className="font-medium">Sin listas</p>
                    <p className="text-sm">Crea tu primera lista de email para este cliente.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lists.map((list) => (
                      <Card key={list.id} className="group">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0 mr-2">
                              <p className="font-semibold text-sm truncate">{list.name}</p>
                              {list.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{list.description}</p>}
                            </div>
                            <Badge variant={list.isActive ? "success" : "secondary"} className="text-[10px] flex-shrink-0">{list.isActive ? "Activa" : "Inactiva"}</Badge>
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Users size={11} />{list._count.contacts} contactos</span>
                            <span className="flex items-center gap-1"><PaperPlaneTilt size={11} />{list._count.campaigns} campañas</span>
                          </div>
                          <div className="mt-3 pt-3 border-t flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => { if (confirm("¿Eliminar lista y todos sus datos?")) deleteList.mutate(list.id); }}>
                              <Trash size={12} />Eliminar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* CONTACTS */}
              <TabsContent value="contacts" className="mt-4">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="font-heading font-semibold">Contactos</h2>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowImport(true)}><CloudArrowUp size={14} />Importar CSV</Button>
                    <Button size="sm" onClick={() => setShowAddContact(true)} disabled={lists.length === 0}><UserPlus size={14} />Agregar</Button>
                  </div>
                </div>
                <Card>
                  <CardContent className="p-0">
                    {loadingContacts ? (
                      <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
                    ) : contacts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Users size={36} className="mb-3 opacity-40" />
                        <p className="font-medium text-sm">Sin contactos</p>
                        <p className="text-xs">Agrega contactos o importa un CSV.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b bg-muted/30"><th className="text-left p-3 font-medium text-muted-foreground">Email</th><th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Nombre</th><th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Lista</th><th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Estado</th><th className="p-3"></th></tr></thead>
                          <tbody className="divide-y">
                            {contacts.map((c) => (
                              <tr key={c.id} className="hover:bg-muted/20">
                                <td className="p-3 font-medium">{c.email}</td>
                                <td className="p-3 hidden sm:table-cell text-muted-foreground">{[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}</td>
                                <td className="p-3 hidden md:table-cell"><Badge variant="outline" className="text-[10px]">{c.list.name}</Badge></td>
                                <td className="p-3 hidden lg:table-cell"><Badge variant={c.status === "SUBSCRIBED" ? "success" : c.status === "UNSUBSCRIBED" ? "secondary" : "destructive"} className="text-[10px]">{c.status}</Badge></td>
                                <td className="p-3 text-right"><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("¿Eliminar contacto?")) deleteContact.mutate(c.id); }}><Trash size={12} /></Button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* CAMPAIGNS */}
              <TabsContent value="campaigns" className="mt-4">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="font-heading font-semibold">Campañas</h2>
                  <Button size="sm" onClick={() => setShowCreateCampaign(true)} disabled={lists.length === 0}><Plus size={14} />Nueva Campaña</Button>
                </div>
                <div className="space-y-3">
                  {loadingCampaigns ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
                  ) : campaigns.length === 0 ? (
                    <Card className="p-12 text-center text-muted-foreground">
                      <PaperPlaneTilt size={36} className="mx-auto mb-3 opacity-40" />
                      <p className="font-medium">Sin campañas</p>
                      <p className="text-sm">Crea una campaña de email para este cliente.</p>
                    </Card>
                  ) : (
                    campaigns.map((camp) => (
                      <Card key={camp.id} className="group">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="font-semibold text-sm">{camp.name}</p>
                                <CampaignStatusBadge status={camp.status} />
                              </div>
                              <p className="text-xs text-muted-foreground truncate mb-2">{camp.subject}</p>
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><List size={11} />{camp.list.name}</span>
                                <span className="flex items-center gap-1"><PaperPlaneTilt size={11} />{camp._count.sentEmails} enviados</span>
                                {camp.scheduledAt && <span className="flex items-center gap-1 text-amber-600"><Clock size={11} />{fmtDate(camp.scheduledAt)}</span>}
                                {camp.sentAt && <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={11} />Enviado {fmtDate(camp.sentAt)}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              {camp.status === "DRAFT" && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowSchedule(camp.id); setScheduleDate(""); }}><CalendarBlank size={12} /></Button>
                                  <Button size="sm" className="h-7 text-xs" onClick={() => { if (confirm(`¿Enviar campaña "${camp.name}" ahora?`)) sendCampaign.mutate(camp.id); }} disabled={sendCampaign.isPending}><Play size={12} />Enviar</Button>
                                </>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => { if (confirm("¿Eliminar campaña?")) deleteCampaign.mutate(camp.id); }}><Trash size={12} /></Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* TEMPLATES */}
              <TabsContent value="templates" className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading font-semibold">Plantillas de Email</h2>
                  <Button size="sm" onClick={() => setShowCreateTemplate(true)}><Plus size={14} />Nueva Plantilla</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loadingTemplates ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
                  ) : templates.length === 0 ? (
                    <Card className="col-span-full p-12 text-center text-muted-foreground">
                      <FileText size={36} className="mx-auto mb-3 opacity-40" />
                      <p className="font-medium">Sin plantillas</p>
                    </Card>
                  ) : (
                    templates.map((tpl) => (
                      <Card key={tpl.id} className="group">
                        <CardContent className="p-4">
                          <p className="font-semibold text-sm">{tpl.name}</p>
                          <p className="text-xs text-muted-foreground truncate mt-1">{tpl.subject}</p>
                          <p className="text-[10px] text-muted-foreground mt-2">{fmtDate(tpl.createdAt)}</p>
                          <div className="mt-3 pt-3 border-t flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => { if (confirm("¿Eliminar plantilla?")) deleteTemplate.mutate(tpl.id); }}><Trash size={12} />Eliminar</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}

      {/* Create List */}
      <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva Lista de Email</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="lname">Nombre *</Label><Input id="lname" value={listForm.name} onChange={(e) => setListForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ej: Newsletter Q1 2025" /></div>
            <div className="space-y-1.5"><Label htmlFor="ldesc">Descripción</Label><Textarea id="ldesc" value={listForm.description} onChange={(e) => setListForm((p) => ({ ...p, description: e.target.value }))} rows={3} placeholder="Descripción opcional" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateList(false)}>Cancelar</Button>
            <Button onClick={() => createList.mutate()} disabled={!listForm.name.trim() || createList.isPending}>{createList.isPending ? <CircleNotch size={14} className="animate-spin" /> : null}Crear Lista</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact */}
      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar Contacto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Lista *</Label>
              <Select value={contactForm.listId} onValueChange={(v) => setContactForm((p) => ({ ...p, listId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar lista" /></SelectTrigger>
                <SelectContent>{lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@ejemplo.com" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Nombre</Label><Input value={contactForm.firstName} onChange={(e) => setContactForm((p) => ({ ...p, firstName: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Apellido</Label><Input value={contactForm.lastName} onChange={(e) => setContactForm((p) => ({ ...p, lastName: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Teléfono</Label><Input value={contactForm.phone} onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Empresa</Label><Input value={contactForm.company} onChange={(e) => setContactForm((p) => ({ ...p, company: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddContact(false)}>Cancelar</Button>
            <Button onClick={() => addContact.mutate()} disabled={!contactForm.email.includes("@") || !contactForm.listId || addContact.isPending}>{addContact.isPending ? <CircleNotch size={14} className="animate-spin" /> : null}Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Importar Contactos (CSV)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Lista de destino *</Label>
              <Select value={importListId} onValueChange={setImportListId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar lista" /></SelectTrigger>
                <SelectContent>{lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contenido CSV</Label>
              <p className="text-xs text-muted-foreground">Columnas: email, firstname, lastname, phone, company</p>
              <Textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={8} placeholder={"email,firstname,lastname,phone,company\njuan@ejemplo.com,Juan,Pérez,+1234567890,Empresa SA"} className="font-mono text-xs" />
            </div>
            {importText && <p className="text-xs text-muted-foreground">{parseCSV(importText).length} contactos válidos detectados</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Cancelar</Button>
            <Button onClick={() => importContacts.mutate()} disabled={!importListId || !importText.trim() || importContacts.isPending}>{importContacts.isPending ? <CircleNotch size={14} className="animate-spin" /> : null}Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Campaign */}
      <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nueva Campaña de Email</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Nombre *</Label><Input value={campaignForm.name} onChange={(e) => setCampaignForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nombre interno" /></div>
              <div className="space-y-1.5"><Label>Lista *</Label>
                <Select value={campaignForm.listId} onValueChange={(v) => setCampaignForm((p) => ({ ...p, listId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar lista" /></SelectTrigger>
                  <SelectContent>{lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({l._count.contacts} contactos)</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {templates.length > 0 && (
              <div className="space-y-1.5"><Label>Plantilla (opcional)</Label>
                <Select value={campaignForm.templateId} onValueChange={applyTemplate}>
                  <SelectTrigger><SelectValue placeholder="Sin plantilla" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin plantilla</SelectItem>
                    {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5"><Label>Asunto *</Label><Input value={campaignForm.subject} onChange={(e) => setCampaignForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Asunto del email" /></div>
            <div className="space-y-1.5"><Label>Contenido HTML</Label><Textarea value={campaignForm.htmlContent} onChange={(e) => setCampaignForm((p) => ({ ...p, htmlContent: e.target.value }))} rows={8} placeholder="<p>Tu contenido HTML aquí...</p>" className="font-mono text-xs" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCampaign(false)}>Cancelar</Button>
            <Button onClick={() => createCampaign.mutate()} disabled={!campaignForm.name || !campaignForm.listId || !campaignForm.subject || createCampaign.isPending}>{createCampaign.isPending ? <CircleNotch size={14} className="animate-spin" /> : null}Crear Campaña</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Campaign */}
      <Dialog open={!!showSchedule} onOpenChange={(o) => !o && setShowSchedule(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Programar Campaña</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">La campaña se enviará automáticamente en la fecha y hora seleccionadas.</p>
            <div className="space-y-1.5"><Label>Fecha y hora *</Label><Input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} min={new Date().toISOString().slice(0, 16)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSchedule(null)}>Cancelar</Button>
            <Button onClick={() => showSchedule && scheduleCampaign.mutate(showSchedule)} disabled={!scheduleDate || scheduleCampaign.isPending}>{scheduleCampaign.isPending ? <CircleNotch size={14} className="animate-spin" /> : null}Programar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template */}
      <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nueva Plantilla</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Nombre *</Label><Input value={templateForm.name} onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nombre de la plantilla" /></div>
              <div className="space-y-1.5"><Label>Asunto por defecto</Label><Input value={templateForm.subject} onChange={(e) => setTemplateForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Asunto de ejemplo" /></div>
            </div>
            <div className="space-y-1.5"><Label>Contenido HTML *</Label><Textarea value={templateForm.htmlContent} onChange={(e) => setTemplateForm((p) => ({ ...p, htmlContent: e.target.value }))} rows={10} placeholder="<html><body>Tu plantilla aquí</body></html>" className="font-mono text-xs" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTemplate(false)}>Cancelar</Button>
            <Button onClick={() => createTemplate.mutate()} disabled={!templateForm.name || !templateForm.htmlContent || createTemplate.isPending}>{createTemplate.isPending ? <CircleNotch size={14} className="animate-spin" /> : null}Crear Plantilla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
