export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — dark navy with logo */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#011b6a] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#0ca5c1]/10 rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 right-0 w-1 h-32 bg-[#0ca5c1]/30 -translate-y-1/2" />

        <div className="relative z-10 text-center max-w-xs">
          {/* Logo blanco para fondo oscuro */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/logo-artica-2.png"
            alt="Artica Creative Studio"
            className="h-14 w-auto mx-auto mb-10 object-contain"
          />

          <div className="w-px h-10 bg-[#0ca5c1]/40 mx-auto mb-8" />

          <h2 className="text-2xl font-heading font-bold text-white mb-3">CRM Lite</h2>
          <p className="text-white/55 text-sm leading-relaxed">
            Plataforma interna para gestionar campañas de Meta Ads y Email Marketing.
          </p>

          <div className="mt-10 flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#0ca5c1]" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
          </div>
        </div>
      </div>

      {/* Right panel — white form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        {children}
      </div>
    </div>
  );
}
