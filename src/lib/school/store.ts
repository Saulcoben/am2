// ─── AM · Store global (zustand + localStorage) ────────────────────────────
"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildSeed } from "./seed";
import { catalogEntry } from "./types";
import type {
  AttendanceSession,
  AttendanceStatus,
  CashTx,
  CreditPurchase,
  Role,
  Student,
  VisitReason,
} from "./types";

interface NewStudentData {
  name: string;
  birthDate: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  notes?: string;
  moduleId: string;
  moduleStep: number;
  slotId: string;
  originSede?: string;
  trial?: boolean;
  active?: boolean;
  joinedAt?: string;
}

interface SchoolState {
  role: Role;
  students: Student[];
  teachers: { id: string; name: string; active: boolean }[];
  purchases: CreditPurchase[];
  cashTxs: CashTx[];
  sessions: AttendanceSession[];
  /** Fondo inicial de caja: calibrado para que el saldo demo sea $190.000 */
  cajaBase: number;
  seededAt: string | null;

  ensureSeeded: () => void;
  resetDemo: () => void;
  setRole: (role: Role) => void;

  addStudent: (data: NewStudentData) => string;
  updateStudent: (id: string, data: Partial<Omit<Student, "id">>) => void;
  toggleStudentActive: (id: string) => void;

  markAttendance: (
    slotId: string,
    date: string,
    studentId: string,
    status: AttendanceStatus | "none",
    visit?: VisitReason
  ) => void;
  setAttendanceNote: (slotId: string, date: string, studentId: string, note: string) => void;
  markAllPresent: (slotId: string, date: string) => void;
  /** Crea un alumno de clase cero (prueba) y lo marca presente en la franja */
  addTrialStudent: (data: {
    name: string;
    guardianName: string;
    guardianPhone: string;
    originSede?: string;
    slotId: string;
    date: string;
  }) => string;

  /** El Admin registra el pago de clases de un alumno: suma créditos y entra a caja */
  addCreditPurchase: (data: { studentId: string; itemId: "sesion" | "pack4" | "pack5"; date: string; note?: string }) => void;
  /** El Admin registra una venta de kit/componente: entra efectivo a caja */
  addComponentSale: (data: { itemId: string; qty: number; studentId?: string; date: string; note?: string }) => void;
  /** El Admin paga a un profesor: sale efectivo de la caja */
  payTeacher: (data: { teacherId: string; amount: number; date: string; note?: string }) => void;
}

export const useSchool = create<SchoolState>()(
  persist(
    (set, get) => ({
      role: "profesor",
      ...buildSeed(),
      seededAt: null,

      ensureSeeded: () => {
        if (!get().seededAt) set({ seededAt: new Date().toISOString() });
      },

      resetDemo: () => {
        set({ ...buildSeed(), role: get().role, seededAt: new Date().toISOString() });
      },

      setRole: (role) => set({ role }),

      addStudent: (data) => {
        const id = crypto.randomUUID();
        set((st) => ({
          students: [
            ...st.students,
            { ...data, active: data.active ?? true, joinedAt: data.joinedAt ?? new Date().toISOString().slice(0, 10), id },
          ],
        }));
        return id;
      },

      updateStudent: (id, data) =>
        set((st) => ({
          students: st.students.map((s) => (s.id === id ? { ...s, ...data } : s)),
        })),

      toggleStudentActive: (id) =>
        set((st) => ({
          students: st.students.map((s) => (s.id === id ? { ...s, active: !s.active } : s)),
        })),

      markAttendance: (slotId, date, studentId, status, visit) =>
        set((st) => {
          const idx = st.sessions.findIndex((s) => s.slotId === slotId && s.date === date);
          if (idx === -1) {
            if (status === "none") return st;
            const rec: { status: AttendanceStatus; visit?: VisitReason } = { status };
            if (visit) rec.visit = visit;
            const session: AttendanceSession = {
              id: crypto.randomUUID(),
              slotId,
              date,
              records: { [studentId]: rec },
              takenAt: new Date().toISOString(),
            };
            return { sessions: [...st.sessions, session] };
          }
          const session: AttendanceSession = {
            ...st.sessions[idx],
            records: { ...st.sessions[idx].records },
            takenAt: new Date().toISOString(),
          };
          if (status === "none") {
            delete session.records[studentId];
          } else {
            const prev = session.records[studentId];
            session.records[studentId] = {
              status,
              note: prev?.note,
              visit: visit ?? prev?.visit,
            };
          }
          const sessions = [...st.sessions];
          if (Object.keys(session.records).length === 0) sessions.splice(idx, 1);
          else sessions[idx] = session;
          return { sessions };
        }),

      setAttendanceNote: (slotId, date, studentId, note) =>
        set((st) => {
          const idx = st.sessions.findIndex((s) => s.slotId === slotId && s.date === date);
          if (idx === -1) return st;
          const rec = st.sessions[idx].records[studentId];
          if (!rec) return st;
          const session: AttendanceSession = {
            ...st.sessions[idx],
            records: { ...st.sessions[idx].records },
          };
          const clean = note.trim();
          session.records[studentId] = clean ? { ...rec, note: clean } : { status: rec.status, visit: rec.visit };
          const sessions = [...st.sessions];
          sessions[idx] = session;
          return { sessions };
        }),

      markAllPresent: (slotId, date) =>
        set((st) => {
          const enrolled = st.students.filter((s) => s.active && s.slotId === slotId);
          const prev =
            st.sessions.find((s) => s.slotId === slotId && s.date === date)?.records ?? {};
          const records: AttendanceSession["records"] = {};
          for (const s of enrolled)
            records[s.id] = {
              status: "presente",
              note: prev[s.id]?.note,
              visit: prev[s.id]?.visit,
            };
          // conserva los registros de visitantes (otro horario, otra sede, clase cero)
          for (const [sid, rec] of Object.entries(prev)) {
            if (!records[sid]) records[sid] = rec;
          }
          const idx = st.sessions.findIndex((s) => s.slotId === slotId && s.date === date);
          const session: AttendanceSession = {
            id: idx === -1 ? crypto.randomUUID() : st.sessions[idx].id,
            slotId,
            date,
            records,
            takenAt: new Date().toISOString(),
          };
          const sessions = [...st.sessions];
          if (idx === -1) sessions.push(session);
          else sessions[idx] = session;
          return { sessions };
        }),

      addTrialStudent: ({ name, guardianName, guardianPhone, originSede, slotId, date }) => {
        const id = crypto.randomUUID();
        const student: Student = {
          id,
          name: name.trim(),
          birthDate: "",
          guardianName: guardianName.trim(),
          guardianPhone: guardianPhone.trim(),
          moduleId: "m1",
          moduleStep: 1,
          slotId,
          originSede: originSede?.trim() || undefined,
          trial: true,
          active: true,
          joinedAt: date,
          notes: "Ingresó por clase cero desde la asistencia.",
        };
        set((st) => {
          const idx = st.sessions.findIndex((s) => s.slotId === slotId && s.date === date);
          const record = { status: "presente" as const, visit: "clase_cero" as const };
          let sessions: AttendanceSession[];
          if (idx === -1) {
            sessions = [
              ...st.sessions,
              {
                id: crypto.randomUUID(),
                slotId,
                date,
                records: { [id]: record },
                takenAt: new Date().toISOString(),
              },
            ];
          } else {
            const session: AttendanceSession = {
              ...st.sessions[idx],
              records: { ...st.sessions[idx].records, [id]: record },
              takenAt: new Date().toISOString(),
            };
            sessions = [...st.sessions];
            sessions[idx] = session;
          }
          return { students: [...st.students, student], sessions };
        });
        return id;
      },

      addCreditPurchase: ({ studentId, itemId, date, note }) =>
        set((st) => {
          const e = catalogEntry(itemId);
          if (!e) return st;
          const student = st.students.find((s) => s.id === studentId);
          const purchase: CreditPurchase = {
            id: crypto.randomUUID(),
            studentId,
            date,
            itemId,
            credits: e.credits ?? 1,
            amount: e.price,
            note: note?.trim() || undefined,
          };
          const tx: CashTx = {
            id: crypto.randomUUID(),
            date,
            kind: "clases",
            amount: e.price,
            label: `${e.label} · ${student?.name ?? "Alumno"}`,
            studentId,
            itemId,
            note: note?.trim() || undefined,
          };
          return { purchases: [...st.purchases, purchase], cashTxs: [...st.cashTxs, tx] };
        }),

      addComponentSale: ({ itemId, qty, studentId, date, note }) =>
        set((st) => {
          const e = catalogEntry(itemId);
          if (!e || qty < 1) return st;
          const student = studentId ? st.students.find((s) => s.id === studentId) : undefined;
          const tx: CashTx = {
            id: crypto.randomUUID(),
            date,
            kind: "venta",
            amount: e.price * qty,
            label: qty > 1 ? `${e.label} ×${qty}` : e.label,
            studentId: student?.id,
            itemId,
            note: note?.trim() || undefined,
          };
          return { cashTxs: [...st.cashTxs, tx] };
        }),

      payTeacher: ({ teacherId, amount, date, note }) =>
        set((st) => {
          if (amount <= 0) return st;
          const teacher = st.teachers.find((t) => t.id === teacherId);
          const tx: CashTx = {
            id: crypto.randomUUID(),
            date,
            kind: "pago_profe",
            amount,
            label: `Pago a ${teacher?.name ?? "profesor"}`,
            teacherId,
            note: note?.trim() || undefined,
          };
          return { cashTxs: [...st.cashTxs, tx] };
        }),
    }),
    {
      // v3: modelo nuevo (franjas + créditos + caja); descarta datos viejos
      name: "am-school-v3",
      storage: createJSONStorage(() => localStorage),
      partialize: (st) => ({
        role: st.role,
        students: st.students,
        teachers: st.teachers,
        purchases: st.purchases,
        cashTxs: st.cashTxs,
        sessions: st.sessions,
        cajaBase: st.cajaBase,
        seededAt: st.seededAt,
      }),
    }
  )
);
