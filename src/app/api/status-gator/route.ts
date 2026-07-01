import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// ── Server-side cache: scrape StatusGator once per CACHE_TTL, shared across all users ──
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
let cachedResponse: { data: unknown; cachedAt: number } | null = null;

type ServiceKey = "instagram" | "whatsapp" | "meta";

interface Issue {
  label: string;
  votes: number;
}

interface RecentOutage {
  description: string;
  duration: string;
  detectedAt: string;
}

interface ChartPoint {
  t: string;       // timestamp ISO
  v: number;       // interpolated_sum_value
  s: 0 | 1 | 2;   // status: 0=up, 1=possible, 2=likely outage
}

interface ServiceStatus {
  service: ServiceKey;
  name: string;
  status: "up" | "possible_outage" | "likely_outage" | "unknown";
  statusLabel: string;
  issues: Issue[];
  reportsLast24h: number | null;
  recentOutages: RecentOutage[];
  chartData: ChartPoint[];
  scrapedAt: string;
  error?: string;
}

const SERVICES: { key: ServiceKey; name: string; slug: string }[] = [
  { key: "instagram", name: "Instagram", slug: "instagram" },
  { key: "whatsapp", name: "WhatsApp", slug: "whatsapp" },
  { key: "meta", name: "Meta", slug: "meta" },
];

const STATUS_LABELS: Record<string, string> = {
  up: "Operativo",
  possible_outage: "Posible interrupción",
  likely_outage: "Interrupción probable",
  unknown: "Desconocido",
};

async function scrapeService(slug: string, key: ServiceKey, name: string): Promise<ServiceStatus> {
  const url = `https://statusgator.com/services/${slug}`;
  const scrapedAt = new Date().toISOString();

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!res.ok) {
      return { service: key, name, status: "unknown", statusLabel: STATUS_LABELS.unknown, issues: [], reportsLast24h: null, recentOutages: [], chartData: [], scrapedAt, error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // ── Status: h3 "[Service] is up / is down / is having issues" ─────────────
    let status: ServiceStatus["status"] = "unknown";

    $("h3").each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      if (text.endsWith(" is up") || text.includes(" is currently up")) {
        status = "up";
        return false;
      }
      if (text.endsWith(" is down") || text.includes("major outage")) {
        status = "likely_outage";
        return false;
      }
      if (text.includes("having issues") || text.includes("may be having") || text.includes("possible outage") || text.includes("is having a")) {
        status = "possible_outage";
        return false;
      }
    });

    // ── Reports in last 24h: extract from summary paragraph ──────────────────
    // e.g. "There have been 1834 user-submitted reports of outages in the past 24 hours."
    let reportsLast24h: number | null = null;
    $("p").each((_, el) => {
      const text = $(el).text();
      const match = text.match(/(\d[\d,]*)\s+user-submitted reports/i);
      if (match) {
        reportsLast24h = parseInt(match[1].replace(/,/g, ""), 10);
        return false;
      }
    });

    // ── Issues: li[aria-label] with x-data containing initialCount ───────────
    // Structure: <li aria-label="App not loading" x-data="{ initialCount: 478, count: 478 }">
    // The vote count is in x-data (static HTML), NOT in the Alpine.js-rendered span
    const issues: Issue[] = [];

    $("h3").each((_, heading) => {
      if (!$(heading).text().includes("Top reported issues")) return;

      $(heading).parent().find("li[aria-label]").each((_, li) => {
        const $li = $(li);

        // Label from aria-label attribute (always in static HTML)
        const label = $li.attr("aria-label")?.trim() ?? "";

        // Votes from x-data attribute: x-data="{ initialCount: 478, count: 478 }"
        const xData = $li.attr("x-data") ?? "";
        const countMatch = xData.match(/initialCount:\s*(\d+)/);
        const votes = countMatch ? parseInt(countMatch[1], 10) : 0;

        if (label && votes > 0) {
          issues.push({ label, votes });
        }
      });

      return false; // stop after first matching heading
    });

    // ── Chart data: inline script "var data = [...]" ─────────────────────────
    const chartData: ChartPoint[] = [];
    $("script:not([src])").each((_, el) => {
      const content = $(el).html() ?? "";
      if (!content.includes("interpolated_sum_value")) return;
      const match = content.match(/var data = (\[[\s\S]*?\]);/);
      if (!match) return;
      try {
        const raw = JSON.parse(match[1]) as { five_min: string; interpolated_sum_value: number; status: number }[];
        raw.forEach((d) => chartData.push({ t: d.five_min, v: d.interpolated_sum_value, s: d.status as 0 | 1 | 2 }));
      } catch { /* ignore parse errors */ }
      return false; // stop after first match
    });

    // ── Recent outages table ──────────────────────────────────────────────────
    // Table headers: Incident description | Duration | StatusGator detected | Officially acknowledged
    const recentOutages: RecentOutage[] = [];
    $("table tbody tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length >= 3) {
        const description = $(cells[0]).text().trim();
        const duration = $(cells[1]).text().trim();
        const detectedAt = $(cells[2]).text().trim();
        if (description && duration) {
          recentOutages.push({ description, duration, detectedAt });
        }
      }
    });

    return {
      service: key,
      name,
      status,
      statusLabel: STATUS_LABELS[status],
      issues: issues.slice(0, 8),
      reportsLast24h,
      recentOutages: recentOutages.slice(0, 5),
      chartData,
      scrapedAt,
    };
  } catch (err) {
    return {
      service: key,
      name,
      status: "unknown",
      statusLabel: STATUS_LABELS.unknown,
      issues: [],
      reportsLast24h: null,
      recentOutages: [],
      chartData: [],
      scrapedAt,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

const STATUS_EMOJI: Record<string, string> = {
  possible_outage: "⚠️",
  likely_outage: "🔴",
};

const STATUS_ES: Record<string, string> = {
  possible_outage: "Posible interrupción",
  likely_outage: "Interrupción probable",
};

function buildIncidentEmail(result: ServiceStatus): string {
  const emoji = STATUS_EMOJI[result.status] ?? "⚠️";
  const statusLabel = STATUS_ES[result.status] ?? result.status;
  const topIssues = result.issues.slice(0, 5);
  const issuesHtml = topIssues.length
    ? topIssues.map((i) => `
        <tr>
          <td style="padding:6px 12px;color:#374151;font-size:14px;">${i.label}</td>
          <td style="padding:6px 12px;color:#6b7280;font-size:14px;text-align:right;">${i.votes.toLocaleString()} votos</td>
        </tr>`).join("")
    : `<tr><td colspan="2" style="padding:8px 12px;color:#9ca3af;font-size:14px;">Sin problemas específicos reportados</td></tr>`;

  const crmUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
  // Logo: use Vercel Blob CDN URL (set via ANALYZER_META_LOGO_URL after running /api/admin/upload-logo)
  const logoUrl = process.env.ANALYZER_META_LOGO_URL ?? "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:${result.status === "likely_outage" ? "#ef4444" : "#f59e0b"};padding:20px 32px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  ${logoUrl ? `<img src="${logoUrl}" alt="Artica" height="32" style="display:block;height:32px;width:auto;margin-bottom:14px;filter:brightness(0) invert(1);opacity:0.95;">` : ""}
                  <p style="margin:0;color:#fff;font-size:12px;opacity:0.8;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">CRM Lite · Estado de Servicios</p>
                  <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700;line-height:1.2;">${emoji} ${statusLabel} detectada</h1>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Service info -->
        <tr>
          <td style="padding:28px 32px 0;">
            <p style="margin:0;font-size:16px;color:#111827;">
              Se ha detectado una <strong>${statusLabel.toLowerCase()}</strong> en
              <strong>${result.name}</strong>.
            </p>
            ${result.reportsLast24h ? `<p style="margin:12px 0 0;font-size:14px;color:#6b7280;">
              ${result.reportsLast24h.toLocaleString()} reportes de usuarios en las últimas 24 horas.
            </p>` : ""}
          </td>
        </tr>

        <!-- Issues table -->
        ${topIssues.length ? `
        <tr>
          <td style="padding:20px 32px 0;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Top problemas reportados</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;">
              ${issuesHtml}
            </table>
          </td>
        </tr>` : ""}

        <!-- CTA -->
        <tr>
          <td style="padding:28px 32px 32px;">
            <a href="${crmUrl}/status-gator"
               style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
              Ver detalle en el CRM →
            </a>
            <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">
              Fuente: <a href="https://statusgator.com/services/${result.service}" style="color:#6b7280;">statusgator.com</a>
              · ${new Date().toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function maybeRecordIncident(result: ServiceStatus) {
  if (result.status === "up" || result.status === "unknown") return;

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const recent = await prisma.serviceIncident.findFirst({
    where: {
      service: result.service,
      status: result.status,
      createdAt: { gte: thirtyMinutesAgo },
    },
  });

  if (recent) return; // already recorded in this window

  await prisma.serviceIncident.create({
    data: {
      service: result.service,
      status: result.status,
      issues: result.issues as object[],
    },
  });

  // Send email to all active admin and trafiker users
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "TRAFIKER"] }, isActive: true, deletedAt: null },
    select: { email: true, name: true },
  });

  const emoji = STATUS_EMOJI[result.status] ?? "⚠️";
  const statusLabel = STATUS_ES[result.status] ?? result.status;
  const html = buildIncidentEmail(result);

  await Promise.all(
    admins.map((admin) =>
      sendEmail({
        to: admin.email,
        subject: `${emoji} ${statusLabel} en ${result.name} · CRM Lite`,
        html,
      })
    )
  );
}

export async function GET(request: Request) {
  const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";
  const now = Date.now();

  // Return cached data if still fresh and not a forced refresh
  if (!forceRefresh && cachedResponse && now - cachedResponse.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(cachedResponse.data, {
      headers: { "X-Cache": "HIT", "X-Cache-Age": String(Math.round((now - cachedResponse.cachedAt) / 1000)) + "s" },
    });
  }

  try {
    const results = await Promise.all(
      SERVICES.map(({ key, name, slug }) => scrapeService(slug, key, name))
    );

    Promise.all(results.map(maybeRecordIncident)).catch(() => {});

    const payload = { services: results, fetchedAt: new Date().toISOString(), cachedUntil: new Date(now + CACHE_TTL_MS).toISOString() };
    cachedResponse = { data: payload, cachedAt: now };

    return NextResponse.json(payload, {
      headers: { "X-Cache": "MISS" },
    });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener datos de StatusGator" },
      { status: 500 }
    );
  }
}
