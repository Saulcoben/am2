// ─── AM · Mecatrónica para niños · Modelo de datos ─────────────────────────

/** Roles de la app: el Admin ve el dinero, el Profesor solo asistencia/créditos */
export type Role = "admin" | "profesor";

/** Sede activa (por ahora solo trabajamos con esta) */
export const SEDE = "Dosquebradas";

export type AccentColor = "cyan" | "emerald" | "amber" | "rose" | "violet" | "sky";

export type AttendanceStatus = "presente" | "tarde" | "ausente";

/**
 * Motivo por el que un niño asiste a una franja que no es la suya.
 * - "otro_horario": lo cambiaron de horario ese día
 * - "otra_sede":    viene de otra sede de la escuela
 * - "clase_cero":   viene a una clase prueba (no descuenta créditos)
 */
export type VisitReason = "otro_horario" | "otra_sede" | "clase_cero";

// ─── Módulos (niveles de la plataforma): 1 a 10, sin horarios ni fechas ────

export interface Module {
  id: string;
  /** "Módulo 3" */
  name: string;
  /** "M3" */
  shortName: string;
  description: string;
  color: AccentColor;
}

/** Puntos de avance dentro de cada módulo (cada niño va a su propio ritmo) */
export const MODULE_STEPS = 4;

const MODULE_COLORS: AccentColor[] = ["cyan", "violet", "emerald", "amber", "rose", "sky"];
const MODULE_DESCRIPTIONS = [
  "Introducción a la mecatrónica: bloques, motores y primeros circuitos.",
  "Sensores y circuitos: luces, sonidos y reacciones.",
  "Programación por bloques y lógica de control.",
  "Arduino: entradas, salidas y primeros prototipos.",
  "Robótica móvil: carro con sensores y evasión de obstáculos.",
  "Servomotores y brazo robótico: precisión y control.",
  "Bluetooth y control desde la app: robots conectados.",
  "Domótica: casa inteligente con sensores y automatización.",
  "Proyecto integrador: robot Otto y movimientos.",
  "Proyecto final: diseño, construcción y presentación.",
];

/** Los 10 módulos (niveles) de la plataforma, sin horarios ni fechas */
export const MODULES: Module[] = MODULE_DESCRIPTIONS.map((description, i) => ({
  id: `m${i + 1}`,
  name: `Módulo ${i + 1}`,
  shortName: `M${i + 1}`,
  description,
  color: MODULE_COLORS[i % MODULE_COLORS.length],
}));

// ─── Franjas horarias de clase (aplican a la asistencia, no a los módulos) ─

export interface ClassSlot {
  id: string;
  day: "viernes" | "sábado";
  /** 5 = viernes, 6 = sábado */
  dayOfWeek: number;
  start: string;
  end: string;
  /** "Viernes 2:00–4:00 pm" */
  label: string;
  /** "Vie 2–4 pm" */
  short: string;
}

export const SLOTS: ClassSlot[] = [
  { id: "vie-14", day: "viernes", dayOfWeek: 5, start: "14:00", end: "16:00", label: "Viernes 2:00–4:00 pm", short: "Vie 2–4 pm" },
  { id: "vie-16", day: "viernes", dayOfWeek: 5, start: "16:00", end: "18:00", label: "Viernes 4:00–6:00 pm", short: "Vie 4–6 pm" },
  { id: "sab-10", day: "sábado", dayOfWeek: 6, start: "10:00", end: "12:00", label: "Sábado 10:00 am–12:00 m", short: "Sáb 10–12 m" },
  { id: "sab-14", day: "sábado", dayOfWeek: 6, start: "14:00", end: "16:00", label: "Sábado 2:00–4:00 pm", short: "Sáb 2–4 pm" },
  { id: "sab-16", day: "sábado", dayOfWeek: 6, start: "16:00", end: "18:00", label: "Sábado 4:00–6:00 pm", short: "Sáb 4–6 pm" },
];

export function slotById(id: string): ClassSlot | undefined {
  return SLOTS.find((s) => s.id === id);
}

// ─── Alumnos ────────────────────────────────────────────────────────────────

export interface Student {
  id: string;
  name: string;
  /** Fecha de nacimiento ISO: YYYY-MM-DD */
  birthDate: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  notes?: string;
  /** Módulo (nivel) actual: m1…m10 */
  moduleId: string;
  /** Punto de avance dentro del módulo: 1…MODULE_STEPS */
  moduleStep: number;
  /** Franja horaria habitual de clase */
  slotId: string;
  /** Sede de la que viene, si fue trasladado (p. ej. "Pereira") */
  originSede?: string;
  /** true si ingresó por una clase cero (prueba) */
  trial?: boolean;
  active: boolean;
  /** Fecha de ingreso ISO */
  joinedAt: string;
}

// ─── Asistencia ─────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  status: AttendanceStatus;
  /** Nota opcional del docente para esta asistencia */
  note?: string;
  /** Por qué asistió a esta franja (solo si no es su franja habitual o es clase cero) */
  visit?: VisitReason;
}

/** Pase de lista de una franja en una fecha */
export interface AttendanceSession {
  id: string;
  slotId: string;
  date: string;
  /** studentId -> registro */
  records: Record<string, AttendanceRecord>;
  takenAt: string;
}

// ─── Profesores ─────────────────────────────────────────────────────────────

export interface Teacher {
  id: string;
  name: string;
  active: boolean;
}

// ─── Créditos: cada clase vale 1 crédito (no se muestra dinero) ────────────

/** Compra de créditos: sesión suelta (1) o paquetes (4 y 5) */
export interface CreditPurchase {
  id: string;
  studentId: string;
  date: string;
  itemId: "sesion" | "pack4" | "pack5";
  credits: number;
  /** Valor pagado en COP (solo lo ve el Admin en Caja) */
  amount: number;
  note?: string;
}

// ─── Caja (dinero: SOLO Admin) ──────────────────────────────────────────────

export type CashKind = "clases" | "venta" | "pago_profe";

/** Movimiento de caja. Los ingresos suman, los pagos a profesores restan. */
export interface CashTx {
  id: string;
  date: string;
  kind: CashKind;
  /** Monto en COP, siempre positivo (el signo lo da el kind) */
  amount: number;
  /** Etiqueta legible, ej: "Pack 5 sesiones · Santiago", "Servomotor ×2" */
  label: string;
  studentId?: string;
  teacherId?: string;
  itemId?: string;
  note?: string;
}

export interface SchoolData {
  students: Student[];
  teachers: Teacher[];
  purchases: CreditPurchase[];
  cashTxs: CashTx[];
  sessions: AttendanceSession[];
}

/** Fondo con el que arranca la caja antes de los movimientos registrados */
export const CAJA_FONDO = 0;

/** Precio de 1 crédito: el valor de la sesión suelta */
export const CREDIT_PRICE = 45_000;

// ─── Catálogo de precios (COP — solo visible en Caja/Admin) ────────────────

export type CatalogGroup = "clases" | "kits" | "componentes";

export interface CatalogEntry {
  id: string;
  label: string;
  price: number;
  group: CatalogGroup;
  /** Créditos que otorga (solo ítems de clase) */
  credits?: number;
}

export const CATALOG: CatalogEntry[] = [
  // Clases (equivalen a créditos)
  { id: "sesion", label: "Sesión", price: 45_000, group: "clases", credits: 1 },
  { id: "pack4", label: "4 sesiones", price: 170_000, group: "clases", credits: 4 },
  { id: "pack5", label: "5 sesiones", price: 200_000, group: "clases", credits: 5 },
  // Kits
  { id: "kit-nivel-1", label: "Kit Nivel 1", price: 60_000, group: "kits" },
  { id: "kit-arana", label: "Kit Araña Robótica", price: 60_000, group: "kits" },
  { id: "kit-nivel-3", label: "Kit Nivel 3", price: 160_000, group: "kits" },
  { id: "kit-brazo", label: "Kit Brazo Robótico", price: 220_000, group: "kits" },
  { id: "kit-otto", label: "Kit Otto", price: 170_000, group: "kits" },
  { id: "kit-carro", label: "Kit Carro Bluetooth", price: 220_000, group: "kits" },
  { id: "kit-domotica", label: "Kit Casa Domótica", price: 180_000, group: "kits" },
  // Componentes
  { id: "comp-servomotor", label: "Servomotor", price: 10_000, group: "componentes" },
  { id: "comp-ultrasonido", label: "Sensor Ultrasonido", price: 10_000, group: "componentes" },
  { id: "comp-infrarrojo", label: "Sensor Infrarrojo", price: 8_000, group: "componentes" },
  { id: "comp-buzzer", label: "Buzzer Activo Analógico", price: 3_000, group: "componentes" },
];

export function catalogEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((c) => c.id === id);
}

export const KIND_LABELS: Record<CashKind, string> = {
  clases: "Pago de clases",
  venta: "Venta de componente",
  pago_profe: "Pago a profesor",
};

export const VISIT_LABELS: Record<VisitReason, string> = {
  otro_horario: "Otro horario",
  otra_sede: "Otra sede",
  clase_cero: "Clase cero",
};
