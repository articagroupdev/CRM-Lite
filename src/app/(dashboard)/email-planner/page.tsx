"use client";

import React, { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarBlank, Plus, Trash, DownloadSimple, Envelope, ImageSquare,
  PencilSimpleLine, CircleNotch, CaretDown, CaretUp, Copy,
  PaperPlaneTilt, Sparkle, Users as UsersIcon, NoteBlank, XCircle,
} from '@phosphor-icons/react';
import { PlannerCoverPage, PlannerEmailDetailPage, type PlannedEmail, type EmailPlanData } from '@/components/mailchimp/EmailPlannerPdfPages';
import PdfFooterPage from '@/components/PdfFooterPage';

function generateId(): string { return Math.random().toString(36).slice(2, 10); }

function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function createEmptyEmail(): PlannedEmail {
  return { id: generateId(), subject: '', sendDate: '', notes: '', imageDataUrl: null };
}

export default function EmailPlannerPage() {
  const { toast } = useToast();

  const [clientName, setClientName] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [period, setPeriod] = useState('');
  const [emails, setEmails] = useState<PlannedEmail[]>([createEmptyEmail()]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(emails[0]?.id || null);

  const generationDate = formatDateForDisplay(new Date());

  const updateEmail = useCallback((id: string, updates: Partial<PlannedEmail>) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const addEmail = useCallback(() => {
    const newEmail = createEmptyEmail();
    setEmails(prev => [...prev, newEmail]);
    setExpandedId(newEmail.id);
  }, []);

  const removeEmail = useCallback((id: string) => {
    setEmails(prev => {
      if (prev.length <= 1) return prev;
      const filtered = prev.filter(e => e.id !== id);
      if (expandedId === id) setExpandedId(filtered[0]?.id || null);
      return filtered;
    });
  }, [expandedId]);

  const duplicateEmail = useCallback((id: string) => {
    setEmails(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx === -1) return prev;
      const clone = { ...prev[idx], id: generateId(), subject: `${prev[idx].subject} (copia)` };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }, []);

  const moveEmail = useCallback((id: string, direction: -1 | 1) => {
    setEmails(prev => {
      const idx = prev.findIndex(e => e.id === id);
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  const handleImageUpload = useCallback((emailId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Imagen muy grande', description: 'El archivo excede 10 MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => updateEmail(emailId, { imageDataUrl: ev.target?.result as string });
    reader.readAsDataURL(file);
  }, [toast, updateEmail]);

  const validEmails = emails.filter(e => e.subject.trim());

  const generatePdfBlob = useCallback(async (): Promise<Blob | null> => {
    if (validEmails.length === 0) {
      toast({ title: 'Sin emails', description: 'Agrega al menos un email con asunto para generar el PDF.', variant: 'destructive' });
      return null;
    }

    const [{ default: jsPDF }, { default: html2canvas }, { createRoot }, { createElement }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
      import('react-dom/client'),
      import('react'),
    ]);

    const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'letter', compress: true, hotfixes: ['px_scaling'] });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();

    // Convert logo to base64 to avoid CORS canvas taint
    const toBase64 = (path: string): Promise<string> =>
      fetch(window.location.origin + path)
        .then(r => r.blob())
        .then(blob => new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result as string);
          reader.onerror = rej;
          reader.readAsDataURL(blob);
        }))
        .catch(() => '');

    const logoSrc = await toBase64('/img/logo-artica-1.png');

    const canvasOpts = {
      scale: 1.5,
      allowTaint: true,
      useCORS: false,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 816,
      windowHeight: 1056,
      onclone: (doc: Document) => {
        doc.querySelectorAll('style, link[rel="stylesheet"]').forEach(s => s.remove());
      },
    };

    const renderPage = async (Component: React.ComponentType<any>, props: any): Promise<string> => {
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:-9999px;top:0;width:816px;min-height:1056px;';
      document.body.appendChild(el);
      const root = createRoot(el);
      root.render(createElement(Component, props));
      await new Promise(r => setTimeout(r, 1000));
      const canvas = await html2canvas(el, canvasOpts);
      root.unmount();
      document.body.removeChild(el);
      return canvas.toDataURL('image/png', 0.92);
    };

    const addPage = (imgData: string, isFirst = false) => {
      if (!isFirst) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfPageHeight);
    };

    const currentPlanData: EmailPlanData = {
      clientName: clientName || 'Cliente',
      planTitle: planTitle || 'Plan de Email Marketing',
      period: period || 'Periodo no especificado',
      generationDate,
      emails: validEmails,
    };

    // Cover page
    const coverImg = await renderPage(PlannerCoverPage, { data: currentPlanData, logoSrc });
    addPage(coverImg, true);

    // Detail pages (2 emails per page)
    const emailsPerPage = 2;
    const totalPages = Math.ceil(validEmails.length / emailsPerPage);
    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const slice = validEmails.slice(pageIdx * emailsPerPage, (pageIdx + 1) * emailsPerPage);
      const detailImg = await renderPage(PlannerEmailDetailPage, { emails: slice, startIndex: pageIdx * emailsPerPage, total: validEmails.length, pageNumber: pageIdx + 2 });
      addPage(detailImg);
    }

    // Footer page
    const footerImg = await renderPage(PdfFooterPage, { logoSrc });
    addPage(footerImg);

    return pdf.output('blob');
  }, [validEmails, clientName, planTitle, period, generationDate, toast]);

  const handleDownloadPdf = useCallback(async () => {
    setIsGeneratingPdf(true);
    toast({ title: 'PDF', description: 'Generando planificación...' });
    try {
      const blob = await generatePdfBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Planificacion_Email_${(clientName || 'Plan').replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'PDF descargado' });
    } catch (err: any) {
      toast({ title: 'Error al generar PDF', description: err.message, variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [generatePdfBlob, clientName, toast]);

  const handleSendEmail = useCallback(async () => {
    if (!emailRecipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRecipient)) {
      toast({ title: 'Email inválido', variant: 'destructive' });
      return;
    }
    setIsSending(true);
    try {
      toast({ title: 'Generando PDF para envío...' });
      const blob = await generatePdfBlob();
      if (!blob) { setIsSending(false); return; }
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ''));
      const res = await fetch('/api/reports/send-email-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailRecipient, clientName, planTitle, period, emailCount: validEmails.length, emails: validEmails, pdfBase64: base64 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error' }));
        throw new Error(err.error);
      }
      toast({ title: 'Planificación enviada', description: `Enviada a ${emailRecipient}` });
      setIsSendDialogOpen(false);
      setEmailRecipient('');
    } catch (err: any) {
      toast({ title: 'Error al enviar', description: err.message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  }, [emailRecipient, generatePdfBlob, clientName, planTitle, period, validEmails, toast]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-[#011b6a] to-orange-500 shadow-lg">
                  <CalendarBlank size={28} weight="bold" className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Email Planner</h1>
                  <p className="text-sm text-slate-500 mt-0.5">Planifica y presenta emails a tus clientes con diseños visuales</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-9" onClick={handleDownloadPdf} disabled={isGeneratingPdf || validEmails.length === 0}>
                  {isGeneratingPdf ? <CircleNotch className="mr-1.5 h-4 w-4 animate-spin" /> : <DownloadSimple className="mr-1.5 h-4 w-4" />}
                  {isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}
                </Button>
                <Button size="sm" className="h-9 bg-[#011b6a] hover:bg-[#02308a]" onClick={() => setIsSendDialogOpen(true)} disabled={validEmails.length === 0}>
                  <Envelope className="mr-1.5 h-4 w-4" /> Enviar al Cliente
                </Button>
              </div>
            </div>
          </div>

          {/* Plan Info */}
          <Card className="mb-6 overflow-hidden border-slate-200">
            <div className="h-1 bg-gradient-to-r from-[#011b6a] to-orange-500" />
            <CardContent className="p-5 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5 text-slate-700">
                    <UsersIcon size={14} className="text-slate-400" /> Nombre del Cliente *
                  </Label>
                  <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ej: Mi Empresa S.A." />
                </div>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5 text-slate-700">
                    <Sparkle size={14} className="text-slate-400" /> Título del Plan
                  </Label>
                  <Input value={planTitle} onChange={e => setPlanTitle(e.target.value)} placeholder="Ej: Newsletter Marzo 2026" />
                </div>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5 text-slate-700">
                    <CalendarBlank size={14} className="text-slate-400" /> Periodo
                  </Label>
                  <Input value={period} onChange={e => setPeriod(e.target.value)} placeholder="Ej: Marzo 2026" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emails list */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Emails Planificados ({emails.length})</h2>
            <Button size="sm" onClick={addEmail} className="h-9 bg-[#011b6a] hover:bg-[#02308a]">
              <Plus className="mr-1.5 h-4 w-4" /> Agregar Email
            </Button>
          </div>

          <div className="space-y-3">
            {emails.map((email, idx) => {
              const isExpanded = expandedId === email.id;
              return (
                <Card key={email.id} className={`overflow-hidden transition-all duration-300 border-slate-200 ${isExpanded ? 'shadow-lg ring-1 ring-[#011b6a]/10' : 'hover:shadow-md'}`}>
                  <div className={`h-1 ${email.subject ? 'bg-gradient-to-r from-[#0ca5c1] to-[#011b6a]' : 'bg-slate-200'}`} />

                  {/* Collapsed header */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer select-none hover:bg-slate-50/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : email.id)}
                  >
                    <div className="flex items-center gap-1 text-slate-300">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="p-0.5 hover:text-slate-500" onClick={e => { e.stopPropagation(); moveEmail(email.id, -1); }} disabled={idx === 0}>
                            <CaretUp size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left"><p className="text-xs">Mover arriba</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="p-0.5 hover:text-slate-500" onClick={e => { e.stopPropagation(); moveEmail(email.id, 1); }} disabled={idx === emails.length - 1}>
                            <CaretDown size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left"><p className="text-xs">Mover abajo</p></TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#011b6a] to-[#0ca5c1] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${email.subject ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                        {email.subject || 'Sin asunto'}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        {email.sendDate && <span className="flex items-center gap-1"><CalendarBlank size={11} /> {email.sendDate}</span>}
                        {email.imageDataUrl && <span className="flex items-center gap-1 text-green-500"><ImageSquare size={11} /> Diseño adjunto</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); duplicateEmail(email.id); }}>
                            <Copy size={14} className="text-slate-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">Duplicar</p></TooltipContent>
                      </Tooltip>
                      {emails.length > 1 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); removeEmail(email.id); }}>
                              <Trash size={14} className="text-slate-400 hover:text-red-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs">Eliminar</p></TooltipContent>
                        </Tooltip>
                      )}
                      {isExpanded ? <CaretUp size={16} className="text-slate-400 ml-1" /> : <CaretDown size={16} className="text-slate-400 ml-1" />}
                    </div>
                  </div>

                  {/* Expanded form */}
                  {isExpanded && (
                    <div className="px-4 pb-5 pt-1 border-t border-slate-100 bg-slate-50/30">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5 text-slate-700">
                            <PencilSimpleLine size={13} className="text-slate-400" /> Asunto del Email *
                          </Label>
                          <Input value={email.subject} onChange={e => updateEmail(email.id, { subject: e.target.value })} placeholder="Ej: Descubre nuestras novedades" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5 text-slate-700">
                            <CalendarBlank size={13} className="text-slate-400" /> Fecha de Envío
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={`w-full justify-start text-left font-normal h-10 ${!email.sendDate ? 'text-muted-foreground' : ''}`}
                              >
                                <CalendarBlank className="mr-2 h-4 w-4" />
                                {email.sendDate || 'Seleccionar fecha'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={email.sendDate ? (() => {
                                  try {
                                    const months: Record<string, string> = { enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06', julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12' };
                                    const parts = email.sendDate.split(' de ');
                                    if (parts.length === 3) {
                                      const month = months[parts[1].toLowerCase()];
                                      if (month) return new Date(`${parts[2]}-${month}-${parts[0].padStart(2, '0')}`);
                                    }
                                    return undefined;
                                  } catch { return undefined; }
                                })() : undefined}
                                onSelect={(date) => {
                                  if (date) updateEmail(email.id, { sendDate: format(date, "d 'de' MMMM, yyyy", { locale: es }) });
                                }}
                                locale={es}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5 text-slate-700">
                          <NoteBlank size={13} className="text-slate-400" /> Notas / Descripción
                        </Label>
                        <Textarea
                          value={email.notes}
                          onChange={e => updateEmail(email.id, { notes: e.target.value })}
                          rows={3}
                          className="resize-none"
                          placeholder="Detalles adicionales sobre el contenido, CTA, ofertas..."
                        />
                      </div>

                      {/* Image upload */}
                      <div className="mt-4">
                        <Label className="text-sm font-medium flex items-center gap-1.5 mb-2 text-slate-700">
                          <ImageSquare size={13} className="text-slate-400" /> Diseño del Email
                        </Label>
                        {email.imageDataUrl ? (
                          <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={email.imageDataUrl} alt="Diseño" className="w-full max-h-80 object-contain" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <Button size="sm" variant="secondary" onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file'; input.accept = 'image/*';
                                  input.onchange = (ev) => {
                                    const f = (ev.target as HTMLInputElement).files?.[0];
                                    if (f) handleImageUpload(email.id, f);
                                  };
                                  input.click();
                                }}>
                                  <ImageSquare className="mr-1.5 h-4 w-4" /> Cambiar
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => updateEmail(email.id, { imageDataUrl: null })}>
                                  <XCircle className="mr-1.5 h-4 w-4" /> Quitar
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="border-2 border-dashed border-slate-300 rounded-xl p-4 sm:p-8 text-center hover:border-[#011b6a] hover:bg-blue-50/30 transition-all cursor-pointer"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file'; input.accept = 'image/*';
                              input.onchange = (ev) => {
                                const f = (ev.target as HTMLInputElement).files?.[0];
                                if (f) handleImageUpload(email.id, f);
                              };
                              input.click();
                            }}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                              e.preventDefault();
                              const f = e.dataTransfer.files?.[0];
                              if (f && f.type.startsWith('image/')) handleImageUpload(email.id, f);
                            }}
                          >
                            <ImageSquare size={36} weight="duotone" className="text-slate-400 mx-auto mb-3" />
                            <p className="text-sm font-medium text-slate-600">Arrastra una imagen o haz clic para subir</p>
                            <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP · Max 10 MB</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Add more */}
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={addEmail} className="border-dashed border-2 h-12 px-8 text-slate-500 hover:text-[#011b6a] hover:border-[#011b6a]">
              <Plus className="mr-2 h-4 w-4" /> Agregar otro email al plan
            </Button>
          </div>

          {/* Bottom actions */}
          {validEmails.length > 0 && (
            <Card className="mt-8 overflow-hidden border-slate-200">
              <div className="h-1 bg-gradient-to-r from-[#011b6a] to-[#0ca5c1]" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">{validEmails.length}</span> email{validEmails.length !== 1 ? 's' : ''} listo{validEmails.length !== 1 ? 's' : ''} para la planificación
                    {emails.filter(e => e.imageDataUrl).length > 0 && (
                      <span className="text-green-600 ml-2">({emails.filter(e => e.imageDataUrl).length} con diseño)</span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button variant="outline" onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="w-full sm:w-auto">
                      {isGeneratingPdf ? <CircleNotch className="mr-2 h-4 w-4 animate-spin" /> : <DownloadSimple className="mr-2 h-4 w-4" />}
                      Descargar PDF
                    </Button>
                    <Button className="bg-[#011b6a] hover:bg-[#02308a] w-full sm:w-auto" onClick={() => setIsSendDialogOpen(true)}>
                      <Envelope className="mr-2 h-4 w-4" /> Enviar al Cliente
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Send Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PaperPlaneTilt size={20} weight="duotone" className="text-[#011b6a]" /> Enviar Planificación
            </DialogTitle>
            <DialogDescription>Se generará el PDF y se enviará como adjunto al email del cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Email del cliente *</Label>
              <Input
                type="email"
                value={emailRecipient}
                onChange={e => setEmailRecipient(e.target.value)}
                placeholder="cliente@ejemplo.com"
                className="mt-1.5"
              />
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-sm text-slate-600 space-y-1">
              <p><span className="font-medium">Cliente:</span> {clientName || 'No especificado'}</p>
              <p><span className="font-medium">Plan:</span> {planTitle || 'Plan de Email Marketing'}</p>
              <p><span className="font-medium">Emails:</span> {validEmails.length} planificados</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-[#011b6a] hover:bg-[#02308a]" onClick={handleSendEmail} disabled={isSending || !emailRecipient}>
              {isSending
                ? <><CircleNotch className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                : <><PaperPlaneTilt className="mr-2 h-4 w-4" /> Enviar</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
