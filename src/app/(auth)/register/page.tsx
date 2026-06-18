"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  EnvelopeSimple,
  LockSimple,
  User,
  CircleNotch,
  Eye,
  EyeSlash,
  CheckCircle,
  ArrowLeft,
} from "@phosphor-icons/react";

// ── Verification step ──────────────────────────────────────────────────────────

function VerifyStep({
  userId,
  email,
  password,
  name,
  onBack,
}: {
  userId: string;
  email: string;
  password: string;
  name: string;
  onBack: () => void;
}) {
  const { signIn } = useAuth();
  const router = useRouter();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleDigit = (i: number, val: string) => {
    const ch = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = ch;
    setDigits(next);
    if (ch && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    pasted.split("").forEach((ch, i) => { if (i < 6) next[i] = ch; });
    setDigits(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) { setError("Ingresa los 6 dígitos del código"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Código incorrecto"); setLoading(false); return; }

      // Verification OK — try auto-login, fallback to login page with success banner
      try {
        const login = await signIn(email, password);
        if (login.ok) { router.push("/"); return; }
      } catch { /* ignore, fallback below */ }
      router.push("/login?verified=1");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setResendMsg("");
    setError("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Extract cooldown seconds from error message if rate-limited
        const match = data.error?.match(/(\d+)s/);
        if (match) setCooldown(parseInt(match[1], 10));
        else setError(data.error || "Error al reenviar");
      } else {
        setResendMsg("Código reenviado. Revisa tu correo.");
        setCooldown(60);
        setDigits(["", "", "", "", "", ""]);
        setTimeout(() => refs.current[0]?.focus(), 50);
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setResending(false);
    }
  };

  const inputClass =
    "w-11 h-14 text-center text-xl font-bold text-[#011b6a] border border-gray-200 rounded-xl focus:outline-none focus:border-[#011b6a] focus:ring-2 focus:ring-[#011b6a]/20 transition-all bg-white caret-transparent";

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
          <EnvelopeSimple size={24} className="text-[#011b6a]" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-[#011b6a]">Verifica tu cuenta</h1>
        <p className="text-gray-400 text-sm mt-1.5">
          Enviamos un código de 6 dígitos a{" "}
          <span className="font-medium text-[#011b6a]/70">{email}</span>
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
      )}
      {resendMsg && (
        <div className="mb-5 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle size={16} weight="fill" />
          {resendMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex justify-between gap-2 mb-8" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={inputClass}
              autoComplete="one-time-code"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || digits.join("").length < 6}
          className="w-full bg-[#011b6a] hover:bg-[#02308a] disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading && <CircleNotch size={17} className="animate-spin" />}
          {loading ? "Verificando..." : "Verificar cuenta"}
        </button>
      </form>

      <div className="mt-6 text-center space-y-2">
        <p className="text-gray-400 text-sm">
          ¿No recibiste el código?{" "}
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="text-[#0ca5c1] hover:text-[#011b6a] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending ? "Reenviando..." : cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar código"}
          </button>
        </p>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-400 hover:text-[#011b6a] text-sm transition-colors mx-auto"
        >
          <ArrowLeft size={14} />
          Volver al registro
        </button>
      </div>
    </div>
  );
}

// ── Registration form step ─────────────────────────────────────────────────────

export default function RegisterPage() {
  const [step, setStep] = useState<"form" | "verify">("form");
  const [verifyData, setVerifyData] = useState<{
    userId: string;
    email: string;
    password: string;
    name: string;
  } | null>(null);

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

      // Move to verification step
      setVerifyData({ userId: data.userId, email: form.email, password: form.password, name: form.name });
      setStep("verify");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  if (step === "verify" && verifyData) {
    return (
      <VerifyStep
        {...verifyData}
        onBack={() => { setStep("form"); setLoading(false); }}
      />
    );
  }

  const inputClass =
    "w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-[#011b6a] placeholder-gray-300 text-sm focus:outline-none focus:border-[#011b6a] focus:ring-1 focus:ring-[#011b6a] transition-colors bg-white";
  const labelClass = "block text-sm font-medium text-[#011b6a]/80 mb-1.5";

  return (
    <div className="w-full max-w-sm">
      {/* Mobile logo */}
      <div className="lg:hidden text-center mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-artica-1.png" alt="Artica" className="h-9 w-auto mx-auto mb-4 object-contain" />
        <p className="text-[#011b6a]/50 text-xs tracking-wide">CRM Lite</p>
      </div>

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
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
