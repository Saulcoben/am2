"use client";

// ─── AM · Vista Inicio (dashboard por rol, sin dinero para el profesor) ────
import { useMemo } from "react";
import { useSchool } from "@/lib/school/store";
import { SEDE, SLOTS } from "@/lib/school/types";
import {
  currentPeriod,
  fmtDateShort,
  money,
  monthName,
} from "@/lib/school/format";
import {
  attendanceRate,
  cajaBalance,
  cashHistory,
  creditBalance,
  studentsByCredit,
  todaySlots,
} from "@/lib/school/stats";
import { Avatar, CreditsBadge, EmptyState, KpiCard, SlotBadge, SectionTitle } from "./bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Coins,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

export function DashboardView({
  onTakeAttendance,
  onGoCaja,
}: {
  onTakeAttendance: (slotId: string) => void;
  onGoCaja: () => void;
}) {
  const role = useSchool((s) => s.role);
  const students = useSchool((s) => s.students);
  const teachers = useSchool((s) => s.teachers);
  const purchases = useSchool((s) => s.purchases);
  const cashTxs = useSchool((s) => s.cashTxs);
  const sessions = useSchool((s) => s.sessions);
  const cajaBase = useSchool((s) => s.cajaBase);

  const isAdmin = role === "admin";

  const data = useMemo(
    () => ({ students, teachers, purchases, cashTxs, sessions, cajaBase }),
    [students, teachers, purchases, cashTxs, sessions, cajaBase]
  );

  const activeCount = students.filter((s) => s.active).length;
  const asisMes = attendanceRate(data, { period: currentPeriod() });
  const deudores = studentsByCredit(data, 0);
  const hoy = todaySlots();
  const period = currentPeriod();

  const lastCash = cashHistory(data, 3);
  const saldo = cajaBalance(data);

  return (
    <div className="space-y-6">
      {/* Saludo + sede */}
      <div>
        <p className="text-xs text-zinc-500">Sede {SEDE} · {monthName(period)}</p>
        <h1 className="text-lg font-bold text-zinc-100">
          {isAdmin ? "Panel del Admin" : "Panel del Profesor"}
        </h1>
      </div>

      {/* KPIs (sin dinero para el profesor) */}
      <section aria-label="Resumen">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Niños activos" value={String(activeCount)} icon={Users} tone="cyan" />
          <KpiCard
            label="Asistencia del mes"
            value={asisMes === null ? "—" : `${asisMes}%`}
            icon={TrendingUp}
            tone="emerald"
          />
          <KpiCard
            label="Niños que deben créditos"
            value={String(deudores.length)}
            sub="Saldo en 0 o negativo"
            icon={Coins}
            tone="rose"
          />
          {isAdmin ? (
            <KpiCard
              label="Saldo en caja"
              value={money(saldo)}
              sub="Efectivo de la sede"
              icon={Wallet}
              tone="violet"
            />
          ) : (
            <KpiCard
              label="Clases esta semana"
              value={String(SLOTS.length)}
              sub="Viernes y sábados"
              icon={CalendarDays}
              tone="violet"
            />
          )}
        </div>
      </section>

      {isAdmin && (
        <Button
          variant="outline"
          className="h-auto w-full gap-2 whitespace-normal rounded-xl py-2.5 text-left text-xs sm:text-sm"
          onClick={onGoCaja}
        >
          <Wallet className="size-4 shrink-0 text-cyan-400" />
          <span className="min-w-0 flex-1">
            Ver caja: ingresos en efectivo, ventas de componentes y pagos a profesores
          </span>
          <ChevronRight className="size-4 shrink-0 text-zinc-500" />
        </Button>
      )}

      {/* Clases de hoy */}
      <section aria-label="Clases de hoy">
        <SectionTitle title="Clases de hoy" hint="Pase de lista por franja" />
        {hoy.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Hoy no hay clases"
            hint="Las clases se dictan viernes y sábados. Revisa la pestaña Asistencia para sesiones pasadas."
          />
        ) : (
          <div className="space-y-2.5">
            {hoy.map((sl) => {
              const inscritos = students.filter((s) => s.active && s.slotId === sl.id);
              return (
                <div
                  key={sl.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-card p-3.5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <SlotBadge slotId={sl.id} />
                      <span className="text-xs font-medium capitalize text-zinc-300">{sl.day}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {sl.label.replace(/^Viernes |^Sábado /, "")} · {inscritos.length} niños
                    </p>
                  </div>
                  <Button
                    onClick={() => onTakeAttendance(sl.id)}
                    className="h-10 shrink-0 gap-1.5 rounded-xl px-3 text-xs"
                  >
                    <ClipboardCheck className="size-4" />
                    Pasar lista
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Niños con créditos bajos o negativos */}
      <section aria-label="Créditos por recargar">
        <SectionTitle
          title="Créditos por recargar"
          hint="Saldo en cero o negativo (cada clase asistida resta 1 crédito)"
        />
        {deudores.length === 0 ? (
          <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            Todos los niños tienen créditos disponibles.
          </p>
        ) : (
          <div className="divide-y divide-zinc-800/70 overflow-hidden rounded-xl border border-zinc-800 bg-card">
            {deudores.map(({ student: s, balance }) => (
              <div key={s.id} className="flex items-center gap-3 p-3">
                <Avatar name={s.name} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-100">{s.name}</p>
                  <p className="text-[11px] text-zinc-500">
                    Módulo {s.moduleId.replace("m", "M")} · punto {s.moduleStep}
                  </p>
                </div>
                <CreditsBadge value={balance} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Últimos movimientos de caja (solo Admin) */}
      {isAdmin && (
        <section aria-label="Últimos movimientos de caja">
          <SectionTitle
            title="Últimos movimientos de caja"
            action={
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-cyan-400" onClick={onGoCaja}>
                Ver caja <ChevronRight className="size-3.5" />
              </Button>
            }
          />
          {lastCash.length === 0 ? (
            <EmptyState icon={Wallet} title="Sin movimientos todavía" />
          ) : (
            <div className="divide-y divide-zinc-800/70 overflow-hidden rounded-xl border border-zinc-800 bg-card">
              {lastCash.map((t) => {
                const isIngreso = t.kind !== "pago_profe";
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">{t.label}</p>
                      <p className="text-xs text-zinc-500">{fmtDateShort(t.date)}</p>
                    </div>
                    <p
                      className={cn(
                        "tabular font-mono text-sm font-semibold",
                        isIngreso ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {isIngreso ? "+" : "−"}
                      {money(t.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <p className="pb-2 text-center text-[11px] text-zinc-600">
        Prototipo AM · los datos se guardan en este navegador
      </p>
    </div>
  );
}
