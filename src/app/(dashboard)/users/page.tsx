"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { getUsersAction, updateUserRoleAction, toggleUserStatusAction, deleteUserAction } from "@/app/actions/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, DotsThree, ShieldCheck, UserCircle, Power, Trash } from "@phosphor-icons/react";

type User = { id: string; name: string | null; email: string; role: "ADMIN" | "USER"; isActive: boolean; createdAt: Date; image: string | null };

export default function UsersPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { router.push("/"); return; }
    loadUsers();
  }, [isAdmin]);

  async function loadUsers() {
    setLoading(true);
    const result = await getUsersAction();
    if (Array.isArray(result)) setUsers(result as User[]);
    else toast({ title: "Error", description: (result as any).error, variant: "destructive" });
    setLoading(false);
  }

  async function handleRoleChange(userId: string, newRole: "ADMIN" | "USER") {
    const result = await updateUserRoleAction(userId, newRole);
    if ("error" in result) { toast({ title: "Error", description: result.error, variant: "destructive" }); return; }
    toast({ title: "Rol actualizado" });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
  }

  async function handleToggleStatus(userId: string) {
    const result = await toggleUserStatusAction(userId);
    if ("error" in result) { toast({ title: "Error", description: result.error, variant: "destructive" }); return; }
    toast({ title: "Estado actualizado" });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive: !u.isActive } : u));
  }

  async function handleDelete(userId: string, name: string) {
    if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return;
    const result = await deleteUserAction(userId);
    if ("error" in result) { toast({ title: "Error", description: result.error, variant: "destructive" }); return; }
    toast({ title: "Usuario eliminado" });
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Users size={24} weight="duotone" /></div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Usuarios</h1>
            <p className="text-muted-foreground text-sm">{users.length} usuarios registrados</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-60" /></div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {u.name?.[0]?.toUpperCase() ?? u.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{u.name ?? "Sin nombre"}</p>
                    <p className="text-muted-foreground text-xs truncate">{u.email}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Registrado {new Date(u.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={u.role === "ADMIN" ? "default" : "outline"} className="text-xs">
                      {u.role === "ADMIN" ? "Admin" : "Usuario"}
                    </Badge>
                    <Badge variant={u.isActive ? "success" : "secondary"} className="text-xs">
                      {u.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                    {u.id !== currentUser?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><DotsThree size={16} weight="bold" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRoleChange(u.id, u.role === "ADMIN" ? "USER" : "ADMIN")}>
                            {u.role === "ADMIN" ? <UserCircle size={14} /> : <ShieldCheck size={14} />}
                            {u.role === "ADMIN" ? "Quitar Admin" : "Hacer Admin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(u.id)}>
                            <Power size={14} />{u.isActive ? "Desactivar" : "Activar"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(u.id, u.name ?? u.email)}>
                            <Trash size={14} />Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {u.id === currentUser?.id && <span className="text-xs text-muted-foreground px-2">Tú</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
