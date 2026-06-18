"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  getNotesAction, createNoteAction, updateNoteAction, trashNoteAction,
  getNoteFoldersAction, createNoteFolderAction, updateNoteFolderAction, deleteNoteFolderAction,
} from "@/app/actions/notes";
import {
  NotePencil, Plus, MagnifyingGlass, Trash, PushPin,
  Image as ImageIcon, ListBullets, ListNumbers, Quotes, X,
  SquaresFour, Rows, Palette, Folder, FolderOpen,
  CaretLeft, CaretRight, Warning, CaretDown,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Note = {
  id: string; title: string; content: string;
  color: string | null; pinned: boolean; folderId: string | null;
  createdAt: Date; updatedAt: Date;
  user: { name: string; image: string | null };
};

type FolderItem = {
  id: string; name: string; color: string | null;
  _count: { notes: number };
};

const PAGE_SIZE = 40;

const PRESETS = [
  { hex: "#ffffff", label: "Blanco",   border: "#e5e7eb" },
  { hex: "#fefce8", label: "Amarillo", border: "#fef08a" },
  { hex: "#f0fdf4", label: "Verde",    border: "#bbf7d0" },
  { hex: "#eff6ff", label: "Azul",     border: "#bfdbfe" },
  { hex: "#fdf4ff", label: "Morado",   border: "#e9d5ff" },
  { hex: "#fff1f2", label: "Rosa",     border: "#fecdd3" },
];

function isDarkColor(hex: string): boolean {
  try {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  } catch { return false; }
}

function noteStyle(color: string | null): { backgroundColor: string; borderColor: string } {
  const preset = PRESETS.find((p) => p.hex === (color ?? "#ffffff"));
  if (preset) return { backgroundColor: preset.hex, borderColor: preset.border };
  if (color)  return { backgroundColor: color, borderColor: color };
  return { backgroundColor: "#ffffff", borderColor: "#e5e7eb" };
}

function formatDate(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000)     return "Ahora mismo";
  if (diff < 3600000)   return `${Math.floor(diff / 60000)} min`;
  if (diff < 86400000)  return `${Math.floor(diff / 3600000)} h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} d`;
  return new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/* ── TBtn ── */
function TBtn({ children, onAction, title, active, danger, dark = false }: {
  children: React.ReactNode; onAction: () => void;
  title?: string; active?: boolean; danger?: boolean; dark?: boolean;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onAction(); }}
      title={title}
      className={cn(
        "w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold transition-colors",
        dark ? [
          active ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/15 hover:text-white",
          danger && "hover:bg-red-400/20 hover:text-red-300",
        ] : [
          active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-black/5 hover:text-foreground",
          danger && "hover:bg-red-50 hover:text-red-500",
        ],
      )}
    >{children}</button>
  );
}

/* ── ColorPicker ── */
function ColorPicker({ current, dark, onChange }: {
  current: string | null; dark: boolean; onChange: (hex: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = current ?? "#ffffff";

  return (
    <div ref={ref} className="relative">
      <button
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        title="Color de nota"
        className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
          dark
            ? cn("text-white/60 hover:bg-white/15 hover:text-white", open && "bg-white/20 text-white")
            : cn("text-muted-foreground hover:bg-black/5 hover:text-foreground", open && "bg-black/5 text-foreground"),
        )}
      >
        <Palette size={13} />
      </button>

      {open && (
        <div className="absolute top-9 right-0 z-[60] bg-popover border border-border rounded-xl shadow-xl p-3 w-52">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Color de nota</p>
          <div className="grid grid-cols-6 gap-1.5 mb-2">
            {PRESETS.map((p) => (
              <button
                key={p.hex}
                onMouseDown={(e) => { e.preventDefault(); onChange(p.hex); setOpen(false); }}
                title={p.label}
                className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                style={{
                  backgroundColor: p.hex,
                  borderColor: active === p.hex ? "#6366f1" : p.border,
                  boxShadow: active === p.hex ? "0 0 0 2px #6366f1" : "none",
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <p className="text-[11px] text-muted-foreground flex-1">Personalizado</p>
            <input
              type="color"
              defaultValue={active.length === 7 ? active : "#ffffff"}
              className="w-7 h-7 rounded-full cursor-pointer border-2 border-border overflow-hidden p-0 bg-transparent"
              onChange={(e) => onChange(e.target.value)}
              onBlur={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── NoteCard (grid) ── */
function NoteCard({ note, onOpen, onPin, onTrash, onMove }: {
  note: Note; onOpen: () => void; onPin: (n: Note) => void;
  onTrash: (id: string) => void; onMove: (id: string) => void;
}) {
  const preview = stripHtml(note.content).slice(0, 200);
  const style   = noteStyle(note.color);
  return (
    <button onClick={onOpen} style={style}
      className="group relative flex flex-col text-left rounded-2xl border p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <span onClick={(e) => { e.stopPropagation(); onMove(note.id); }} className="w-6 h-6 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white" title="Mover a carpeta">
          <FolderOpen size={11} className="text-muted-foreground hover:text-primary" />
        </span>
        <span onClick={(e) => { e.stopPropagation(); onPin(note); }} className="w-6 h-6 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white">
          <PushPin size={11} weight={note.pinned ? "fill" : "regular"} className={note.pinned ? "text-amber-500" : "text-muted-foreground"} />
        </span>
        <span onClick={(e) => { e.stopPropagation(); onTrash(note.id); }} className="w-6 h-6 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white">
          <Trash size={11} className="text-muted-foreground hover:text-red-500" />
        </span>
      </div>
      {note.pinned && <span className="absolute top-2.5 left-3"><PushPin size={11} weight="fill" className="text-amber-400" /></span>}
      <div className={cn("flex-1 min-h-0", note.pinned && "mt-3")}>
        <p className="text-[13px] font-semibold text-foreground leading-tight mb-2 pr-10 line-clamp-2">{note.title || "Sin título"}</p>
        <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-5">{preview || "Nota vacía…"}</p>
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5">
        <p className="text-[10px] text-muted-foreground/60 truncate">{note.user.name}</p>
        <p className="text-[10px] text-muted-foreground/60 flex-shrink-0 ml-2">{formatDate(note.updatedAt)}</p>
      </div>
    </button>
  );
}

/* ── NoteRow (list) ── */
function NoteRow({ note, onOpen, onPin, onTrash, onMove }: {
  note: Note; onOpen: () => void; onPin: (n: Note) => void;
  onTrash: (id: string) => void; onMove: (id: string) => void;
}) {
  const preview = stripHtml(note.content).slice(0, 140);
  const style   = noteStyle(note.color);
  return (
    <button onClick={onOpen} style={style}
      className="group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border hover:shadow-sm transition-all text-left"
    >
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-black/10" style={{ backgroundColor: note.color ?? "#e5e7eb" }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[13px] font-semibold text-foreground truncate">{note.title || "Sin título"}</p>
          {note.pinned && <PushPin size={10} weight="fill" className="text-amber-400 flex-shrink-0" />}
        </div>
        <p className="text-[12px] text-muted-foreground truncate">{preview || "Nota vacía…"}</p>
      </div>
      <p className="text-[11px] text-muted-foreground/50 flex-shrink-0 hidden sm:block">{note.user.name}</p>
      <p className="text-[11px] text-muted-foreground/60 flex-shrink-0">{formatDate(note.updatedAt)}</p>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <span onClick={(e) => { e.stopPropagation(); onMove(note.id); }} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-black/5" title="Mover a carpeta">
          <FolderOpen size={12} className="text-muted-foreground hover:text-primary" />
        </span>
        <span onClick={(e) => { e.stopPropagation(); onPin(note); }} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-black/5">
          <PushPin size={12} weight={note.pinned ? "fill" : "regular"} className={note.pinned ? "text-amber-500" : "text-muted-foreground"} />
        </span>
        <span onClick={(e) => { e.stopPropagation(); onTrash(note.id); }} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-black/5">
          <Trash size={12} className="text-muted-foreground hover:text-red-500" />
        </span>
      </div>
    </button>
  );
}

/* ── Trash Confirm ── */
function TrashConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-background rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Warning size={20} weight="duotone" className="text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">¿Mover a papelera?</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              La nota se moverá a la papelera. Podrás restaurarla desde allí cuando quieras.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 h-9 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
            Mover a papelera
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Move to Folder Modal ── */
function MoveFolderModal({ noteId, currentFolderId, folders, onMove, onClose }: {
  noteId: string; currentFolderId: string | null;
  folders: FolderItem[];
  onMove: (noteId: string, folderId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-60 mx-4 overflow-hidden border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <FolderOpen size={14} className="text-primary flex-shrink-0" />
          <p className="text-[13px] font-semibold text-foreground">Mover a carpeta</p>
        </div>
        <div className="p-1.5 max-h-60 overflow-y-auto">
          {/* Sin carpeta */}
          <button
            onClick={() => onMove(noteId, null)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors",
              currentFolderId === null
                ? "bg-primary/8 text-primary font-medium"
                : "text-foreground hover:bg-muted",
            )}
          >
            <NotePencil size={13} className="flex-shrink-0" />
            <span className="flex-1 text-left">Sin carpeta</span>
            {currentFolderId === null && <span className="text-primary text-[10px] font-semibold">✓</span>}
          </button>

          {folders.length > 0 && <div className="h-px bg-border mx-2 my-1" />}

          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onMove(noteId, folder.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors",
                currentFolderId === folder.id
                  ? "bg-primary/8 text-primary font-medium"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <Folder size={13} className="flex-shrink-0" />
              <span className="flex-1 text-left truncate">{folder.name}</span>
              <span className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0",
                currentFolderId === folder.id ? "text-primary" : "bg-muted text-muted-foreground",
              )}>
                {currentFolderId === folder.id ? "✓" : folder._count.notes}
              </span>
            </button>
          ))}

          {folders.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-4">
              No hay carpetas. Crea una primero.
            </p>
          )}
        </div>
        <div className="px-3 py-2 border-t border-border">
          <button onClick={onClose} className="w-full h-7 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete Folder Confirm ── */
function DeleteFolderModal({ name, noteCount, onConfirm, onCancel }: {
  name: string; noteCount: number; onConfirm: () => void; onCancel: () => void;
}) {
  const hasNotes = noteCount > 0;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-background rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
            hasNotes ? "bg-amber-50" : "bg-red-50"
          )}>
            <Folder size={20} weight="duotone" className={hasNotes ? "text-amber-500" : "text-red-500"} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              ¿Eliminar carpeta &ldquo;{name}&rdquo;?
            </p>
            {hasNotes ? (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Esta carpeta tiene{" "}
                <span className="font-semibold text-foreground">{noteCount} nota{noteCount !== 1 ? "s" : ""}</span>.
                {" "}Al eliminarla, las notas <span className="font-medium">no se borran</span> —
                se moverán a <span className="font-medium">Todas las notas</span>.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">La carpeta está vacía y se eliminará.</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 h-9 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
            {hasNotes ? "Eliminar carpeta" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── FolderPill — editable inline (doble clic para renombrar) ── */
function FolderPill({ folder, isActive, onClick, onRename, onDelete }: {
  folder: FolderItem;
  isActive: boolean;
  onClick: () => void;
  onRename: (name: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(folder.name);
    setEditing(true);
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 10);
  };

  const commit = async () => {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== folder.name) await onRename(name);
    else setDraft(folder.name);
  };

  const cancel = () => { setEditing(false); setDraft(folder.name); };

  if (editing) {
    return (
      <div className="flex-shrink-0 flex items-center">
        <div className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full border-2 border-primary bg-primary/5">
          <Folder size={12} className="text-primary flex-shrink-0" />
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")  { e.preventDefault(); commit(); }
              if (e.key === "Escape") { e.preventDefault(); cancel(); }
            }}
            onBlur={commit}
            className="text-xs bg-transparent outline-none text-foreground font-medium"
            style={{ width: `${Math.max(60, draft.length * 7 + 8)}px` }}
          />
          <button onMouseDown={(e) => { e.preventDefault(); cancel(); }} className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/10 flex-shrink-0">
            <X size={9} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex-shrink-0">
      <button
        onClick={onClick}
        onDoubleClick={startEdit}
        title="Doble clic para renombrar"
        className={cn(
          "flex items-center gap-1.5 pl-3 pr-8 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors select-none",
          isActive
            ? "bg-primary text-white"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
        )}
      >
        <Folder size={12} />
        {folder.name}
        <span className={cn(
          "text-[9px] px-1.5 rounded-full ml-0.5",
          isActive ? "bg-white/20 text-white" : "bg-background/80 text-muted-foreground",
        )}>
          {folder._count.notes}
        </span>
      </button>
      {/* Delete X */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Eliminar carpeta"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-950"
      >
        <X size={9} className="text-muted-foreground hover:text-red-500" />
      </button>
    </div>
  );
}

/* ── NewFolderPill — aparece inline al crear carpeta ── */
function NewFolderPill({ onConfirm, onCancel }: {
  onConfirm: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("Nueva carpeta");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 20);
  }, []);

  const commit = async () => {
    const n = name.trim();
    if (!n || busy) { onCancel(); return; }
    setBusy(true);
    await onConfirm(n);
    setBusy(false);
  };

  return (
    <div className="flex-shrink-0 flex items-center">
      <div className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full border-2 border-primary bg-primary/5 shadow-sm">
        <Folder size={12} className="text-primary flex-shrink-0" />
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter")  { e.preventDefault(); commit(); }
            if (e.key === "Escape") { e.preventDefault(); onCancel(); }
          }}
          onBlur={commit}
          disabled={busy}
          className="text-xs bg-transparent outline-none text-foreground font-medium disabled:opacity-50"
          style={{ width: `${Math.max(80, name.length * 7 + 8)}px` }}
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
          className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/10 flex-shrink-0"
        >
          <X size={9} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────── Main ──────────────────────────── */
export default function NotasPage() {
  const [notes,   setNotes]   = useState<Note[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null | undefined>(undefined);
  const [selected,  setSelected]  = useState<Note | null>(null);
  const [isNewNote, setIsNewNote] = useState(false);
  const [search,    setSearch]    = useState("");
  const [debSearch, setDebSearch] = useState("");
  const [saving,    setSaving]    = useState<"idle" | "saving" | "saved">("idle");
  const [loading,   setLoading]   = useState(true);
  const [view,      setView]      = useState<"grid" | "list">("grid");
  const [trashConfirm,        setTrashConfirm]        = useState<string | null>(null);
  const [showNewFolder,       setShowNewFolder]       = useState(false);
  const [overflowOpen,        setOverflowOpen]        = useState(false);
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<{ id: string; name: string; count: number } | null>(null);
  const [folderPicker,        setFolderPicker]        = useState<{ noteId: string; folderId: string | null } | null>(null);

  const titleRef      = useRef<HTMLInputElement>(null);
  const editorRef     = useRef<HTMLDivElement>(null);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgInputRef   = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const selectedRef   = useRef<Note | null>(null);

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Clear stale notes immediately so pinned notes from another folder never flash
  useEffect(() => {
    setNotes([]);
    setTotal(0);
    setPage(1);
  }, [activeFolderId]);

  useEffect(() => {
    setLoading(true);
    getNotesAction({ folderId: activeFolderId, page, search: debSearch || undefined }).then((res) => {
      setNotes(res.notes as Note[]);
      setTotal(res.total);
      setLoading(false);
    });
  }, [activeFolderId, page, debSearch]);

  useEffect(() => {
    getNoteFoldersAction().then((res) => setFolders(res as FolderItem[]));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = selected.content ?? "";
      if (titleRef.current)  titleRef.current.value      = selected.title  ?? "";
    }, 10);
  }, [selected?.id]); // eslint-disable-line

  type AutoSaveData = { title?: string; content?: string; pinned?: boolean; color?: string | null; folderId?: string | null };
  const scheduleAutoSave = useCallback((data: AutoSaveData) => {
    const note = selectedRef.current;
    if (!note) return;
    setSaving("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await updateNoteAction(note.id, data);
      setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, ...data, updatedAt: new Date() } : n));
      setSaving("saved");
      setTimeout(() => setSaving("idle"), 2000);
    }, 700);
  }, []);

  const captureAndSave = useCallback(() => {
    if (!titleRef.current || !editorRef.current) return;
    scheduleAutoSave({ title: titleRef.current.value, content: editorRef.current.innerHTML });
  }, [scheduleAutoSave]);

  const handleColorChange = (hex: string) => {
    const id = selectedRef.current?.id;
    if (!id) return;
    setSelected((s) => s ? { ...s, color: hex } : null);
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, color: hex } : n));
    updateNoteAction(id, { color: hex });
  };

  const closeModal = () => { setSelected(null); setIsNewNote(false); };

  const handleCreate = async () => {
    const note = await createNoteAction(activeFolderId ?? undefined);
    if (!note) return;
    const n = note as Note;
    setNotes((prev) => [n, ...prev]);
    setTotal((t) => t + 1);
    setSelected(n);
    setIsNewNote(true);
    setTimeout(() => titleRef.current?.focus(), 80);
  };

  const handleTrashRequest = (id: string) => setTrashConfirm(id);

  const handleTrashConfirm = async () => {
    if (!trashConfirm) return;
    const id = trashConfirm;
    setTrashConfirm(null);
    await trashNoteAction(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    if (selected?.id === id) closeModal();
  };

  const handlePin = async (note: Note) => {
    const pinned = !note.pinned;
    await updateNoteAction(note.id, { pinned });
    setNotes((prev) =>
      [...prev.map((n) => n.id === note.id ? { ...n, pinned } : n)]
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    );
    if (selected?.id === note.id) setSelected((s) => s ? { ...s, pinned } : null);
  };

  const exec = (cmd: string, val?: string) => { editorRef.current?.focus(); document.execCommand(cmd, false, val); captureAndSave(); };

  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Imagen máxima 5 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      editorRef.current?.focus();
      const sel = window.getSelection();
      if (savedRangeRef.current) { sel?.removeAllRanges(); sel?.addRange(savedRangeRef.current); }
      document.execCommand("insertHTML", false,
        `<p><img src="${reader.result}" alt="" style="max-width:100%;height:auto;border-radius:10px;margin:8px 0;display:block;" /></p>`
      );
      captureAndSave();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCreateFolder = async (name: string) => {
    const f = await createNoteFolderAction({ name });
    if (f) setFolders((prev) => [...prev, f as FolderItem]);
    setShowNewFolder(false);
  };

  const handleRenameFolder = async (id: string, name: string) => {
    await updateNoteFolderAction(id, { name });
    setFolders((prev) => prev.map((f) => f.id === id ? { ...f, name } : f));
  };

  const openFolderPicker = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId) ?? selected;
    setFolderPicker({ noteId, folderId: note?.folderId ?? null });
  };

  const handleMoveNote = async (noteId: string, folderId: string | null) => {
    const note = notes.find((n) => n.id === noteId) ?? selected;
    const oldFolderId = note?.folderId ?? null;
    setFolderPicker(null);

    await updateNoteAction(noteId, { folderId });

    // If viewing a specific folder and the note moved out → remove from list
    if (activeFolderId !== undefined && folderId !== activeFolderId) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setTotal((t) => Math.max(0, t - 1));
      if (selected?.id === noteId) closeModal();
    } else {
      setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, folderId } : n));
      if (selected?.id === noteId) setSelected((s) => s ? { ...s, folderId } : null);
    }

    // Update folder note counts optimistically
    setFolders((prev) => prev.map((f) => {
      if (f.id === oldFolderId && oldFolderId !== folderId)
        return { ...f, _count: { notes: Math.max(0, f._count.notes - 1) } };
      if (f.id === folderId && oldFolderId !== folderId)
        return { ...f, _count: { notes: f._count.notes + 1 } };
      return f;
    }));
  };

  const requestDeleteFolder = (folder: FolderItem) => {
    setDeleteFolderConfirm({ id: folder.id, name: folder.name, count: folder._count.notes });
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderConfirm) return;
    const { id } = deleteFolderConfirm;
    setDeleteFolderConfirm(null);
    await deleteNoteFolderAction(id);
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (activeFolderId === id) { setActiveFolderId(undefined); setNotes([]); setTotal(0); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const noteDark   = isDarkColor(selected?.color ?? "#ffffff");
  const pinned     = notes.filter((n) => n.pinned);
  const rest       = notes.filter((n) => !n.pinned);

  // Folder overflow: show max 5 pills, rest in dropdown
  const MAX_VISIBLE_FOLDERS = 5;
  const visibleFolders  = folders.slice(0, MAX_VISIBLE_FOLDERS);
  const overflowFolders = folders.slice(MAX_VISIBLE_FOLDERS);
  const activeIsOverflow = activeFolderId != null && overflowFolders.some((f) => f.id === activeFolderId);
  const activeOverflowFolder = activeIsOverflow ? overflowFolders.find((f) => f.id === activeFolderId) : null;

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <NotePencil size={16} weight="duotone" className="text-primary" />
            <h2 className="text-[14px] font-semibold text-foreground">Notas</h2>
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <MagnifyingGlass size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar notas…" className="pl-7 h-8 text-xs w-44" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={11} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg">
              <button onClick={() => setView("grid")} title="Cuadrícula"
                className={cn("w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                  view === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                <SquaresFour size={14} />
              </button>
              <button onClick={() => setView("list")} title="Lista"
                className={cn("w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                  view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                <Rows size={14} />
              </button>
            </div>
            <button onClick={handleCreate} title="Nueva nota"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-white hover:bg-primary/90 transition-colors flex-shrink-0">
              <Plus size={14} weight="bold" />
            </button>
          </div>
        </div>

        {/* ── Folder / Trash bar ── */}
        <div className="flex items-center gap-1.5 px-6 py-2 border-b border-border flex-shrink-0">
          {/* Todas */}
          <button
            onClick={() => { setActiveFolderId(undefined); setOverflowOpen(false); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0",
              activeFolderId === undefined
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            <NotePencil size={12} />
            Todas
          </button>

          {/* Separator */}
          {folders.length > 0 && <div className="w-px h-4 bg-border flex-shrink-0" />}

          {/* Visible folder pills (max 5) */}
          {visibleFolders.map((folder) => (
            <FolderPill
              key={folder.id}
              folder={folder}
              isActive={activeFolderId === folder.id}
              onClick={() => { setActiveFolderId(folder.id); setOverflowOpen(false); }}
              onRename={(name) => handleRenameFolder(folder.id, name)}
              onDelete={() => requestDeleteFolder(folder)}
            />
          ))}

          {/* Overflow dropdown — "X más" */}
          {overflowFolders.length > 0 && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setOverflowOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  activeIsOverflow
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {activeIsOverflow ? (
                  <>
                    <Folder size={12} />
                    {activeOverflowFolder?.name}
                    <span className="text-[9px] px-1.5 rounded-full bg-white/20 ml-0.5">
                      {activeOverflowFolder?._count.notes}
                    </span>
                  </>
                ) : (
                  <>+{overflowFolders.length}</>
                )}
                <CaretDown size={10} className="ml-0.5 opacity-70" />
              </button>

              {overflowOpen && (
                <>
                  {/* Click-outside overlay */}
                  <div className="fixed inset-0 z-10" onClick={() => setOverflowOpen(false)} />
                  <div className="absolute top-9 left-0 z-20 bg-popover border border-border rounded-xl shadow-lg p-1 min-w-[180px]">
                    <p className="text-[10px] font-semibold text-muted-foreground px-3 pt-1.5 pb-1 uppercase tracking-wider">
                      Más carpetas
                    </p>
                    {overflowFolders.map((folder) => (
                      <div key={folder.id} className="group relative">
                        <button
                          onClick={() => { setActiveFolderId(folder.id); setOverflowOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors",
                            activeFolderId === folder.id
                              ? "bg-primary text-white"
                              : "text-foreground hover:bg-muted",
                          )}
                        >
                          <Folder size={12} className="flex-shrink-0" />
                          <span className="flex-1 text-left truncate">{folder.name}</span>
                          <span className={cn(
                            "text-[9px] px-1.5 rounded-full flex-shrink-0",
                            activeFolderId === folder.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
                          )}>
                            {folder._count.notes}
                          </span>
                        </button>
                        {/* Delete from overflow */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setOverflowOpen(false); requestDeleteFolder(folder); }}
                          title="Eliminar carpeta"
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-950"
                        >
                          <X size={10} className="text-muted-foreground hover:text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* New folder pill (inline) */}
          {showNewFolder && (
            <NewFolderPill
              onConfirm={handleCreateFolder}
              onCancel={() => setShowNewFolder(false)}
            />
          )}

          {/* + Carpeta button */}
          {!showNewFolder && (
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0"
              title="Nueva carpeta"
            >
              <Plus size={11} />
              <span>Carpeta</span>
            </button>
          )}

          <div className="flex-1 min-w-0" />

          {/* Papelera link */}
          <Link
            href="/notas/papelera"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 transition-colors flex-shrink-0"
          >
            <Trash size={12} />
            Papelera
          </Link>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className={cn(view === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" : "space-y-2")}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className={cn("bg-muted animate-pulse rounded-2xl", view === "grid" ? "h-44" : "h-16")} />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <NotePencil size={26} weight="duotone" className="text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">{search ? "Sin resultados" : "No hay notas"}</p>
              <p className="text-xs text-muted-foreground mb-4">
                {search ? "Prueba con otro término" : activeFolderId ? "Esta carpeta está vacía" : "Crea la primera nota"}
              </p>
              {!search && (
                <Button onClick={handleCreate} size="sm" className="gap-1.5">
                  <Plus size={13} /> Nueva nota
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {pinned.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                    <PushPin size={11} weight="fill" className="text-amber-400" /> Ancladas
                  </p>
                  {view === "grid" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {pinned.map((n) => (
                        <NoteCard key={n.id} note={n} onOpen={() => { setSelected(n); setIsNewNote(false); }} onPin={handlePin} onTrash={handleTrashRequest} onMove={openFolderPicker} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {pinned.map((n) => (
                        <NoteRow key={n.id} note={n} onOpen={() => { setSelected(n); setIsNewNote(false); }} onPin={handlePin} onTrash={handleTrashRequest} onMove={openFolderPicker} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {rest.length > 0 && (
                <div>
                  {pinned.length > 0 && (
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Todas</p>
                  )}
                  {view === "grid" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {rest.map((n) => (
                        <NoteCard key={n.id} note={n} onOpen={() => { setSelected(n); setIsNewNote(false); }} onPin={handlePin} onTrash={handleTrashRequest} onMove={openFolderPicker} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {rest.map((n) => (
                        <NoteRow key={n.id} note={n} onOpen={() => { setSelected(n); setIsNewNote(false); }} onPin={handlePin} onTrash={handleTrashRequest} onMove={openFolderPicker} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 px-6 py-3 border-t border-border flex-shrink-0">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <CaretLeft size={13} />
            </button>
            <span className="text-xs text-muted-foreground">
              Página <span className="font-semibold text-foreground">{page}</span> de{" "}
              <span className="font-semibold text-foreground">{totalPages}</span>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <CaretRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── Editor Modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-colors duration-200"
            style={{ height: "85vh", ...noteStyle(selected.color) }}
          >
            {/* Toolbar */}
            <div className={cn(
              "flex items-center gap-0.5 px-4 py-2.5 border-b flex-shrink-0",
              noteDark ? "border-white/15 bg-black/20" : "border-black/10 bg-white/30 backdrop-blur-sm",
            )}>
              <TBtn dark={noteDark} onAction={() => exec("bold")} title="Negrita"><span className="font-bold">B</span></TBtn>
              <TBtn dark={noteDark} onAction={() => exec("italic")} title="Cursiva"><span className="italic font-semibold">I</span></TBtn>
              <TBtn dark={noteDark} onAction={() => exec("underline")} title="Subrayado"><span className="underline font-semibold">U</span></TBtn>
              <div className={cn("w-px h-4 mx-1", noteDark ? "bg-white/20" : "bg-black/10")} />
              <TBtn dark={noteDark} onAction={() => exec("formatBlock", "h1")} title="H1"><span className="text-[11px] font-bold">H1</span></TBtn>
              <TBtn dark={noteDark} onAction={() => exec("formatBlock", "h2")} title="H2"><span className="text-[11px] font-bold">H2</span></TBtn>
              <TBtn dark={noteDark} onAction={() => exec("formatBlock", "h3")} title="H3"><span className="text-[11px] font-bold">H3</span></TBtn>
              <div className={cn("w-px h-4 mx-1", noteDark ? "bg-white/20" : "bg-black/10")} />
              <TBtn dark={noteDark} onAction={() => exec("insertUnorderedList")} title="Lista"><ListBullets size={13} /></TBtn>
              <TBtn dark={noteDark} onAction={() => exec("insertOrderedList")} title="Numerada"><ListNumbers size={13} /></TBtn>
              <TBtn dark={noteDark} onAction={() => exec("formatBlock", "blockquote")} title="Cita"><Quotes size={13} /></TBtn>
              <div className={cn("w-px h-4 mx-1", noteDark ? "bg-white/20" : "bg-black/10")} />
              <TBtn dark={noteDark} onAction={() => { saveRange(); imgInputRef.current?.click(); }} title="Imagen">
                <ImageIcon size={13} />
              </TBtn>
              <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />

              <div className="flex-1" />

              <span className={cn(
                "text-[11px] mr-1 transition-opacity",
                saving === "idle" ? "opacity-0" : "opacity-100",
                saving === "saving"
                  ? (noteDark ? "text-white/50" : "text-muted-foreground")
                  : (noteDark ? "text-green-300" : "text-green-600"),
              )}>
                {saving === "saving" ? "Guardando…" : "Guardado ✓"}
              </span>

              <ColorPicker current={selected.color} dark={noteDark} onChange={handleColorChange} />

              {/* Move to folder */}
              <TBtn dark={noteDark} onAction={() => openFolderPicker(selected.id)} title="Mover a carpeta">
                <FolderOpen size={13} />
              </TBtn>

              <TBtn dark={noteDark} onAction={() => handlePin(selected)} title={selected.pinned ? "Desanclar" : "Anclar"} active={selected.pinned}>
                <PushPin size={13} weight={selected.pinned ? "fill" : "regular"}
                  className={selected.pinned ? (noteDark ? "text-amber-300" : "text-amber-500") : ""} />
              </TBtn>

              {!isNewNote && (
                <TBtn dark={noteDark} onAction={() => handleTrashRequest(selected.id)} title="Mover a papelera" danger>
                  <Trash size={13} />
                </TBtn>
              )}

              <button
                onClick={closeModal}
                className={cn(
                  "ml-1 w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                  noteDark ? "text-white/60 hover:bg-white/15 hover:text-white" : "text-muted-foreground hover:bg-black/10 hover:text-foreground",
                )}
              >
                <X size={15} />
              </button>
            </div>

            {/* Editor body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="max-w-2xl mx-auto px-8 pt-8 pb-16">
                <input
                  ref={titleRef}
                  defaultValue={selected.title}
                  onChange={() => {
                    setSelected((s) => s ? { ...s, title: titleRef.current?.value ?? s.title } : null);
                    captureAndSave();
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); editorRef.current?.focus(); } }}
                  placeholder="Sin título"
                  className={cn(
                    "w-full text-[26px] font-heading font-bold bg-transparent border-none outline-none mb-1 leading-tight",
                    noteDark ? "text-white placeholder:text-white/20" : "text-foreground placeholder:text-foreground/20",
                  )}
                />
                <p className={cn("text-[11px] mb-5", noteDark ? "text-white/40" : "text-foreground/40")}>
                  {formatDate(selected.updatedAt)}
                </p>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={captureAndSave}
                  data-placeholder="Escribe algo…"
                  className={cn(
                    "min-h-[300px] outline-none text-[15px] leading-relaxed overflow-wrap-anywhere break-words [&_*]:max-w-full",
                    noteDark ? "text-white/90" : "text-foreground",
                    "[&_h1]:text-2xl [&_h1]:font-heading [&_h1]:font-bold [&_h1]:mt-7 [&_h1]:mb-2 [&_h1]:leading-tight",
                    "[&_h2]:text-xl [&_h2]:font-heading [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2",
                    "[&_h3]:text-[17px] [&_h3]:font-heading [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-1.5",
                    "[&_p]:mb-3 [&_p]:leading-relaxed",
                    "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1",
                    "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1",
                    noteDark
                      ? "[&_blockquote]:border-l-[3px] [&_blockquote]:border-white/30 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:text-white/60 [&_blockquote]:bg-white/10 [&_blockquote]:rounded-r-xl [&_blockquote]:italic"
                      : "[&_blockquote]:border-l-[3px] [&_blockquote]:border-foreground/20 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:text-foreground/60 [&_blockquote]:bg-black/5 [&_blockquote]:rounded-r-xl [&_blockquote]:italic",
                    "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:my-4 [&_img]:shadow-sm [&_img]:block",
                    "[&_b]:font-semibold [&_strong]:font-semibold",
                    noteDark
                      ? "empty:before:content-[attr(data-placeholder)] empty:before:text-white/25 empty:before:pointer-events-none"
                      : "empty:before:content-[attr(data-placeholder)] empty:before:text-foreground/25 empty:before:pointer-events-none",
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmación papelera ── */}
      {trashConfirm && (
        <TrashConfirmModal
          onConfirm={handleTrashConfirm}
          onCancel={() => setTrashConfirm(null)}
        />
      )}

      {/* ── Mover a carpeta ── */}
      {folderPicker && (
        <MoveFolderModal
          noteId={folderPicker.noteId}
          currentFolderId={folderPicker.folderId}
          folders={folders}
          onMove={handleMoveNote}
          onClose={() => setFolderPicker(null)}
        />
      )}

      {/* ── Confirmación eliminar carpeta ── */}
      {deleteFolderConfirm && (
        <DeleteFolderModal
          name={deleteFolderConfirm.name}
          noteCount={deleteFolderConfirm.count}
          onConfirm={handleDeleteFolder}
          onCancel={() => setDeleteFolderConfirm(null)}
        />
      )}
    </>
  );
}
