"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  getUsersAction,
  createUserAction,
  updateUserAction,
  updateUserRoleAction,
  toggleUserStatusAction,
  moveToTrashAction,
  restoreFromTrashAction,
  permanentDeleteAction,
} from "@/app/actions/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Users,
  DotsThree,
  ShieldCheck,
  UserCircle,
  Power,
  Trash,
  Plus,
  MagnifyingGlass,
  List,
  SquaresFour,
  Rows,
  PencilSimple,
  ArrowCounterClockwise,
  Camera,
  Warning,
  Megaphone,
  X,
  Eye,
  EyeSlash,
  Shuffle,
  MagnifyingGlassPlus,
  CalendarBlank,
} from "@phosphor-icons/react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";

type UserRole = "ADMIN" | "TRAFIKER" | "USER";

interface User {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  image: string | null;
  birthDate: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}

interface UserFormData {
  name: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  birthDate: string;
  image: string;
}

type ViewMode = "compact" | "large" | "grid";
type RoleFilter = "ALL" | UserRole;
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const EMPTY_FORM: UserFormData = {
  name: "",
  lastName: "",
  email: "",
  password: "",
  role: "USER",
  birthDate: "",
  image: "",
};

function displayName(u: User) {
  const parts = [u.name, u.lastName].filter(Boolean);
  return parts.join(" ") || u.email;
}

function initials(u: User) {
  const parts = [u.name, u.lastName].filter((p): p is string => !!p);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (u.name?.[0] ?? u.email[0]).toUpperCase();
}

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "ADMIN")
    return (
      <Badge className="text-xs gap-1 bg-foreground text-background hover:bg-foreground/90">
        <ShieldCheck size={10} weight="fill" />
        Admin
      </Badge>
    );
  if (role === "TRAFIKER")
    return (
      <Badge className="text-xs gap-1 bg-blue-500 text-white hover:bg-blue-600">
        <Megaphone size={10} weight="fill" />
        Trafiker
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-xs gap-1">
      <UserCircle size={10} weight="fill" />
      Usuario
    </Badge>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant={isActive ? "success" : "secondary"}
      className="text-xs"
    >
      {isActive ? "Activo" : "Inactivo"}
    </Badge>
  );
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function generatePassword(length = 14) {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const special = "@#$!%&*";
  const all = lower + upper + digits + special;
  const required = [
    lower[Math.floor(Math.random() * lower.length)],
    upper[Math.floor(Math.random() * upper.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  const rest = Array.from({ length: length - 4 }, () =>
    all[Math.floor(Math.random() * all.length)]
  );
  return [...required, ...rest].sort(() => Math.random() - 0.5).join("");
}


// ── Date Picker Field ─────────────────────────────────────────────────────────

function DatePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const date = value
    ? (() => {
        const [y, m, d] = value.split("-").map(Number);
        return new Date(y, m - 1, d);
      })()
    : undefined;

  function handleSelect(d: Date | undefined) {
    if (d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      onChange(`${y}-${m}-${day}`);
    } else {
      onChange("");
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-9",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarBlank size={15} className="mr-2 flex-shrink-0 opacity-60" />
          {date
            ? date.toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : "Seleccionar fecha"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          defaultMonth={date ?? new Date(2000, 0)}
          captionLayout="dropdown-buttons"
          fromYear={1930}
          toYear={new Date().getFullYear()}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ── Image Crop Dialog ─────────────────────────────────────────────────────────

async function getCroppedImage(src: string, pixelCrop: Area): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = Math.min(pixelCrop.width, pixelCrop.height);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, pixelCrop.x, pixelCrop.y, size, size, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = src;
  });
}

function ImageCropDialog({
  open, src, onClose, onConfirm,
}: {
  open: boolean;
  src: string;
  onClose: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  useEffect(() => {
    if (open) { setCrop({ x: 0, y: 0 }); setZoom(1); }
  }, [open]);

  async function handleConfirm() {
    if (!croppedArea) return;
    const url = await getCroppedImage(src, croppedArea);
    onConfirm(url);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Recortar foto de perfil</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-64 rounded-xl overflow-hidden bg-black/90">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setCroppedArea(pixels)}
          />
        </div>
        <div className="flex items-center gap-3 px-1">
          <MagnifyingGlassPlus size={16} className="text-muted-foreground flex-shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm}>Aplicar recorte</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── User Form Dialog ──────────────────────────────────────────────────────────

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: UserFormData) => Promise<void>;
  initial?: Partial<UserFormData>;
  title: string;
  isEdit?: boolean;
  isSelf?: boolean;
  saving?: boolean;
}

function UserFormDialog({ open, onClose, onSave, initial, title, isEdit, isSelf, saving }: UserDialogProps) {
  const [form, setForm] = useState<UserFormData>({ ...EMPTY_FORM, ...initial });
  const [showPassword, setShowPassword] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, ...initial });
      setShowPassword(false);
      setCropSrc(null);
    }
  }, [open]);

  const set = (k: keyof UserFormData, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar upload */}
          <div className="flex justify-center">
            <div
              className="relative w-20 h-20 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary transition-colors group"
              onClick={() => fileRef.current?.click()}
            >
              {form.image ? (
                <img src={form.image} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <Camera size={28} className="text-muted-foreground group-hover:text-primary transition-colors" />
              )}
              {form.image && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Juan"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="García"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="juan@ejemplo.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">
              {isEdit ? "Nueva contraseña (vacío = no cambiar)" : "Contraseña *"}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder={isEdit ? "••••••••" : "Mínimo 8 caracteres"}
                  required={!isEdit}
                  minLength={form.password ? 8 : undefined}
                  className="pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Generar contraseña aleatoria"
                onClick={() => {
                  const pwd = generatePassword();
                  set("password", pwd);
                  setShowPassword(true);
                }}
              >
                <Shuffle size={16} />
              </Button>
            </div>
          </div>

          <div className={isSelf ? "space-y-1.5" : "grid grid-cols-2 gap-3"}>
            {!isSelf && (
              <div className="space-y-1.5">
                <Label>Rol *</Label>
                <Select value={form.role} onValueChange={(v) => set("role", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="TRAFIKER">Trafiker</SelectItem>
                    <SelectItem value="USER">Usuario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Fecha de nacimiento</Label>
              <DatePickerField
                value={form.birthDate}
                onChange={(v) => set("birthDate", v)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {cropSrc && (
        <ImageCropDialog
          open={!!cropSrc}
          src={cropSrc}
          onClose={() => setCropSrc(null)}
          onConfirm={(url) => { set("image", url); setCropSrc(null); }}
        />
      )}
    </Dialog>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Eliminar",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warning size={20} className="text-destructive" weight="fill" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? "Eliminando…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Action Menu ───────────────────────────────────────────────────────────────

interface ActionMenuProps {
  user: User;
  isCurrentUser: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  inTrash: boolean;
}

function ActionMenu({
  user,
  isCurrentUser,
  onEdit,
  onToggleStatus,
  onTrash,
  onRestore,
  onPermanentDelete,
  inTrash,
}: ActionMenuProps) {
  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {isCurrentUser && <span className="text-xs text-muted-foreground px-2">Tú</span>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
            <DotsThree size={16} weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {inTrash ? (
            <>
              <DropdownMenuItem onClick={onRestore}>
                <ArrowCounterClockwise size={14} />
                Restaurar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onPermanentDelete}
              >
                <Trash size={14} />
                Eliminar permanentemente
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={onEdit}>
                <PencilSimple size={14} />
                Editar perfil
              </DropdownMenuItem>
              {!isCurrentUser && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onToggleStatus}>
                    <Power size={14} />
                    {user.isActive ? "Desactivar" : "Activar"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onTrash}
                  >
                    <Trash size={14} />
                    Mover a papelera
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("compact");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [showTrash, setShowTrash] = useState(false);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/");
      return;
    }
    load();
  }, [isAdmin]);

  async function load() {
    setLoading(true);
    const result = await getUsersAction();
    if (Array.isArray(result)) setUsers(result as User[]);
    else toast({ title: "Error", description: (result as { error: string }).error, variant: "destructive" });
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (showTrash && !u.deletedAt) return false;
      if (!showTrash && u.deletedAt) return false;
      if (search) {
        const q = search.toLowerCase();
        const full = `${u.name} ${u.lastName ?? ""} ${u.email}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (statusFilter === "ACTIVE" && !u.isActive) return false;
      if (statusFilter === "INACTIVE" && u.isActive) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter, showTrash]);

  const activeCount = users.filter((u) => !u.deletedAt).length;
  const trashCount = users.filter((u) => !!u.deletedAt).length;

  // ── Handlers ────────────────────────────────────────────────

  async function handleCreate(form: UserFormData) {
    setSaving(true);
    const result = await createUserAction({
      name: form.name,
      lastName: form.lastName || undefined,
      email: form.email,
      password: form.password,
      role: form.role,
      birthDate: form.birthDate || undefined,
      image: form.image || undefined,
    });
    setSaving(false);
    if ("error" in result) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Usuario creado" });
    setUsers((prev) => [result as User, ...prev]);
    setCreateOpen(false);
  }

  async function handleEdit(form: UserFormData) {
    if (!editUser) return;
    const isSelf = editUser.id === currentUser?.id;
    setSaving(true);
    const result = await updateUserAction(editUser.id, {
      name: form.name,
      lastName: form.lastName || undefined,
      email: form.email,
      password: form.password || undefined,
      role: isSelf ? undefined : form.role,
      birthDate: form.birthDate || undefined,
      image: form.image || undefined,
    });
    setSaving(false);
    if ("error" in result) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Usuario actualizado" });
    setUsers((prev) => prev.map((u) => u.id === editUser.id ? (result as User) : u));
    // Notificar al sidebar si el admin editó su propio perfil
    if (editUser.id === currentUser?.id) {
      window.dispatchEvent(new Event("profile-updated"));
    }
    setEditUser(null);
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    const result = await updateUserRoleAction(userId, role);
    if ("error" in result) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Rol actualizado" });
    setUsers((prev) => prev.map((u) => u.id === userId ? (result as User) : u));
  }

  async function handleToggleStatus(userId: string) {
    const result = await toggleUserStatusAction(userId);
    if ("error" in result) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Estado actualizado" });
    setUsers((prev) => prev.map((u) => u.id === userId ? (result as User) : u));
  }

  async function handleTrash(userId: string) {
    const result = await moveToTrashAction(userId);
    if ("error" in result) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Movido a papelera" });
    setUsers((prev) => prev.map((u) => u.id === userId ? (result as User) : u));
  }

  async function handleRestore(userId: string) {
    const result = await restoreFromTrashAction(userId);
    if ("error" in result) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Usuario restaurado" });
    setUsers((prev) => prev.map((u) => u.id === userId ? (result as User) : u));
  }

  async function handlePermanentDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    const result = await permanentDeleteAction(confirmDelete.id);
    setDeleting(false);
    if ("error" in result) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Usuario eliminado" });
    setUsers((prev) => prev.filter((u) => u.id !== confirmDelete.id));
    setConfirmDelete(null);
  }

  function openEdit(u: User) {
    setEditUser(u);
  }

  function editInitial(u: User): Partial<UserFormData> {
    return {
      name: u.name,
      lastName: u.lastName ?? "",
      email: u.email,
      password: "",
      role: u.role,
      birthDate: u.birthDate
        ? new Date(u.birthDate).toISOString().split("T")[0]
        : "",
      image: u.image ?? "",
    };
  }

  // ── Loading skeletons ────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Render helpers ───────────────────────────────────────────

  const actionProps = (u: User) => ({
    user: u,
    isCurrentUser: u.id === currentUser?.id,
    onEdit: () => openEdit(u),
    onToggleStatus: () => handleToggleStatus(u.id),
    onTrash: () => handleTrash(u.id),
    onRestore: () => handleRestore(u.id),
    onPermanentDelete: () => setConfirmDelete(u),
    inTrash: !!u.deletedAt,
  });

  // ── COMPACT LIST VIEW ────────────────────────────────────────

  function CompactList() {
    return (
      <div className="border rounded-lg divide-y overflow-hidden">
        {filtered.length === 0 && <EmptyState />}
        {filtered.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <Avatar className="w-9 h-9 flex-shrink-0">
              {u.image && <AvatarImage src={u.image} alt={displayName(u)} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials(u)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate leading-tight">{displayName(u)}</p>
              <p className="text-muted-foreground text-xs truncate">{u.email}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <RoleBadge role={u.role} />
              <StatusBadge isActive={u.isActive} />
              <ActionMenu {...actionProps(u)} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── LARGE LIST VIEW ──────────────────────────────────────────

  function LargeList() {
    return (
      <div className="border rounded-lg divide-y overflow-hidden">
        {filtered.length === 0 && <EmptyState />}
        {filtered.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <Avatar className="w-12 h-12 flex-shrink-0">
              {u.image && <AvatarImage src={u.image} alt={displayName(u)} />}
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {initials(u)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
              <div>
                <p className="font-semibold text-sm leading-tight">{displayName(u)}</p>
                <p className="text-muted-foreground text-xs">{u.email}</p>
              </div>
              <div className="flex flex-col gap-0.5">
                {u.birthDate && (
                  <p className="text-xs text-muted-foreground">
                    Nac. {formatDate(u.birthDate)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Registrado {formatDate(u.createdAt)}
                </p>
                {u.deletedAt && (
                  <p className="text-xs text-destructive">
                    Eliminado {formatDate(u.deletedAt)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <RoleBadge role={u.role} />
              <StatusBadge isActive={u.isActive} />
              <ActionMenu {...actionProps(u)} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── GRID VIEW ────────────────────────────────────────────────

  function GridView() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-full">
            <EmptyState />
          </div>
        )}
        {filtered.map((u) => (
          <div
            key={u.id}
            className="border rounded-xl p-5 flex flex-col items-center gap-3 hover:shadow-md transition-shadow bg-card"
          >
            <Avatar className="w-16 h-16">
              {u.image && <AvatarImage src={u.image} alt={displayName(u)} />}
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initials(u)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center min-w-0 w-full">
              <p className="font-semibold text-sm truncate">{displayName(u)}</p>
              <p className="text-muted-foreground text-xs truncate">{u.email}</p>
              {u.birthDate && (
                <p className="text-muted-foreground text-xs mt-0.5">
                  Nac. {formatDate(u.birthDate)}
                </p>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap justify-center">
              <RoleBadge role={u.role} />
              <StatusBadge isActive={u.isActive} />
            </div>
            <p className="text-muted-foreground text-xs">
              {formatDate(u.createdAt)}
            </p>
            <div className="w-full pt-1 border-t flex justify-center">
              <ActionMenu {...actionProps(u)} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── EMPTY STATE ──────────────────────────────────────────────

  function EmptyState() {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
        <Users size={40} weight="thin" />
        <p className="text-sm">
          {search || roleFilter !== "ALL" || statusFilter !== "ALL"
            ? "No hay usuarios que coincidan con los filtros"
            : showTrash
            ? "La papelera está vacía"
            : "No hay usuarios registrados"}
        </p>
        {(search || roleFilter !== "ALL" || statusFilter !== "ALL") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setRoleFilter("ALL"); setStatusFilter("ALL"); }}>
            <X size={14} /> Limpiar filtros
          </Button>
        )}
      </div>
    );
  }

  // ── PAGE RENDER ──────────────────────────────────────────────

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <Users size={22} weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold leading-tight">Usuarios</h1>
            <p className="text-muted-foreground text-sm">{activeCount} usuario{activeCount !== 1 ? "s" : ""} registrado{activeCount !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus size={16} weight="bold" />
          Nuevo usuario
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo…"
            className="pl-9 h-9"
          />
          {search && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
          <SelectTrigger className="w-full sm:w-36 h-9">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los roles</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="TRAFIKER">Trafiker</SelectItem>
            <SelectItem value="USER">Usuario</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-36 h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="ACTIVE">Activos</SelectItem>
            <SelectItem value="INACTIVE">Inactivos</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggles */}
        <div className="flex items-center border rounded-lg overflow-hidden flex-shrink-0">
          <button
            onClick={() => setView("compact")}
            className={`h-9 w-9 flex items-center justify-center transition-colors ${
              view === "compact" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
            title="Vista compacta"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setView("large")}
            className={`h-9 w-9 flex items-center justify-center border-x transition-colors ${
              view === "large" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
            title="Vista detallada"
          >
            <Rows size={16} />
          </button>
          <button
            onClick={() => setView("grid")}
            className={`h-9 w-9 flex items-center justify-center transition-colors ${
              view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
            title="Vista cuadrícula"
          >
            <SquaresFour size={16} />
          </button>
        </div>
      </div>

      {/* Tabs: Activos / Papelera */}
      <div className="flex items-center gap-1 border-b">
        <button
          onClick={() => setShowTrash(false)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            !showTrash
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Activos
          <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
            {activeCount}
          </span>
        </button>
        <button
          onClick={() => setShowTrash(true)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
            showTrash
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Trash size={14} />
          Papelera
          {trashCount > 0 && (
            <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">
              {trashCount}
            </span>
          )}
        </button>
      </div>

      {/* Results count */}
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground -mt-3">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* User list */}
      {view === "compact" && <CompactList />}
      {view === "large" && <LargeList />}
      {view === "grid" && <GridView />}

      {/* Create dialog */}
      <UserFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
        title="Nuevo usuario"
        saving={saving}
      />

      {/* Edit dialog */}
      <UserFormDialog
        open={!!editUser}
        onClose={() => setEditUser(null)}
        onSave={handleEdit}
        initial={editUser ? editInitial(editUser) : undefined}
        title={editUser?.id === currentUser?.id ? "Editar mi perfil" : "Editar usuario"}
        isEdit
        isSelf={editUser?.id === currentUser?.id}
        saving={saving}
      />

      {/* Permanent delete confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handlePermanentDelete}
        title="Eliminar permanentemente"
        description={`¿Estás seguro de que quieres eliminar a ${confirmDelete ? displayName(confirmDelete) : ""}? Esta acción no se puede deshacer.`}
        loading={deleting}
      />
    </div>
  );
}
