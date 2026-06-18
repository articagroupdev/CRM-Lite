"use client";

import { useState } from "react";
import Link from "next/link";
import { EnvelopeSimple, CircleNotch, CheckCircle, ArrowLeft } from "@phosphor-icons/react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al enviar el correo");
      } else {
        setSent(true);
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Mobile logo */}
      <div className="lg:hidden text-center mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-artica-1.png" alt="Artica" className="h-9 w-auto mx-auto mb-4 object-contain" />
        <p className="text-[#011b6a]/50 text-xs tracking-wide">CRM Lite</p>
      </div>

      {sent ? (
        <div className="text-center">
          <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={30} weight="fill" className="text-green-500" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-[#011b6a] mb-2">Revisa tu correo</h1>
          <p className="text-gray-400 text-sm mb-6">
            Si el email <span className="font-medium text-[#011b6a]/70">{email}</span> está registrado,
            recibirás un enlace para restablecer tu contraseña en los próximos minutos.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[#0ca5c1] hover:text-[#011b6a] transition-colors text-sm font-medium"
          >
            <ArrowLeft size={14} />
            Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <div className="w-12 h-12 bg-[#011b6a]/8 rounded-xl flex items-center justify-center mb-5">
              <EnvelopeSimple size={24} className="text-[#011b6a]" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-[#011b6a]">Recuperar contraseña</h1>
            <p className="text-gray-400 text-sm mt-1.5">
              Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#011b6a] hover:bg-[#02308a] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <CircleNotch size={17} className="animate-spin" />}
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>

          <p className="text-center text-sm mt-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-gray-400 hover:text-[#011b6a] transition-colors"
            >
              <ArrowLeft size={14} />
              Volver al inicio de sesión
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
