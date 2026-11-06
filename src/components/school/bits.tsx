"use client";

// ─── AM · Piezas de UI compartidas ─────────────────────────────────────────
import type { AccentColor } from "@/lib/school/types";
import { SLOTS } from "@/lib/school/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { initials } from "@/lib/school/format";

export const MODULE_STYLE: Record<
  AccentColor,
  { badge: string; dot: string; hex: string }
> = {
  cyan: {
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    dot: "bg-cyan-400",
    hex: "#22d3ee",
  },
  emerald: {
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
    hex: "#34d399",
  },
  amber: {
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
    hex: "#fbbf24",
  },
  rose: {
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    dot: "bg-rose-400",
    hex: "#fb7185",
  },
  violet: {
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    dot: "bg-violet-400",
    hex: "#a78bfa",
  },
  sky: {
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    dot: "bg-sky-400",
    hex: "#38bdf8",
  },
};

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full border border-zinc-700/80 bg-gradient-to-br from-zinc-700/60 to-zinc-800 text-xs font-semibold text-zinc-300",
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

export function ModuleBadge({
  shortName,
  color,
  className,
}: {
  shortName: string;
  color: AccentColor;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none",
        MODULE_STYLE[color].badge,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", MODULE_STYLE[color].dot)} />
      {shortName}
    </span>
  );
}

/** Etiqueta de franja horaria: "Vie 2–4 pm" (viernes cian, sábado violeta) */
export function SlotBadge({ slotId, className }: { slotId: string; className?: string }) {
  const slot = SLOTS.find((s) => s.id === slotId);
  if (!slot) return null;
  const cls =
    slot.dayOfWeek === 5
      ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/25"
      : "bg-violet-500/10 text-violet-300 border-violet-500/25";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none",
        cls,
        className
      )}
    >
      {slot.short}
    </span>
  );
}

/** Saldo de créditos del niño (positivo, cero o negativo = debe) */
export function CreditsBadge({ value, className }: { value: number; className?: string }) {
  const config =
    value > 0
      ? { cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30", label: `${value} crédito${value === 1 ? "" : "s"}` }
      : value === 0
        ? { cls: "bg-zinc-800 text-zinc-400 border-zinc-700", label: "Sin créditos" }
        : { cls: "bg-rose-500/10 text-rose-300 border-rose-500/30", label: `Debe ${Math.abs(value)}` };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular",
        config.cls,
        className
      )}
    >
      {config.label}
    </span>
  );
}

/** Insignia de por qué asistió fuera de su franja */
export function VisitBadge({ visit }: { visit: "otro_horario" | "otra_sede" | "clase_cero" }) {
  const config = {
    otro_horario: { label: "Otro horario", cls: "bg-sky-500/10 text-sky-300 border-sky-500/30" },
    otra_sede: { label: "Otra sede", cls: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
    clase_cero: { label: "Clase cero", cls: "bg-violet-500/10 text-violet-300 border-violet-500/30" },
  }[visit];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none",
        config.cls
      )}
    >
      {config.label}
    </span>
  );
}

export function AttendanceMark({ status }: { status: "presente" | "tarde" | "ausente" }) {
  const config = {
    presente: { icon: CheckCircle2, cls: "text-emerald-400", label: "Presente" },
    tarde: { icon: Clock3, cls: "text-amber-400", label: "Tarde" },
    ausente: { icon: XCircle, cls: "text-rose-400", label: "Ausente" },
  }[status];
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", config.cls)}>
      <Icon className="size-3.5" />
      {config.label}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "cyan",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "cyan" | "emerald" | "amber" | "rose" | "violet";
}) {
  const toneCls = {
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  }[tone];
  return (
    <div className="rounded-xl border border-zinc-800 bg-card p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </span>
        <span className={cn("flex size-7 items-center justify-center rounded-lg border", toneCls)}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <div className="tabular mt-1.5 font-mono text-xl font-semibold text-zinc-100">{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-zinc-500">{sub}</div> : null}
    </div>
  );
}

export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-zinc-800/80">
        <Icon className="size-5 text-zinc-500" />
      </span>
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {hint ? <p className="max-w-64 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}
