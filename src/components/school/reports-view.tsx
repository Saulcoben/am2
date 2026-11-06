"use client";

// ─── AM · Vista Reportes (solo Admin): ingresos, asistencia e informes ─────
import { useMemo } from "react";
import { useSchool } from "@/lib/school/store";
import { SEDE } from "@/lib/school/types";
import { money, moneyCompact, currentPeriod, monthName } from "@/lib/school/format";
import {
  attendanceRate,
  cajaBalance,
  cashIncome,
  cashOutcome,
  monthlyIncome,
  studentsByCredit,
  weeklyAttendance,
} from "@/lib/school/stats";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Coins, FileDown, FileJson, HandCoins, TrendingUp } from "lucide-react";

const TOOLTIP_STYLE = {
  background: "#111318",
  border: "1px solid #2a2e37",
  borderRadius: 12,
  fontSize: 12,
  color: "#e4e4e7",
} as const;

export function ReportsView() {
  const students = useSchool((s) => s.students);
  const teachers = useSchool((s) => s.teachers);
  const purchases = useSchool((s) => s.purchases);
  const cashTxs = useSchool((s) => s.cashTxs);
  const sessions = useSchool((s) => s.sessions);
  const cajaBase = useSchool((s) => s.cajaBase);

  const data = useMemo(
    () => ({ students, teachers, purchases, cashTxs, sessions, cajaBase }),
    [students, teachers, purchases, cashTxs, sessions, cajaBase]
  );

  const revenue = monthlyIncome(data, 6);
  const weekly = weeklyAttendance(data, 6);

  const total6m = revenue.reduce((a, r) => a + r.total, 0);
  const egresos6m = revenue.reduce((a, r) => a + r.egresos, 0);
  const asisMes = attendanceRate(data, { period: currentPeriod() });
  const deudores = studentsByCredit(data, 0);
  const saldo = cajaBalance(data);

  const exportCsv = () => {
    const rows = [["Fecha", "Tipo", "Concepto", "Ingreso", "Egreso", "Nota"]];
    for (const t of [...cashTxs].sort((a, b) => b.date.localeCompare(a.date))) {
      rows.push([
        t.date,
        t.kind === "clases" ? "Pago de clases" : t.kind === "venta" ? "Venta" : "Pago a profesor",
        t.label,
        t.kind === "pago_profe" ? "" : String(t.amount),
        t.kind === "pago_profe" ? String(t.amount) : "",
        t.note ?? "",
      ]);
    }
    rows.push(["", "", "Saldo en caja", "", String(cajaBalance(data)), ""]);
    const csv = "\ufeff" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `am-caja-${currentPeriod()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Informe de caja descargado (CSV)");
  };

  const exportJson = () => {
    const { students: st, teachers: tt, purchases: pp, cashTxs: cts, sessions: ss, cajaBase: cb } = useSchool.getState();
    const payload = { sede: SEDE, students: st, teachers: tt, purchases: pp, cashTxs: cts, sessions: ss, cajaBase: cb };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `am-respaldo-${currentPeriod()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Respaldo completo descargado (JSON)");
  };

  const stats = [
    {
      label: "Ingresos (6 meses)",
      value: moneyCompact(total6m),
      icon: Coins,
      tone: "text-emerald-400",
    },
    {
      label: "Pagado a profes (6 meses)",
      value: moneyCompact(egresos6m),
      icon: HandCoins,
      tone: "text-rose-400",
    },
    {
      label: "Asistencia del mes",
      value: asisMes === null ? "—" : `${asisMes}%`,
      icon: TrendingUp,
      tone: "text-cyan-400",
    },
    {
      label: "Niños que deben créditos",
      value: String(deudores.length),
      icon: Coins,
      tone: "text-amber-400",
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">Reportes</h1>
        <p className="text-xs text-zinc-500">
          Ingresos en efectivo y asistencia · Sede {SEDE} · {monthName(currentPeriod())}
        </p>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-card p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                {s.label}
              </p>
              <s.icon className={`size-4 ${s.tone}`} />
            </div>
            <p className={`tabular mt-1.5 font-mono text-lg font-bold ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Ingresos vs egresos por mes */}
      <section aria-label="Ingresos por mes" className="rounded-xl border border-zinc-800 bg-card p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Caja por mes</h2>
          <span className="text-[11px] text-zinc-500">COP</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenue} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#8b8f98", fontSize: 11 }}
                axisLine={{ stroke: "#27272a" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => moneyCompact(v)}
                tick={{ fill: "#8b8f98", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={62}
              />
              <Tooltip
                cursor={{ fill: "rgba(34,211,238,0.06)" }}
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => money(Number(v))}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#8b8f98" }}
                formatter={(value) => (value === "total" ? "Ingresos" : "Pagos a profes")}
              />
              <Bar dataKey="total" name="Ingresos" fill="#22d3ee" radius={[6, 6, 0, 0]} maxBarSize={26} />
              <Bar dataKey="egresos" name="Pagos a profes" fill="#fb7185" radius={[6, 6, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="tabular mt-2 text-center text-xs text-zinc-500">
          Saldo actual en caja: <b className="text-zinc-300">{money(saldo)}</b>
        </p>
      </section>

      {/* Asistencia semanal */}
      <section aria-label="Tendencia de asistencia" className="rounded-xl border border-zinc-800 bg-card p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Asistencia por semana</h2>
          <span className="text-[11px] text-zinc-500">% que asistió</span>
        </div>
        {weekly.length === 0 ? (
          <p className="py-10 text-center text-xs text-zinc-500">Aún no hay sesiones registradas.</p>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#8b8f98", fontSize: 11 }}
                  axisLine={{ stroke: "#27272a" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fill: "#8b8f98", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Asistencia"]} />
                <Line
                  type="monotone"
                  dataKey="pct"
                  stroke="#34d399"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#34d399", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Descargas */}
      <section aria-label="Descarga de informes" className="rounded-xl border border-zinc-800 bg-card p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Descarga de informes</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Archivos generados con los datos guardados en este navegador.
        </p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <button
            onClick={exportCsv}
            className="flex min-h-11 items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/60 p-3 text-left transition-colors hover:border-cyan-500/40 hover:bg-accent/40"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
              <FileDown className="size-4 text-cyan-400" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-zinc-200">Informe de caja</span>
              <span className="block text-[11px] text-zinc-500">CSV · movimientos y saldo</span>
            </span>
          </button>
          <button
            onClick={exportJson}
            className="flex min-h-11 items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/60 p-3 text-left transition-colors hover:border-violet-500/40 hover:bg-accent/40"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10">
              <FileJson className="size-4 text-violet-400" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-zinc-200">Respaldo completo</span>
              <span className="block text-[11px] text-zinc-500">JSON · alumnos, asistencia y caja</span>
            </span>
          </button>
        </div>
      </section>

      <p className="pb-2 text-center text-[11px] text-zinc-600">
        Los reportes se calculan con los datos de la sede {SEDE}.
      </p>
    </div>
  );
}
