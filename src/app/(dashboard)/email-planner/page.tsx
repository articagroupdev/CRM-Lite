"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PlannerCoverPage, PlannerEmailDetailPage, type PlannedEmail, type EmailPlanData } from '@/components/mailchimp/EmailPlannerPdfPages';
import {
  CalendarDays, Plus, Trash2, Download, Mail, Image as ImageIcon, ChevronDown, ChevronUp,
  Copy, Loader2, ArrowUp, ArrowDown, X, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

function generateId() { return Math.random().toString(36).slice(2, 10); }

function createEmptyEmail(): PlannedEmail {
  return { id: generateId(), subject: '', sendDate: '', audience: '', objective: '', notes: '', imageDataUrl: null };
}

function formatDateDisplay(d: Date) {
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function EmailPlannerPage() {
  const [clientName, setClientName] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [period, setPeriod] = useState('');
  const [emails, setEmails] = useState<PlannedEmail[]>([createEmptyEmail()]);
  const [expandedId, setExpandedId] = useState<string | null>(emails[0]?.id || null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coverRef = useRef<HTMLDivElement>(null);
  const generationDate = formatDateDisplay(new Date());

  const planData: EmailPlanData = {
    clientName: clientName || 'Cliente',
    planTitle: planTitle || 'Plan de Email Marketing',
    period: period || 'Periodo no especificado',
    generationDate, emails,
  };

  const validEmails = emails.filter(e => e.subject.trim());

  const updateEmail = useCallback((id: string, updates: Partial<PlannedEmail>) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const addEmail = useCallback(() => {
    const e = createEmptyEmail();
    setEmails(prev => [...prev, e]);
    setExpandedId(e.id);
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

  const moveEmail = useCallback((id: string, dir: -1 | 1) => {
    setEmails(prev => {
      const idx = prev.findIndex(e => e.id === id);
      const ni = idx + dir;
      if (ni < 0 || ni >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[ni]] = [next[ni], next[idx]];
      return next;
    });
  }, []);

  const handleImageUpload = useCallback((emailId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { setError('La imagen excede 10 MB.'); return; }
    const reader = new FileReader();
    reader.onload = e => updateEmail(emailId, { imageDataUrl: e.target?.result as string });
    reader.readAsDataURL(file);
  }, [updateEmail]);

  const generatePdfBlob = useCallback(async (): Promise<Blob | null> => {
    if (validEmails.length === 0) { setError('Agrega al menos un email con asunto.'); return null; }
    const [{ default: jsPDF }, { default: html2canvas }, { createRoot }, { createElement }] = await Promise.all([
      import('jspdf'), import('html2canvas'), import('react-dom/client'), import('react'),
    ]);
    const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'letter', compress: true });
    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();

    const render = async (el: HTMLElement) => {
      const c = await html2canvas(el, { scale: 2, useCORS: true, logging: false, windowWidth: 816, windowHeight: 1056, backgroundColor: '#ffffff' });
      return c.toDataURL('image/png', 0.92);
    };

    // Cover
    if (coverRef.current) {
      const img = await render(coverRef.current);
      pdf.addImage(img, 'PNG', 0, 0, W, H);
    }

    // Detail pages (2 emails per page)
    const emailsPerPage = 2;
    const totalPages = Math.ceil(validEmails.length / emailsPerPage);
    for (let p = 0; p < totalPages; p++) {
      pdf.addPage();
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:-9999px;top:0;width:816px;min-height:1056px;';
      document.body.appendChild(el);
      const root = createRoot(el);
      const slice = validEmails.slice(p * emailsPerPage, (p + 1) * emailsPerPage);
      root.render(createElement(PlannerEmailDetailPage, { emails: slice, startIndex: p * emailsPerPage, total: validEmails.length, pageNumber: p + 2 }));
      await new Promise(r => setTimeout(r, 800));
      const img = await render(el);
      pdf.addImage(img, 'PNG', 0, 0, W, H);
      root.unmount();
      document.body.removeChild(el);
    }

    return pdf.output('blob');
  }, [validEmails, coverRef]);

  const handleDownloadPdf = useCallback(async () => {
    setIsGeneratingPdf(true); setError(null);
    try {
      const blob = await generatePdfBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Planificacion_Email_${(clientName || 'Plan').replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError('Error al generar PDF: ' + e.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [generatePdfBlob, clientName]);

  const handleSend = useCallback(async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRecipient)) { setError('Email inválido.'); return; }
    setIsSending(true); setError(null);
    try {
      const blob = await generatePdfBlob();
      if (!blob) { setIsSending(false); return; }
      const buf = await blob.arrayBuffer();
      const base64 = btoa(new Uint8Array(buf).reduce((d, b) => d + String.fromCharCode(b), ''));
      const res = await fetch('/api/reports/send-email-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailRecipient, clientName, planTitle, period, emailCount: validEmails.length, emails: validEmails, pdfBase64: base64 }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al enviar');
      setIsSendDialogOpen(false); setEmailRecipient('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSending(false);
    }
  }, [emailRecipient, generatePdfBlob, clientName, planTitle, period, validEmails]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hidden PDF cover */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <PlannerCoverPage ref={coverRef} data={planData} />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#011b6a] to-orange-500 shadow-md">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Email Planner</h1>
              <p className="text-sm text-gray-500">Planifica y presenta emails con diseño visual</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={isGeneratingPdf || validEmails.length === 0} onClick={handleDownloadPdf} className="gap-1.5">
              {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isGeneratingPdf ? 'Generando...' : 'PDF'}
            </Button>
            <Button size="sm" className="gap-1.5 bg-[#011b6a] hover:bg-[#02308a]" disabled={validEmails.length === 0} onClick={() => setIsSendDialogOpen(true)}>
              <Mail className="h-4 w-4" /> Enviar al Cliente
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Plan details */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Detalles del Plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-medium text-gray-500">Nombre del Cliente</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Empresa ABC" className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-500">Título del Plan</Label>
              <Input value={planTitle} onChange={e => setPlanTitle(e.target.value)} placeholder="Campaña Q1 2025" className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-500">Periodo</Label>
              <Input value={period} onChange={e => setPeriod(e.target.value)} placeholder="Enero - Marzo 2025" className="mt-1 text-sm" />
            </div>
          </div>
        </div>

        {/* Email list */}
        <div className="space-y-3 mb-4">
          {emails.map((email, i) => {
            const isExpanded = expandedId === email.id;
            return (
              <div key={email.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Email header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-white">
                  <div className="w-7 h-7 rounded-full bg-[#011b6a] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{i + 1}</span>
                  </div>
                  <button className="flex-1 text-left min-w-0" onClick={() => setExpandedId(isExpanded ? null : email.id)}>
                    <p className={cn('text-sm font-medium truncate', email.subject ? 'text-gray-900' : 'text-gray-400')}>
                      {email.subject || 'Email sin asunto'}
                    </p>
                    {email.sendDate && <p className="text-xs text-gray-400 mt-0.5">{email.sendDate}</p>}
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => moveEmail(email.id, -1)} disabled={i === 0} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => moveEmail(email.id, 1)} disabled={i === emails.length - 1} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => duplicateEmail(email.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeEmail(email.id)} disabled={emails.length <= 1} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-30">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setExpandedId(isExpanded ? null : email.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Email form */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label className="text-xs font-medium text-gray-500">Asunto del Email *</Label>
                        <Input value={email.subject} onChange={e => updateEmail(email.id, { subject: e.target.value })} placeholder="Oferta especial de primavera" className="mt-1 text-sm bg-white" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-500">Fecha de Envío</Label>
                        <Input value={email.sendDate} onChange={e => updateEmail(email.id, { sendDate: e.target.value })} placeholder="15 de enero, 2025" className="mt-1 text-sm bg-white" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-500">Audiencia</Label>
                        <Input value={email.audience} onChange={e => updateEmail(email.id, { audience: e.target.value })} placeholder="Todos los suscriptores" className="mt-1 text-sm bg-white" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-500">Objetivo</Label>
                        <Input value={email.objective} onChange={e => updateEmail(email.id, { objective: e.target.value })} placeholder="Aumentar conversiones" className="mt-1 text-sm bg-white" />
                      </div>
                    </div>
                    <div className="mb-4">
                      <Label className="text-xs font-medium text-gray-500">Notas adicionales</Label>
                      <Textarea value={email.notes} onChange={e => updateEmail(email.id, { notes: e.target.value })} placeholder="Detalles del contenido, promociones, etc." className="mt-1 text-sm bg-white resize-none" rows={2} />
                    </div>
                    {/* Image upload */}
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Imagen de referencia (opcional)</Label>
                      {email.imageDataUrl ? (
                        <div className="mt-1 relative inline-block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={email.imageDataUrl} alt="preview" className="h-24 w-auto rounded-lg border border-gray-200 object-cover" />
                          <button onClick={() => updateEmail(email.id, { imageDataUrl: null })} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="mt-1 flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#011b6a] hover:bg-blue-50/30 transition-colors w-fit">
                          <ImageIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-500">Subir imagen</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(email.id, e.target.files[0])} />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add email button */}
        <button
          onClick={addEmail}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#011b6a] hover:text-[#011b6a] hover:bg-blue-50/30 transition-colors"
        >
          <Plus className="h-4 w-4" /> Agregar email
        </button>

        {/* Footer info */}
        <p className="text-xs text-gray-400 text-center mt-4">{validEmails.length} de {emails.length} email{emails.length !== 1 ? 's' : ''} con asunto · listo para exportar</p>
      </div>

      {/* Send dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Planificación al Cliente</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-gray-600">Se enviará el PDF de la planificación con {validEmails.length} email{validEmails.length !== 1 ? 's' : ''}.</p>
            <div>
              <Label className="text-sm">Email destinatario</Label>
              <Input value={emailRecipient} onChange={e => setEmailRecipient(e.target.value)} placeholder="cliente@empresa.com" className="mt-1" type="email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSend} disabled={isSending} className="bg-[#011b6a] hover:bg-[#02308a] gap-2">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {isSending ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
