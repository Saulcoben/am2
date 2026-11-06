"use client";

// ─── AM · Vista Asistencia: pase de lista por franja y fecha ───────────────
import { useMemo, useState } from "react";
import { useSchool } from "@/lib/school/store";
import { SEDE, slotById } from "@/lib/school/types";
import type { AttendanceStatus, Student, VisitReason } from "@/lib/school/types";
import { fmtDate, todayISO } from "@/lib/school/format";
import { creditBalance, slotSessions } from "@/lib/school/stats";
import { SLOTS } from "@/lib/school/types";
import { Avatar, CreditsBadge, MODULE_STYLE, SlotBadge, VisitBadge } from "./bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CalendarCheck,
  CalendarDays,
  CheckCheck,
  Clock3,
  Info,
  Search,
  Sparkles,
  StickyNote,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";

const OPTIONS: { value: AttendanceStatus; label: string; icon: React.ComponentType<{ className?: string }>; on: string }[] = [
  {
    value: "presente",
    label: "Presente",
    icon: UserCheck,
    on: "border-emerald-500/60 bg-emerald-500/20 text-emerald-300",
  },
  {
    value: "tarde",
    label: "Tarde",
    icon: Clock3,
    on: "border-amber-500/60 bg-amber-500/20 text-amber-300",
  },
  {
    value: "ausente",
    label: "Ausente",
    icon: UserX,
    on: "border-rose-500/60 bg-rose-500/20 text-rose-300",
  },
];

/** Por qué un niño asiste a una franja que no es la suya */
function visitFor(s: Student, slotId: string): VisitReason | undefined {
  if (s.slotId === slotId) return undefined;
  if (s.trial) return "clase_cero";
  return s.originSede && s.originSede !== SEDE ? "otra_sede" : "otro_horario";
}

function firstName(s: Student) {
  return s.name.split(" ")[0];
}

/** Compara nombres sin importar tildes ni mayúsculas */
function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// ─── Diálogo de clase cero (niño nuevo de prueba) ──────────────────────────
function TrialDialog({
  open,
  onOpenChange,
  slotId,
  date,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slotId: string;
  date: string;
}) {
  const addTrialStudent = useSchool((s) => s.addTrialStudent);
  const [name, setName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [originSede, setOriginSede] = useState("");
  const [key, setKey] = useState(0);

  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setName("");
    setGuardianName("");
    setGuardianPhone("");
    setOriginSede("");
    setKey((k) => k + 1);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const save = () => {
    if (!name.trim() || !guardianName.trim() || !guardianPhone.trim()) {
      toast.error("Completa nombre del niño, acudiente y teléfono");
      return;
    }
    addTrialStudent({ name, guardianName, guardianPhone, originSede, slotId, date });
    toast.success(`${name.trim().split(" ")[0]} agregado · clase cero (no descuenta créditos)`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-400" /> Clase cero (prueba)
          </DialogTitle>
          <DialogDescription>
            Agrega al niño con los datos mínimos y queda marcado presente en{" "}
            {slotById(slotId)?.short}. La clase cero no descuenta créditos.
          </DialogDescription>
        </DialogHeader>
        <div key={key} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="cz-name">Nombre del niño *</Label>
            <Input
              id="cz-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mateo Ramírez"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cz-guardian">Acudiente *</Label>
              <Input
                id="cz-guardian"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Nombre del acudiente"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cz-phone">Teléfono *</Label>
              <Input
                id="cz-phone"
                inputMode="tel"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="300 000 0000"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cz-sede">Sede de origen (opcional)</Label>
            <Input
              id="cz-sede"
              value={originSede}
              onChange={(e) => setOriginSede(e.target.value)}
              placeholder={`Ej: otra sede — deja vacío si es de ${SEDE}`}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>Agregar y marcar presente</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Botones de estado (compartidos) ───────────────────────────────────────
function StatusButtons({
  current,
  onPick,
  disabled,
}: {
  current: AttendanceStatus | undefined;
  onPick: (value: AttendanceStatus | "none") => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group">
      {OPTIONS.map(({ value, label, icon: Icon, on }) => {
        const onState = current === value;
        return (
          <button
            key={value}
            onClick={() => onPick(onState ? "none" : value)}
            aria-pressed={onState}
            disabled={disabled}
            className={cn(
              "flex min-h-10 items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-all active:scale-[0.97] disabled:opacity-40",
              onState
                ? on
                : "border-zinc-700/80 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function AttendanceView({ initialSlot }: { initialSlot: string | null }) {
  const students = useSchool((s) => s.students);
  const purchases = useSchool((s) => s.purchases);
  const cashTxs = useSchool((s) => s.cashTxs);
  const sessions = useSchool((s) => s.sessions);
  const markAttendance = useSchool((s) => s.markAttendance);
  const setAttendanceNote = useSchool((s) => s.setAttendanceNote);
  const markAllPresent = useSchool((s) => s.markAllPresent);

  const [slotId, setSlotId] = useState(initialSlot ?? SLOTS[0].id);
  const [date, setDate] = useState(todayISO());
  const [query, setQuery] = useState("");
  const [trialOpen, setTrialOpen] = useState(false);

  const today = todayISO();
  const slot = slotById(slotId);
  const isFuture = date > today;

  const roster = useMemo(
    () =>
      students
        .filter((s) => s.active && s.slotId === slotId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [students, slotId]
  );

  const session = useMemo(
    () => sessions.find((s) => s.slotId === slotId && s.date === date),
    [sessions, slotId, date]
  );

  const creditData = { students, teachers: [], purchases, cashTxs, sessions, cajaBase: 0 };
  const creditOf = new Map<string, number>();
  for (const s of students) creditOf.set(s.id, creditBalance(creditData, s.id));

  const q = norm(query.trim());
  const rosterFiltered = useMemo(
    () => (q ? roster.filter((s) => norm(s.name).includes(q)) : roster),
    [roster, q]
  );

  /** Niños de otras franjas o sedes que coinciden con la búsqueda */
  const others = useMemo(() => {
    if (q.length < 2) return [];
    const inRoster = new Set(roster.map((s) => s.id));
    return students
      .filter((s) => s.active && !inRoster.has(s.id) && norm(s.name).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, roster, q]);

  /** Registros de visitantes ya marcados en esta sesión */
  const visitorRecords = useMemo(() => {
    if (!session) return [];
    const inRoster = new Set(roster.map((s) => s.id));
    return Object.entries(session.records)
      .filter(([sid]) => !inRoster.has(sid))
      .map(([sid, rec]) => ({ student: students.find((s) => s.id === sid), rec }))
      .filter((x): x is { student: Student; rec: { status: AttendanceStatus; note?: string; visit?: VisitReason } } => Boolean(x.student));
  }, [session, roster, students]);

  const counts = useMemo(() => {
    const c = { presente: 0, tarde: 0, ausente: 0, sin: 0 };
    for (const s of roster) {
      const st = session?.records[s.id]?.status;
      if (st === "presente") c.presente++;
      else if (st === "tarde") c.tarde++;
      else if (st === "ausente") c.ausente++;
      else c.sin++;
    }
    return c;
  }, [roster, session]);

  const history = slotSessions({ students, teachers: [], purchases: [], cashTxs: [], sessions, cajaBase: 0 }, slotId).slice(0, 8);

  const marked = counts.presente + counts.tarde + counts.ausente;
  const pctBase = roster.length || 1;
  const dayPct = Math.round(((counts.presente + counts.tarde) / pctBase) * 100);

  const setStatus = (s: Student, status: AttendanceStatus | "none") => {
    if (isFuture) {
      toast.error("No puedes pasar lista para una fecha futura");
      return;
    }
    const visit = visitFor(s, slotId);
    markAttendance(slotId, date, s.id, status, visit);
    if (status === "presente" || status === "tarde") {
      if (visit === "clase_cero") toast(`${firstName(s)} · clase cero, no descuenta créditos`);
      else if (visit) toast(`${firstName(s)} · asiste fuera de su franja (−1 crédito)`);
      else toast(`${firstName(s)} · se descuenta 1 crédito`);
    } else if (status === "ausente") {
      toast(`${firstName(s)} · ausente, no se descuenta`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Asistencia</h1>
          <p className="text-xs text-zinc-500">Pase de lista por franja horaria</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="h-9 gap-1.5 rounded-xl px-3 text-xs"
          onClick={() => setTrialOpen(true)}
        >
          <Sparkles className="size-4 text-violet-400" /> Clase cero
        </Button>
      </div>

      {/* Selector de franja */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Franja horaria">
        {SLOTS.map((sl) => {
          const on = sl.id === slotId;
          const count = students.filter((s) => s.active && s.slotId === sl.id).length;
          return (
            <button
              key={sl.id}
              role="tab"
              aria-selected={on}
              onClick={() => setSlotId(sl.id)}
              className={cn(
                "min-h-11 shrink-0 rounded-xl border px-3.5 py-1.5 text-left transition-colors",
                on
                  ? sl.dayOfWeek === 5
                    ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                    : "border-violet-500/40 bg-violet-500/15 text-violet-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
              )}
            >
              <span className="block text-xs font-semibold">{sl.short}</span>
              <span className="block text-[10px] opacity-75">{count} inscritos</span>
            </button>
          );
        })}
      </div>

      {/* Fecha */}
      <div className="flex items-center gap-2.5">
        <Input
          type="date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="h-11 flex-1 rounded-xl"
          aria-label="Fecha de la sesión"
        />
        <Button
          variant="outline"
          className="h-11 rounded-xl"
          onClick={() => setDate(today)}
          disabled={date === today}
        >
          Hoy
        </Button>
      </div>

      {/* Encabezado de sesión */}
      <div className="rounded-xl border border-zinc-800 bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-zinc-100">
              {fmtDate(date)} · {slot?.label}
            </p>
            <p className="text-xs text-zinc-500">
              {marked}/{roster.length} marcados
              {session ? ` · ${dayPct}% asistió` : ""}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-10 gap-1.5 rounded-xl px-3 text-xs"
            disabled={isFuture || roster.length === 0}
            onClick={() => {
              markAllPresent(slotId, date);
              toast.success("Todos marcados como presentes (−1 crédito a cada uno)");
            }}
          >
            <CheckCheck className="size-4" /> Todos presentes
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-300">
            {counts.presente} presentes
          </span>
          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-300">
            {counts.tarde} tarde
          </span>
          <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-medium text-rose-300">
            {counts.ausente} ausentes
          </span>
          {counts.sin > 0 && (
            <span className="rounded-md border border-zinc-700 bg-zinc-800/60 px-2 py-0.5 font-medium text-zinc-400">
              {counts.sin} sin marcar
            </span>
          )}
        </div>
      </div>

      {isFuture && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          La fecha seleccionada es futura. Elige hoy o un día pasado para pasar lista.
        </p>
      )}

      <p className="flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-[11px] text-zinc-400">
        <Info className="mt-0.5 size-3.5 shrink-0 text-cyan-400" />
        Cada clase asistida (presente o tarde) descuenta 1 crédito del saldo del niño.
        La clase cero y las ausencias no descuentan.
      </p>

      {/* Búsqueda: niño de otro horario u otra sede */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar niño para agregarlo a esta clase (otro horario u otra sede)…"
          className="h-11 rounded-xl pl-9"
          aria-label="Buscar niño en toda la escuela"
        />
      </div>

      {/* Pase de lista */}
      {roster.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <CalendarCheck className="mx-auto size-6 text-zinc-600" />
          <p className="mt-2 text-sm text-zinc-400">No hay niños inscritos en esta franja.</p>
        </div>
      ) : rosterFiltered.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center text-xs text-zinc-500">
          Nadie de la franja coincide con “{query}”. Revisa la sección de otros niños abajo.
        </p>
      ) : (
        <div className="space-y-2.5" aria-label="Lista de niños">
          {rosterFiltered.map((s) => {
            const rec = session?.records[s.id];
            const current = rec?.status;
            return (
              <div key={s.id} className="rounded-xl border border-zinc-800 bg-card p-3">
                <div className="mb-2.5 flex items-center gap-2.5">
                  <Avatar name={s.name} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-100">{s.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <CreditsBadge value={creditOf.get(s.id) ?? 0} />
                      {rec?.visit && <VisitBadge visit={rec.visit} />}
                      {s.originSede && s.originSede !== SEDE && (
                        <span className="text-[10px] text-zinc-500">De {s.originSede}</span>
                      )}
                    </div>
                  </div>
                  {current && <span className="text-[11px] text-zinc-500">registrado</span>}
                </div>
                <StatusButtons current={current} onPick={(v) => setStatus(s, v)} disabled={isFuture} />
                {current && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2">
                    <StickyNote className="mt-1 size-3.5 shrink-0 text-amber-400" />
                    <input
                      value={rec?.note ?? ""}
                      onChange={(e) => setAttendanceNote(slotId, date, s.id, e.target.value)}
                      placeholder="Nota (opcional): llegó tarde, excusa médica, se retiró temprano…"
                      maxLength={200}
                      className="w-full bg-transparent text-xs text-zinc-300 outline-none placeholder:text-zinc-600"
                      aria-label={`Nota de asistencia para ${s.name}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resultados de búsqueda en toda la escuela */}
      {q.length >= 2 && others.length > 0 && (
        <section aria-label="Niños de otras franjas o sedes">
          <h2 className="mb-2 text-sm font-semibold text-zinc-200">
            Otros niños de la escuela
          </h2>
          <p className="mb-2.5 text-[11px] text-zinc-500">
            Si los marcas en esta clase se registra que asistieron fuera de su horario habitual.
          </p>
          <div className="space-y-2.5">
            {others.map((s) => {
              const rec = session?.records[s.id];
              const current = rec?.status;
              return (
                <div key={s.id} className="rounded-xl border border-sky-500/20 bg-card p-3">
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <Avatar name={s.name} className="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">{s.name}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <SlotBadge slotId={s.slotId} />
                        {s.originSede && s.originSede !== SEDE && (
                          <VisitBadge visit="otra_sede" />
                        )}
                        {current && <VisitBadge visit={visitFor(s, slotId) ?? "otro_horario"} />}
                      </div>
                    </div>
                  </div>
                  <StatusButtons current={current} onPick={(v) => setStatus(s, v)} disabled={isFuture} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Visitas ya registradas en esta sesión */}
      {visitorRecords.length > 0 && (
        <section aria-label="Visitas registradas en esta clase">
          <h2 className="mb-2 mt-5 text-sm font-semibold text-zinc-200">
            Visitas en esta clase ({visitorRecords.length})
          </h2>
          <div className="space-y-2.5">
            {visitorRecords.map(({ student: s, rec }) => (
              <div key={s.id} className="rounded-xl border border-zinc-800 bg-card p-3">
                <div className="mb-2.5 flex items-center gap-2.5">
                  <Avatar name={s.name} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-100">{s.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <SlotBadge slotId={s.slotId} />
                      {rec.visit && <VisitBadge visit={rec.visit} />}
                    </div>
                  </div>
                </div>
                <StatusButtons current={rec.status} onPick={(v) => setStatus(s, v)} disabled={isFuture} />
                {rec.note && (
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 text-[11px] text-amber-300/90">
                    <StickyNote className="mt-0.5 size-3 shrink-0" /> {rec.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Historial de sesiones de la franja */}
      {history.length > 0 && (
        <section aria-label="Sesiones recientes">
          <h2 className="mb-2 mt-6 text-sm font-semibold text-zinc-200">
            Sesiones recientes · {slot?.short}
          </h2>
          <div className="divide-y divide-zinc-800/70 overflow-hidden rounded-xl border border-zinc-800 bg-card">
            {history.map((sess) => {
              const recs = Object.values(sess.records);
              const pres = recs.filter((r) => r.status === "presente" || r.status === "tarde").length;
              const notas = recs.filter((r) => r.note && r.note.trim()).length;
              const visitas = recs.filter((r) => r.visit).length;
              return (
                <button
                  key={sess.id}
                  onClick={() => setDate(sess.date)}
                  className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="size-4 text-zinc-500" />
                    <span className="text-sm capitalize text-zinc-200">{fmtDate(sess.date)}</span>
                    {notas > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                        <StickyNote className="size-3" /> {notas}
                      </span>
                    )}
                    {visitas > 0 && (
                      <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                        {visitas} visita{visitas === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <span className="tabular text-xs text-zinc-500">
                    {pres}/{recs.length} asistieron
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-center text-[11px] text-zinc-600">
            Toca una sesión para revisar o corregir su lista.
          </p>
        </section>
      )}

      <TrialDialog open={trialOpen} onOpenChange={setTrialOpen} slotId={slotId} date={date} />
    </div>
  );
}
