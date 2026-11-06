// ─── AM · Estadísticas y consultas derivadas ───────────────────────────────
import { format, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale";
import type {
  AttendanceSession,
  CashTx,
  CreditPurchase,
  Student,
  Teacher,
} from "./types";
import { SLOTS } from "./types";
import { currentPeriod, parseDate, todayISO } from "./format";

interface DataSlice {
  students: Student[];
  teachers: Teacher[];
  purchases: CreditPurchase[];
  cashTxs: CashTx[];
  sessions: AttendanceSession[];
  cajaBase: number;
}

// ─── Créditos (sin dinero): 1 clase asistida = 1 crédito ───────────────────

/** Créditos comprados por el alumno (sesión = 1, pack4 = 4, pack5 = 5) */
export function purchasedCredits(data: DataSlice, studentId: string): number {
  return data.purchases
    .filter((p) => p.studentId === studentId)
    .reduce((acc, p) => acc + p.credits, 0);
}

/** Clases consumidas: asistencias (presente/tarde). La clase cero no descuenta. */
export function consumedCredits(data: DataSlice, studentId: string): number {
  let n = 0;
  for (const sess of data.sessions) {
    const rec = sess.records[studentId];
    if (!rec) continue;
    if (rec.visit === "clase_cero") continue;
    if (rec.status === "presente" || rec.status === "tarde") n++;
  }
  return n;
}

/** Saldo de créditos. Puede ser negativo: el niño debe clases. */
export function creditBalance(data: DataSlice, studentId: string): number {
  return purchasedCredits(data, studentId) - consumedCredits(data, studentId);
}

/** Alumnos con saldo bajo o negativo, del más debedor al mejor saldo */
export function studentsByCredit(data: DataSlice, max = Infinity) {
  return data.students
    .filter((s) => s.active)
    .map((s) => ({ student: s, balance: creditBalance(data, s.id) }))
    .filter((x) => x.balance <= max)
    .sort((a, b) => a.balance - b.balance);
}

// ─── Caja (dinero, solo Admin) ──────────────────────────────────────────────

const isIngreso = (t: CashTx) => t.kind === "clases" || t.kind === "venta";

/** Saldo actual de la caja: fondo + ingresos (clases y ventas) − pagos a profesores */
export function cajaBalance(data: DataSlice): number {
  const movs = data.cashTxs.reduce((acc, t) => {
    return acc + (isIngreso(t) ? t.amount : -t.amount);
  }, 0);
  return data.cajaBase + movs;
}

export function cashIncome(data: DataSlice, period?: string): number {
  return data.cashTxs
    .filter((t) => isIngreso(t) && (!period || t.date.startsWith(period)))
    .reduce((a, t) => a + t.amount, 0);
}

export function cashOutcome(data: DataSlice, period?: string): number {
  return data.cashTxs
    .filter((t) => t.kind === "pago_profe" && (!period || t.date.startsWith(period)))
    .reduce((a, t) => a + t.amount, 0);
}

/** Ingresos por mes de los últimos N meses (clases + ventas de componentes) */
export function monthlyIncome(data: DataSlice, months = 6) {
  const out: { period: string; label: string; total: number; egresos: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = format(d, "yyyy-MM");
    const total = cashIncome(data, period);
    const egresos = cashOutcome(data, period);
    out.push({ period, label: format(d, "MMM", { locale: es }).replace(".", ""), total, egresos });
  }
  return out;
}

/** Totales de ventas de componentes por ítem (histórico) */
export function salesByItem(data: DataSlice) {
  const totals = new Map<string, number>();
  for (const t of data.cashTxs) {
    if (t.kind !== "venta" || !t.itemId) continue;
    totals.set(t.itemId, (totals.get(t.itemId) ?? 0) + t.amount);
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

// ─── Asistencia ─────────────────────────────────────────────────────────────

const attendedRec = (r: { status: string }) => r.status === "presente" || r.status === "tarde";

/** % de asistencia general, por franja o periodo; attended = presente + tarde */
export function attendanceRate(
  data: DataSlice,
  opts?: { slotId?: string; period?: string }
): number | null {
  const sessions = data.sessions.filter(
    (s) =>
      (!opts?.slotId || s.slotId === opts.slotId) &&
      (!opts?.period || s.date.startsWith(opts.period))
  );
  let total = 0;
  let attended = 0;
  for (const s of sessions) {
    for (const rec of Object.values(s.records)) {
      total++;
      if (attendedRec(rec)) attended++;
    }
  }
  if (total === 0) return null;
  return Math.round((attended / total) * 100);
}

/** % de asistencia de un alumno */
export function studentAttendancePct(data: DataSlice, studentId: string): number | null {
  let total = 0;
  let attended = 0;
  for (const s of data.sessions) {
    const rec = s.records[studentId];
    if (!rec) continue;
    total++;
    if (attendedRec(rec)) attended++;
  }
  if (total === 0) return null;
  return Math.round((attended / total) * 100);
}

/** % de asistencia por semana (últimas N semanas con datos) */
export function weeklyAttendance(data: DataSlice, weeks = 6) {
  const buckets = new Map<string, { total: number; attended: number }>();
  for (const s of data.sessions) {
    const wk = format(startOfWeek(parseDate(s.date), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const b = buckets.get(wk) ?? { total: 0, attended: 0 };
    for (const rec of Object.values(s.records)) {
      b.total++;
      if (attendedRec(rec)) b.attended++;
    }
    buckets.set(wk, b);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-weeks)
    .map(([wk, b]) => ({
      week: wk,
      label: format(parseDate(wk), "d MMM", { locale: es }).replace(".", ""),
      pct: Math.round((b.attended / b.total) * 100),
    }));
}

/** Sesiones de una franja, de la más reciente a la más antigua */
export function slotSessions(data: DataSlice, slotId: string) {
  return data.sessions
    .filter((s) => s.slotId === slotId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Franjas que dan clase hoy (viernes o sábado) */
export function todaySlots() {
  const dow = getDay(new Date());
  return SLOTS.filter((s) => s.dayOfWeek === dow);
}

// ─── Consultas varias ───────────────────────────────────────────────────────

export function studentById(data: DataSlice, id: string) {
  return data.students.find((s) => s.id === id);
}

export function teacherById(data: DataSlice, id: string) {
  return data.teachers.find((t) => t.id === id);
}

/** Movimientos de caja ordenados del más reciente al más antiguo */
export function cashHistory(data: DataSlice, limit?: number) {
  const list = [...data.cashTxs].sort((a, b) => b.date.localeCompare(a.date));
  return limit ? list.slice(0, limit) : list;
}

/** Total pagado a un profesor (histórico) */
export function teacherPaidTotal(data: DataSlice, teacherId: string): number {
  return data.cashTxs
    .filter((t) => t.kind === "pago_profe" && t.teacherId === teacherId)
    .reduce((a, t) => a + t.amount, 0);
}

/** Periodo actual "YYYY-MM" */
export { currentPeriod };
