// ─── BitLab · Utilidades de formato (COP + fechas es-CO) ───────────────────
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";

const numberFmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** $130.000 (COP sin decimales) */
export function money(n: number): string {
  return `$${numberFmt.format(Math.round(n))}`;
}

/** $1,2 M — para ejes de gráficas y KPIs compactos */
export function moneyCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    const v = n / 1_000_000;
    return `$${v.toFixed(1).replace(".", ",")} M`;
  }
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1000)} mil`;
  return money(n);
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function currentPeriod(): string {
  return format(new Date(), "yyyy-MM");
}

export function iso(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function parseDate(isoStr: string): Date {
  const d = parseISO(isoStr);
  return isValid(d) ? d : new Date();
}

/** "6 nov 2026" */
export function fmtDate(isoStr: string): string {
  return format(parseDate(isoStr), "d MMM yyyy", { locale: es });
}

/** "6 nov" */
export function fmtDateShort(isoStr: string): string {
  return format(parseDate(isoStr), "d MMM", { locale: es });
}

/** Nombre de mes con mayúscula: "Noviembre" */
export function monthName(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMMM yyyy", { locale: es });
}

export function monthShort(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMM", { locale: es });
}

/** Días entre una fecha ISO y hoy (positivo = pasado, negativo = futuro) */
export function daysFromToday(isoStr: string): number {
  const a = parseDate(isoStr).getTime();
  const b = parseDate(todayISO()).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** "12 años" a partir de la fecha de nacimiento */
export function age(birthDate: string): number {
  const b = parseDate(birthDate);
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
}

/** Iniciales para el avatar: "Santiago Gómez" -> "SG" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase();
}

/** "lunes", "martes"… */
export const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
