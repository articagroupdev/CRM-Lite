"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { LockSimple, Eye, EyeSlash, CircleNotch, CheckCircle, Warning } from "@phosphor-icons/react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="w-12 h-12 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center mx-auto mb-5">
          <Warning size={24} weight="fill" className="text-red-500" />
        </div>
        <h1 className="text-xl font-heading font-bold text-[#011b6a] mb-2">Enlace inválido</h1>
        <p className="text-gray-400 text-sm mb-6">Este enlace no es válido o ha expirado. Solicita un nuevo enlace de recuperación.</p>
        <Link href="/forgot-password" className="text-[#0ca5c1] hover:text-[#011b6a] text-sm font-medium transition-colors">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={30} weight="fill" className="text-green-500" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-[#011b6a] mb-2">Contraseña actualizada</h1>
        <p className="text-gray-400 text-sm mb-6">Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión.</p>
        <button
          onClick={() => router.push("/login")}
          className="bg-[#011b6a] hover:bg-[#02308a] text-white font-semibold py-2.5 px-8 rounded-lg transition-colors text-sm"
        >
          Ir al inicio de sesión
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al restablecer la contraseña"); return; }
      setDone(true);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border border-gray-200 rounded-lg pl-9 pr-10 py-2.5 text-[#011b6a] placeholder-gray-300 text-sm focus:outline-none focus:border-[#011b6a] focus:ring-1 focus:ring-[#011b6a] transition-colors bg-white";

  return (
    <div className="w-full max-w-sm">
      {/* Mobile logo */}
      <div className="lg:hidden text-center mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-artica-1.png" alt="Artica" className="h-9 w-auto mx-auto mb-4 object-contain" />
        <p className="text-[#011b6a]/50 text-xs tracking-wide">CRM Lite</p>
      </div>

      <div className="mb-8">
        <div className="w-12 h-12 bg-[#011b6a]/8 rounded-xl flex items-center justify-center mb-5">
          <LockSimple size={24} className="text-[#011b6a]" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-[#011b6a]">Nueva contraseña</h1>
        <p className="text-gray-400 text-sm mt-1.5">Elige una contraseña segura de al menos 8 caracteres.</p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#011b6a]/80 mb-1.5">Nueva contraseña</label>
          <div className="relative">
            <LockSimple size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#011b6a]/80 mb-1.5">Confirmar contraseña</label>
          <div className="relative">
            <LockSimple size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#011b6a] hover:bg-[#02308a] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading && <CircleNotch size={17} className="animate-spin" />}
          {loading ? "Guardando..." : "Restablecer contraseña"}
        </button>
      </form>

      <p className="text-center mt-6">
        <Link href="/login" className="text-gray-400 hover:text-[#011b6a] text-sm transition-colors">
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
