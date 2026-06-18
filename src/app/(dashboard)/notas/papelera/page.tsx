"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getTrashNotesAction, restoreNoteAction, permanentDeleteNoteAction, emptyTrashAction } from "@/app/actions/notes";
import {
  Trash, ArrowCounterClockwise, CaretLeft, Warning, NotePencil,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type TrashNote = {
  id: string; title: string; content: string;
  color: string | null; pinned: boolean; folderId: string | null;
  createdAt: Date; updatedAt: Date; deletedAt: Date | null;
  user: { name: string; image: string | null };
};

const PRESETS = [
  { hex: "#ffffff", border: "#e5e7eb" },
  { hex: "#fefce8", border: "#fef08a" },
  { hex: "#f0fdf4", border: "#bbf7d0" },
  { hex: "#eff6ff", border: "#bfdbfe" },
  { hex: "#fdf4ff", border: "#e9d5ff" },
  { hex: "#fff1f2", border: "#fecdd3" },
];

function noteStyle(color: string | null) {
  const preset = PRESETS.find((p) => p.hex === (color ?? "#ffffff"));
  if (preset) return { backgroundColor: preset.hex, borderColor: preset.border };
  if (color)  return { backgroundColor: color, borderColor: color };
  return { backgroundColor: "#ffffff", borderColor: "#e5e7eb" };
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 86400000)  return `Hoy`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} d`;
  return new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

/* ── Permanent delete confirm ── */
function DeleteConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-background rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Warning size={20} weight="duotone" className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">¿Eliminar permanentemente?</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Esta acción no se puede deshacer. La nota se eliminará para siempre.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 h-9 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Empty trash confirm ── */
function EmptyTrashModal({ count, onConfirm, onCancel }: { count: number; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-background rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Trash size={20} weight="duotone" className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">¿Vaciar papelera?</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Se eliminarán {count} nota{count !== 1 ? "s" : ""} permanentemente. Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 h-9 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
            Vaciar papelera
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Trash card ── */
function TrashCard({ note, onRestore, onDelete }: {
  note: TrashNote; onRestore: () => void; onDelete: () => void;
}) {
  const preview = stripHtml(note.content).slice(0, 160);
  const style   = noteStyle(note.color);
  return (
    <div style={style} className="relative flex flex-col rounded-2xl border p-4 opacity-75 hover:opacity-100 transition-opacity">
      <p className="text-[13px] font-semibold text-foreground leading-tight mb-2 line-clamp-2">{note.title || "Sin título"}</p>
      <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-4 flex-1">{preview || "Nota vacía…"}</p>
      <div className="mt-3 pt-2 border-t border-black/5">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] text-muted-foreground/60 truncate">{note.user.name}</p>
          <p className="text-[10px] text-muted-foreground/50 flex-shrink-0 ml-2">
            Eliminada {formatDate(note.deletedAt)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onRestore}
            className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors"
          >
            <ArrowCounterClockwise size={12} />
            Restaurar
          </button>
          <button
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg bg-red-50 text-red-500 text-[11px] font-medium hover:bg-red-100 transition-colors"
          >
            <Trash size={12} />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────── Main ──────────────────────────── */
export default function PapeleraPage() {
  const [notes,        setNotes]        = useState<TrashNote[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [emptyConfirm,  setEmptyConfirm]  = useState(false);

  useEffect(() => {
    getTrashNotesAction().then((res) => {
      setNotes(res as TrashNote[]);
      setLoading(false);
    });
  }, []);

  const handleRestore = async (id: string) => {
    await restoreNoteAction(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handlePermanentDelete = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm;
    setDeleteConfirm(null);
    await permanentDeleteNoteAction(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleEmptyTrash = async () => {
    setEmptyConfirm(false);
    await emptyTrashAction();
    setNotes([]);
  };

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/notas"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CaretLeft size={13} />
              Notas
            </Link>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Trash size={16} weight="duotone" className="text-muted-foreground" />
              <h2 className="text-[14px] font-semibold text-foreground">Papelera</h2>
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">{notes.length}</span>
            </div>
          </div>
          {notes.length > 0 && (
            <button
              onClick={() => setEmptyConfirm(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950 border border-red-200 dark:border-red-900 transition-colors"
            >
              <Trash size={13} />
              Vaciar papelera
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />)}
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Trash size={26} weight="duotone" className="text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">La papelera está vacía</p>
              <p className="text-xs text-muted-foreground mb-4">Las notas eliminadas aparecerán aquí</p>
              <Link href="/notas" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                <NotePencil size={13} />
                Ir a mis notas
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-4">
                Las notas en la papelera pueden restaurarse en cualquier momento.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {notes.map((n) => (
                  <TrashCard
                    key={n.id}
                    note={n}
                    onRestore={() => handleRestore(n.id)}
                    onDelete={() => setDeleteConfirm(n.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {deleteConfirm && (
        <DeleteConfirmModal
          onConfirm={handlePermanentDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {emptyConfirm && (
        <EmptyTrashModal
          count={notes.length}
          onConfirm={handleEmptyTrash}
          onCancel={() => setEmptyConfirm(false)}
        />
      )}
    </>
  );
}
