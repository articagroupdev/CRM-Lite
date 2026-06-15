"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  const user: AuthUser | null = session?.user
    ? {
        id: (session.user as any).id,
        email: session.user.email!,
        name: session.user.name,
        image: session.user.image,
        role: (session.user as any).role ?? "USER",
      }
    : null;

  const handleSignIn = async (email: string, password: string) => {
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.ok) return { ok: true };
    return { ok: false, error: res?.error ?? "Credenciales incorrectas" };
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin: user?.role === "ADMIN", signIn: handleSignIn, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
