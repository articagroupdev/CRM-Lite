"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { EnvelopeSimple, LockSimple, User, CircleNotch, Eye, EyeSlash } from "@phosphor-icons/react";

export default function RegisterPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Las contraseñas no coinciden"); return; }
    if (form.password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al crear cuenta"); setLoading(false); return; }
      const login = await signIn(form.email, form.password);
      if (login.ok) router.push("/");
      else { setError("Cuenta creada. Por favor inicia sesión."); setLoading(false); }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-[#011b6a] placeholder-gray-300 text-sm focus:outline-none focus:border-[#011b6a] focus:ring-1 focus:ring-[#011b6a] transition-colors bg-white";
  const labelClass = "block text-sm font-medium text-[#011b6a]/80 mb-1.5";

  return (
    <div className="w-full max-w-sm">
      {/* Mobile logo */}
      <div className="lg:hidden text-center mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/logo-artica-1.png"
          alt="Artica Creative Studio"
          className="h-9 w-auto mx-auto mb-4 object-contain"
        />
        <p className="text-[#011b6a]/50 text-xs tracking-wide">CRM Lite</p>
      </div>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-[#011b6a]">Crear Cuenta</h1>
        <p className="text-gray-400 text-sm mt-1">Completa los datos para registrarte.</p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Nombre completo</label>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={form.name} onChange={set("name")} required placeholder="Juan Pérez" className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Email</label>
          <div className="relative">
            <EnvelopeSimple size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="email" value={form.email} onChange={set("email")} required placeholder="correo@ejemplo.com" className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Contraseña</label>
          <div className="relative">
            <LockSimple size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              required
              minLength={8}
              placeholder="••••••••"
              className={inputClass + " pr-10"}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <label className={labelClass}>Confirmar contraseña</label>
          <div className="relative">
            <LockSimple size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type={showPassword ? "text" : "password"} value={form.confirm} onChange={set("confirm")} required minLength={8} placeholder="••••••••" className={inputClass} />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#011b6a] hover:bg-[#02308a] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-1"
        >
          {loading && <CircleNotch size={17} className="animate-spin" />}
          {loading ? "Creando cuenta..." : "Crear Cuenta"}
        </button>
      </form>

      <p className="text-center text-gray-400 text-sm mt-8">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-[#0ca5c1] hover:text-[#011b6a] transition-colors font-medium">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
