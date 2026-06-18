"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  EnvelopeSimple,
  LockSimple,
  CircleNotch,
  Eye,
  EyeSlash,
  CheckCircle,
  ArrowLeft,
  Warning,
} from "@phosphor-icons/react";

// ── Verification step ──────────────────────────────────────────────────────────

function VerifyStep({
  userId,
  email,
  password,
  onBack,
}: {
  userId: string;
  email: string;
  password: string;
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

  useEffect(() => { refs.current[0]?.focus(); }, []);

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
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
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
      setError("Error de conexión.");
    } finally {
      setResending(false);
    }
  };

  const inputClass =
    "w-11 h-14 text-center text-xl font-bold text-[#011b6a] border border-gray-200 rounded-xl focus:outline-none focus:border-[#011b6a] focus:ring-2 focus:ring-[#011b6a]/20 transition-all bg-white caret-transparent";

  return (
    <div className="w-full max-w-sm">
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
          <CheckCircle size={16} weight="fill" /> {resendMsg}
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
        <button onClick={onBack} className="flex items-center gap-1.5 text-gray-400 hover:text-[#011b6a] text-sm transition-colors mx-auto">
          <ArrowLeft size={14} /> Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
}

// ── Login form ─────────────────────────────────────────────────────────────────

function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justVerified = searchParams.get("verified") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<"credentials" | "unverified" | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState("");

  const [pendingVerify, setPendingVerify] = useState<{
    userId: string;
    email: string;
    password: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await signIn(email, password);
      if (res.ok) {
        router.push("/");
        return;
      }
      if (res.error === "EMAIL_NOT_VERIFIED") {
        setVerifyingEmail(email);
        setError("unverified");
      } else {
        setError("credentials");
      }
    } catch {
      setError("credentials");
    }
    setLoading(false);
  };

  const handleGoVerify = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyingEmail }),
      });
      const data = await res.json();
      if (data.userId) {
        setPendingVerify({ userId: data.userId, email: verifyingEmail, password });
      }
    } catch {
      // fallthrough — still show verify step if we have a userId somehow
    }
    setLoading(false);
  };

  if (pendingVerify) {
    return (
      <VerifyStep
        {...pendingVerify}
        onBack={() => { setPendingVerify(null); setError(null); }}
      />
    );
  }

  return (
    <div className="w-full max-w-sm">
      {/* Mobile logo */}
      <div className="lg:hidden text-center mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-artica-1.png" alt="Artica" className="h-9 w-auto mx-auto mb-4 object-contain" />
        <p className="text-[#011b6a]/50 text-xs tracking-wide">CRM Lite</p>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-[#011b6a]">Iniciar Sesión</h1>
        <p className="text-gray-400 text-sm mt-1">Accede a tu cuenta para continuar.</p>
      </div>

      {justVerified && (
        <div className="mb-5 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle size={16} weight="fill" className="flex-shrink-0" />
          ¡Cuenta verificada! Ya puedes iniciar sesión.
        </div>
      )}

      {error === "credentials" && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          Email o contraseña incorrectos
        </div>
      )}

      {error === "unverified" && (
        <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <div className="flex items-start gap-2">
            <Warning size={16} weight="fill" className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Cuenta no verificada</p>
              <p className="text-amber-700">
                Tu cuenta aún no ha sido verificada.{" "}
                <button
                  onClick={handleGoVerify}
                  disabled={loading}
                  className="underline font-semibold hover:text-amber-900 transition-colors disabled:opacity-50"
                >
                  {loading ? "Enviando código..." : "Verificar cuenta"}
                </button>
              </p>
            </div>
          </div>
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
              onClick={() => setShowPassword((v) => !v)}
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

      <p className="text-center mt-4">
        <Link href="/forgot-password" className="text-gray-400 hover:text-[#011b6a] text-sm transition-colors">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>

      <p className="text-center text-gray-400 text-sm mt-4">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-[#0ca5c1] hover:text-[#011b6a] transition-colors font-medium">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
