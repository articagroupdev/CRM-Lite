"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { EnvelopeSimple, LockSimple, CircleNotch, Eye, EyeSlash } from "@phosphor-icons/react";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn(email, password);
    if (res.ok) {
      router.push("/");
    } else {
      setError("Email o contraseña incorrectos");
      setLoading(false);
    }
  };

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
        <h1 className="text-2xl font-heading font-bold text-[#011b6a]">Iniciar Sesión</h1>
        <p className="text-gray-400 text-sm mt-1">Accede a tu cuenta para continuar.</p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#011b6a]/80 mb-1.5">Email</label>
          <div className="relative">
            <EnvelopeSimple size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="correo@ejemplo.com"
              className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-[#011b6a] placeholder-gray-300 text-sm focus:outline-none focus:border-[#011b6a] focus:ring-1 focus:ring-[#011b6a] transition-colors bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#011b6a]/80 mb-1.5">Contraseña</label>
          <div className="relative">
            <LockSimple size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-lg pl-9 pr-10 py-2.5 text-[#011b6a] placeholder-gray-300 text-sm focus:outline-none focus:border-[#011b6a] focus:ring-1 focus:ring-[#011b6a] transition-colors bg-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#011b6a] hover:bg-[#02308a] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-1"
        >
          {loading ? <CircleNotch size={17} className="animate-spin" /> : null}
          {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
        </button>
      </form>

      <p className="text-center text-gray-400 text-sm mt-8">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-[#0ca5c1] hover:text-[#011b6a] transition-colors font-medium">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
