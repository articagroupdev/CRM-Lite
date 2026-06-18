"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { getMyProfileAction, changePasswordAction } from "@/app/actions/users";
import { updateProfileFullAction } from "@/app/actions/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  User, EnvelopeSimple, LockSimple, Camera, CircleNotch,
  CheckCircle, Eye, EyeSlash, UserCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export default function PerfilPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Profile state
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingProfile(true);
    getMyProfileAction().then((p) => {
      if (p && !("error" in p)) {
        setName(p.name ?? "");
        setLastName((p as any).lastName ?? "");
        setImage((p as any).image ?? null);
      }
      setEmail(user.email ?? "");
      setLoadingProfile(false);
    });
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Imagen muy grande", description: "Máximo 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) { toast({ title: "El nombre es requerido", variant: "destructive" }); return; }
    setSavingProfile(true);
    try {
      const result = await updateProfileFullAction({ name: name.trim(), lastName: lastName.trim() || undefined, email: email.trim(), image: image ?? undefined });
      if (result && "error" in result) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Perfil actualizado" });
        window.dispatchEvent(new Event("profile-updated"));
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Completa todos los campos", variant: "destructive" }); return;
    }
    if (newPassword.length < 8) {
      toast({ title: "La nueva contraseña debe tener al menos 8 caracteres", variant: "destructive" }); return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Las contraseñas no coinciden", variant: "destructive" }); return;
    }
    setSavingPassword(true);
    try {
      const result = await changePasswordAction(currentPassword, newPassword);
      if (result && "error" in result) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Contraseña actualizada" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = [name, lastName].filter(Boolean).map((s) => s[0]).join("").toUpperCase() || user?.name?.[0]?.toUpperCase() || "U";

  const inputClass = "border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary";

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <UserCircle size={24} className="text-primary" weight="duotone" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground">Mi Perfil</h1>
          <p className="text-sm text-muted-foreground">Gestiona tu información personal y contraseña</p>
        </div>
      </div>

      {/* Personal Info */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <User size={16} className="text-primary" weight="duotone" />
            <CardTitle className="text-base">Información personal</CardTitle>
          </div>
          <CardDescription>Actualiza tu nombre, correo y foto de perfil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-16 h-16 ring-2 ring-border">
                {image && <AvatarImage src={image} alt={name} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
              >
                <Camera size={12} className="text-primary-foreground" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{[name, lastName].filter(Boolean).join(" ") || "Sin nombre"}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
              <button onClick={() => fileRef.current?.click()} className="text-xs text-primary hover:underline mt-1">
                Cambiar foto
              </button>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan" className={cn(inputClass, "pl-8")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Apellido</Label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Pérez" className={cn(inputClass, "pl-8")} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Correo electrónico</Label>
            <div className="relative">
              <EnvelopeSimple size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" className={cn(inputClass, "pl-8")} />
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={savingProfile || loadingProfile} className="w-full sm:w-auto">
            {savingProfile ? <CircleNotch size={15} className="animate-spin mr-2" /> : <CheckCircle size={15} className="mr-2" />}
            {savingProfile ? "Guardando..." : "Guardar cambios"}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <LockSimple size={16} className="text-primary" weight="duotone" />
            <CardTitle className="text-base">Cambiar contraseña</CardTitle>
          </div>
          <CardDescription>Usa una contraseña segura de al menos 8 caracteres</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Contraseña actual</Label>
            <div className="relative">
              <LockSimple size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(inputClass, "pl-8 pr-9")}
              />
              <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showCurrent ? <EyeSlash size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nueva contraseña</Label>
            <div className="relative">
              <LockSimple size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(inputClass, "pl-8 pr-9")}
              />
              <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNew ? <EyeSlash size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Confirmar nueva contraseña</Label>
            <div className="relative">
              <LockSimple size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showNew ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(inputClass, "pl-8")}
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
            )}
          </div>

          <Button onClick={handleSavePassword} disabled={savingPassword} className="w-full sm:w-auto">
            {savingPassword ? <CircleNotch size={15} className="animate-spin mr-2" /> : <LockSimple size={15} className="mr-2" />}
            {savingPassword ? "Actualizando..." : "Actualizar contraseña"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
