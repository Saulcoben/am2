// ─── AM · Datos demo sembrados (relativos a la fecha actual) ───────────────
import { format, subDays, getDay } from "date-fns";
import type {
  AttendanceRecord,
  AttendanceSession,
  CatalogEntry,
  CreditPurchase,
  CashTx,
  SchoolData,
  Student,
  Teacher,
} from "./types";
import { catalogEntry } from "./types";

/** RNG determinista para que la demo sea estable */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** "2026-11" + offset de meses */
function periodAdd(period: string, offset: number): string {
  const [y, m] = period.split("-").map(Number);
  return format(new Date(y, m - 1 + offset, 1), "yyyy-MM");
}

/** Saldo de créditos que queremos que muestre cada alumno en la demo */
const TARGET_BALANCE: Record<string, number> = {
  s1: 3, s2: 4, s3: 2, s4: 5, s5: -2, s6: 1, s7: 2, s8: 3,
  s9: -3, s10: 2, s11: 1, s12: 6, s13: 4, s14: 2, s15: -1,
  s16: 0, s17: 0,
};

/** Demo: ventas de componentes (Admin → Caja) */
const DUMMY_SALES: Array<{ itemId: string; qty: number; studentId?: string; daysAgo: number }> = [
  { itemId: "kit-otto", qty: 1, studentId: "s5", daysAgo: 32 },
  { itemId: "comp-servomotor", qty: 2, studentId: "s8", daysAgo: 28 },
  { itemId: "kit-nivel-1", qty: 1, studentId: "s12", daysAgo: 24 },
  { itemId: "comp-ultrasonido", qty: 1, studentId: "s3", daysAgo: 19 },
  { itemId: "comp-infrarrojo", qty: 3, daysAgo: 15 },
  { itemId: "comp-buzzer", qty: 2, studentId: "s14", daysAgo: 11 },
  { itemId: "kit-arana", qty: 1, daysAgo: 8 },
  { itemId: "comp-servomotor", qty: 1, studentId: "s1", daysAgo: 5 },
  { itemId: "comp-ultrasonido", qty: 2, studentId: "s10", daysAgo: 2 },
];

/** Demo: pagos a profesores (descuentan de la caja) */
const DUMMY_TEACHER_PAYMENTS: Array<{ teacherId: string; amount: number; daysAgo: number; note?: string }> = [
  { teacherId: "t1", amount: 120_000, daysAgo: 21, note: "Quincena 1" },
  { teacherId: "t2", amount: 100_000, daysAgo: 14, note: "Quincena 1" },
  { teacherId: "t3", amount: 150_000, daysAgo: 10 },
  { teacherId: "t1", amount: 120_000, daysAgo: 7, note: "Quincena 2" },
];

const NOTES = [
  "Llegó 15 min tarde",
  "Excusa médica enviada por el acudiente",
  "Lo recogieron media hora antes",
  "Avisó que llegaría tarde por el tráfico",
  "Falta justificada por el acudiente",
  "Muy participativo en la clase de hoy",
];

export function buildSeed(): SchoolData & { cajaBase: number } {
  const rng = mulberry32(20261107);
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const thisPeriod = format(now, "yyyy-MM");
  const prevPeriod = periodAdd(thisPeriod, -1);

  // ── Profesores ────────────────────────────────────────────────────────────
  const teachers: Teacher[] = [
    { id: "t1", name: "Profe 1", active: true },
    { id: "t2", name: "Profe 2", active: true },
    { id: "t3", name: "Profe 3", active: true },
  ];

  // ── Fechas de sesión: últimas 4 de cada franja (sin hoy) ────────────────
  const SLOT_IDS = ["vie-14", "vie-16", "sab-10", "sab-14", "sab-16"];
  const slotDates = new Map<string, string[]>();
  for (const slotId of SLOT_IDS) {
    const dow = slotId.startsWith("vie") ? 5 : 6;
    const dates: string[] = [];
    let cursor = subDays(now, 1);
    while (dates.length < 4) {
      if (getDay(cursor) === dow && format(cursor, "yyyy-MM-dd") !== today)
        dates.push(format(cursor, "yyyy-MM-dd"));
      cursor = subDays(cursor, 1);
    }
    slotDates.set(slotId, dates);
  }

  // ── Alumnos repartidos en las 5 franjas (viernes y sábado) ───────────────
  const raw: Array<Omit<Student, "active"> & { active?: boolean }> = [
    { id: "s1", name: "Santiago Gómez Rincón", birthDate: "2011-04-12", guardianName: "Diana Rincón", guardianPhone: "320 445 1202", guardianEmail: "diana.rincon@gmail.com", moduleId: "m6", moduleStep: 2, slotId: "vie-14", joinedAt: "2025-08-15" },
    { id: "s2", name: "Valentina Ruiz Pardo", birthDate: "2010-09-03", guardianName: "Claudia Pardo", guardianPhone: "310 255 8802", moduleId: "m7", moduleStep: 1, slotId: "vie-16", joinedAt: "2025-07-02" },
    { id: "s3", name: "Mateo Torres Cárdenas", birthDate: "2012-01-25", guardianName: "Andrés Torres", guardianPhone: "300 512 7741", moduleId: "m5", moduleStep: 4, slotId: "sab-10", joinedAt: "2025-09-10" },
    { id: "s4", name: "Gabriela Ospina Londoño", birthDate: "2009-07-18", guardianName: "Liliana Londoño", guardianPhone: "312 885 4410", guardianEmail: "lili.londono@hotmail.com", moduleId: "m3", moduleStep: 3, slotId: "sab-14", joinedAt: "2026-02-20" },
    { id: "s5", name: "Juan David Restrepo", birthDate: "2013-03-30", guardianName: "Catalina Restrepo", guardianPhone: "318 774 2210", moduleId: "m2", moduleStep: 3, slotId: "vie-14", joinedAt: "2026-03-05" },
    { id: "s6", name: "Isabela Moreno Piñeros", birthDate: "2011-11-14", guardianName: "Óscar Moreno", guardianPhone: "301 447 9912", moduleId: "m5", moduleStep: 2, slotId: "vie-16", originSede: "Pereira", notes: "Trasladada desde la sede Pereira en octubre.", joinedAt: "2025-10-12" },
    { id: "s7", name: "Daniel Chacón Salas", birthDate: "2012-06-08", guardianName: "Paola Salas", guardianPhone: "320 998 1103", moduleId: "m3", moduleStep: 2, slotId: "sab-16", joinedAt: "2026-01-18" },
    { id: "s8", name: "Sofía Arango Villa", birthDate: "2010-02-21", guardianName: "Natalia Villa", guardianPhone: "315 662 3301", guardianEmail: "natalia.villa.fam@gmail.com", moduleId: "m2", moduleStep: 2, slotId: "sab-10", joinedAt: "2026-04-08" },
    { id: "s9", name: "Sebastián Quintero Mejía", birthDate: "2013-08-17", guardianName: "Jorge Quintero", guardianPhone: "313 220 5510", moduleId: "m1", moduleStep: 1, slotId: "vie-14", joinedAt: "2026-05-22" },
    { id: "s10", name: "Lucía Herrera Bohórquez", birthDate: "2011-05-09", guardianName: "Marcela Bohórquez", guardianPhone: "310 331 8877", moduleId: "m6", moduleStep: 3, slotId: "vie-16", joinedAt: "2025-11-30" },
    { id: "s11", name: "Nicolás Cárdenas Rueda", birthDate: "2012-12-01", guardianName: "Felipe Cárdenas", guardianPhone: "302 114 2299", moduleId: "m4", moduleStep: 1, slotId: "sab-10", joinedAt: "2026-02-14" },
    { id: "s12", name: "Emilia Vargas Osorio", birthDate: "2014-04-22", guardianName: "Adriana Osorio", guardianPhone: "316 553 7720", moduleId: "m1", moduleStep: 4, slotId: "sab-14", joinedAt: "2026-06-10" },
    { id: "s13", name: "Tomás Leal Contreras", birthDate: "2010-10-11", guardianName: "Hernán Leal", guardianPhone: "317 448 9902", moduleId: "m8", moduleStep: 2, slotId: "vie-14", joinedAt: "2025-09-28" },
    { id: "s14", name: "Julieta Pardo Zambrano", birthDate: "2013-09-27", guardianName: "Mónica Zambrano", guardianPhone: "319 669 0044", moduleId: "m1", moduleStep: 2, slotId: "sab-10", joinedAt: "2026-07-19" },
    { id: "s15", name: "Jerónimo Betancur Duque", birthDate: "2011-08-05", guardianName: "Sandra Duque", guardianPhone: "311 226 1155", moduleId: "m2", moduleStep: 1, slotId: "sab-14", joinedAt: "2026-03-30" },
    { id: "s16", name: "Mariana Celis Godoy", birthDate: "2012-03-16", guardianName: "Diego Celis", guardianPhone: "300 787 6633", moduleId: "m3", moduleStep: 1, slotId: "sab-14", joinedAt: "2025-08-01", active: false },
    // La clase cero del alumno de prueba coincide con la penúltima sesión sab-16
    { id: "s17", name: "Salomé Zapata Murillo", birthDate: "2014-07-09", guardianName: "Laura Murillo", guardianPhone: "314 990 2210", moduleId: "m1", moduleStep: 1, slotId: "sab-16", trial: true, notes: "Primera clase de prueba (clase cero).", joinedAt: slotDates.get("sab-16")![1] },
  ];
  const students: Student[] = raw.map((s) => ({ ...s, active: s.active ?? true }));

  // ── Sesiones de asistencia (usa las fechas calculadas arriba) ────────────
  const sessions: AttendanceSession[] = [];
  let ssN = 0;

  for (const slotId of SLOT_IDS) {
    for (const date of slotDates.get(slotId)!) {
      const records: Record<string, AttendanceRecord> = {};
      for (const s of students) {
        // Los alumnos de clase cero solo tienen su registro de prueba
        if (!s.active || s.trial || s.slotId !== slotId) continue;
        const r = rng();
        const rec: AttendanceRecord = {
          status: r < 0.84 ? "presente" : r < 0.92 ? "tarde" : "ausente",
        };
        if (rng() < 0.1) rec.note = NOTES[Math.floor(rng() * NOTES.length)];
        records[s.id] = rec;
      }
      // Visitas demo: niño cambiado de horario y niña venida de otra sede
      if (slotId === "sab-10" && date === slotDates.get("sab-10")![0]) {
        records["s13"] = { status: "presente", visit: "otro_horario", note: "Vino en la mañana esta semana" };
        records["s6"] = { status: "presente", visit: "otra_sede", note: "Visita desde Pereira" };
      }
      // Clase cero del alumno de prueba
      if (slotId === "sab-16" && date === slotDates.get("sab-16")![1]) {
        records["s17"] = { status: "presente", visit: "clase_cero", note: "Clase cero: primera visita" };
      }
      sessions.push({
        id: `ss-${++ssN}`,
        slotId,
        date,
        records,
        takenAt: `${date}T15:00:00`,
      });
    }
  }

  // ── Créditos consumidos por alumno (clase cero no consume) ───────────────
  const consumed = new Map<string, number>();
  for (const s of students) consumed.set(s.id, 0);
  for (const sess of sessions) {
    for (const [studentId, rec] of Object.entries(sess.records)) {
      if (rec.status === "presente" || rec.status === "tarde") {
        if (rec.visit === "clase_cero") continue;
        consumed.set(studentId, (consumed.get(studentId) ?? 0) + 1);
      }
    }
  }

  // ── Compras de créditos ajustadas al saldo objetivo ──────────────────────
  const purchases: CreditPurchase[] = [];
  const cashTxs: CashTx[] = [];
  let cpN = 0;
  let txN = 0;

  const BUY_DATES = [
    `${prevPeriod}-06`,
    `${prevPeriod}-17`,
    `${thisPeriod}-03`,
    `${thisPeriod}-08`,
  ];

  for (const s of students) {
    if (!s.active || s.trial) continue;
    const target = TARGET_BALANCE[s.id] ?? 2;
    let need = (consumed.get(s.id) ?? 0) + target;
    const items: CatalogEntry[] = [];
    while (need >= 5) { need -= 5; items.push(catalogEntry("pack5")!); }
    while (need >= 4) { need -= 4; items.push(catalogEntry("pack4")!); }
    while (need >= 1) { need -= 1; items.push(catalogEntry("sesion")!); }
    items.forEach((e, i) => {
      const date = BUY_DATES[i % BUY_DATES.length];
      purchases.push({
        id: `cp-${++cpN}`,
        studentId: s.id,
        date,
        itemId: e.id as CreditPurchase["itemId"],
        credits: e.credits ?? 1,
        amount: e.price,
      });
      cashTxs.push({
        id: `tx-${++txN}`,
        date,
        kind: "clases",
        amount: e.price,
        label: `${e.label} · ${s.name.split(" ")[0]} ${s.name.split(" ")[1] ?? ""}`.trim(),
        studentId: s.id,
        itemId: e.id,
      });
    });
  }

  // ── Ventas de componentes (demo) ──────────────────────────────────────────
  for (const sale of DUMMY_SALES) {
    const e = catalogEntry(sale.itemId)!;
    const buyer = sale.studentId ? students.find((s) => s.id === sale.studentId) : undefined;
    cashTxs.push({
      id: `tx-${++txN}`,
      date: format(subDays(now, sale.daysAgo), "yyyy-MM-dd"),
      kind: "venta",
      amount: e.price * sale.qty,
      label: sale.qty > 1 ? `${e.label} ×${sale.qty}` : e.label,
      studentId: buyer?.id,
      itemId: e.id,
    });
  }

  // ── Pagos a profesores (descuentan de la caja) ───────────────────────────
  for (const pay of DUMMY_TEACHER_PAYMENTS) {
    cashTxs.push({
      id: `tx-${++txN}`,
      date: format(subDays(now, pay.daysAgo), "yyyy-MM-dd"),
      kind: "pago_profe",
      amount: pay.amount,
      label: `Pago a ${teachers.find((t) => t.id === pay.teacherId)?.name ?? "profesor"}`,
      teacherId: pay.teacherId,
      note: pay.note,
    });
  }

  // ── Caja: fondo calculado para que el saldo actual sea exactamente $190.000
  const ingresos = cashTxs
    .filter((t) => t.kind === "clases" || t.kind === "venta")
    .reduce((a, t) => a + t.amount, 0);
  const egresos = cashTxs
    .filter((t) => t.kind === "pago_profe")
    .reduce((a, t) => a + t.amount, 0);
  const cajaBase = 190_000 - (ingresos - egresos);

  return { students, teachers, purchases, cashTxs, sessions, cajaBase };
}
