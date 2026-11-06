"use client";

// ─── AM · Vista Alumnos: lista, ficha y formulario (sin valores de dinero) ─
import { useMemo, useState } from "react";
import { useSchool } from "@/lib/school/store";
import { MODULE_STEPS, MODULES, SEDE, SLOTS, slotById } from "@/lib/school/types";
import type { Student } from "@/lib/school/types";
import {
  age,
  fmtDate,
  fmtDateShort,
  todayISO,
} from "@/lib/school/format";
import {
  consumedCredits,
  creditBalance,
  purchasedCredits,
  studentAttendancePct,
} from "@/lib/school/stats";
import { Avatar, AttendanceMark, CreditsBadge, EmptyState, ModuleBadge, SlotBadge, VisitBadge } from "./bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowRightLeft, Mail, MapPin, Pencil, Phone, Search, Sparkles, StickyNote, UserPlus, UserRoundX, Users } from "lucide-react";

// ─── Formulario (crear / editar) ───────────────────────────────────────────
function StudentForm({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Student | null;
}) {
  const addStudent = useSchool((s) => s.addStudent);
  const updateStudent = useSchool((s) => s.updateStudent);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("2012-01-01");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [moduleStep, setModuleStep] = useState("1");
  const [slotId, setSlotId] = useState("");
  const [originSede, setOriginSede] = useState("");
  const [key, setKey] = useState(0);

  // Reinicia el formulario cada vez que se abre
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setName(editing?.name ?? "");
    setBirthDate(editing?.birthDate || "2012-01-01");
    setGuardianName(editing?.guardianName ?? "");
    setGuardianPhone(editing?.guardianPhone ?? "");
    setGuardianEmail(editing?.guardianEmail ?? "");
    setNotes(editing?.notes ?? "");
    setModuleId(editing?.moduleId ?? "");
    setModuleStep(String(editing?.moduleStep ?? 1));
    setSlotId(editing?.slotId ?? "");
    setOriginSede(editing?.originSede ?? "");
    setKey((k) => k + 1);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const save = () => {
    if (!name.trim() || !guardianName.trim() || !guardianPhone.trim()) {
      toast.error("Completa nombre, acudiente y teléfono");
      return;
    }
    if (!moduleId) {
      toast.error("Elige el módulo del alumno");
      return;
    }
    if (!slotId) {
      toast.error("Elige la franja horaria del alumno");
      return;
    }
    const payload = {
      name: name.trim(),
      birthDate,
      guardianName: guardianName.trim(),
      guardianPhone: guardianPhone.trim(),
      guardianEmail: guardianEmail.trim() || undefined,
      notes: notes.trim() || undefined,
      moduleId,
      moduleStep: Number(moduleStep),
      slotId,
      originSede: originSede.trim() || undefined,
      active: editing?.active ?? true,
      joinedAt: editing?.joinedAt ?? todayISO(),
    };
    if (editing) {
      updateStudent(editing.id, payload);
      toast.success("Alumno actualizado");
    } else {
      addStudent(payload);
      toast.success(`${payload.name.split(" ")[0]} agregado a la escuela`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto scrollbar-slim sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar alumno" : "Nuevo alumno"}</DialogTitle>
          <DialogDescription>
            Datos del alumno y de su acudiente. El módulo y la franja se pueden cambiar después.
          </DialogDescription>
        </DialogHeader>
        <div key={key} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="st-name">Nombre completo *</Label>
            <Input
              id="st-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Santiago Gómez Rincón"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-birth">Fecha de nacimiento</Label>
            <Input
              id="st-birth"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="st-guardian">Acudiente *</Label>
              <Input
                id="st-guardian"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Nombre del acudiente"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-phone">Teléfono *</Label>
              <Input
                id="st-phone"
                inputMode="tel"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="300 000 0000"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-email">Correo del acudiente</Label>
            <Input
              id="st-email"
              inputMode="email"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Módulo (nivel) actual *</Label>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger className="h-11" aria-label="Módulo del alumno">
                <SelectValue placeholder="Elige el módulo…" />
              </SelectTrigger>
              <SelectContent>
                {MODULES.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Punto dentro del módulo</Label>
              <Select value={moduleStep} onValueChange={setModuleStep}>
                <SelectTrigger className="h-11" aria-label="Punto de avance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: MODULE_STEPS }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      Punto {n} de {MODULE_STEPS}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Franja de clase *</Label>
              <Select value={slotId} onValueChange={setSlotId}>
                <SelectTrigger className="h-11" aria-label="Franja horaria">
                  <SelectValue placeholder="Elige…" />
                </SelectTrigger>
                <SelectContent>
                  {SLOTS.map((sl) => (
                    <SelectItem key={sl.id} value={sl.id}>
                      {sl.short}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-sede">Sede de origen (si viene de otra sede)</Label>
            <Input
              id="st-sede"
              value={originSede}
              onChange={(e) => setOriginSede(e.target.value)}
              placeholder={`Deja vacío si es de ${SEDE}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-notes">Notas</Label>
            <Textarea
              id="st-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alergias, nivel previo, acuerdos con la familia…"
              rows={2}
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            Los módulos van del 1 al 10 y cada niño avanza a su propio ritmo (puntos dentro del módulo).
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>{editing ? "Guardar cambios" : "Crear alumno"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ficha del alumno (sheet inferior) ─────────────────────────────────────
function StudentSheet({
  studentId,
  onOpenChange,
  onEdit,
}: {
  studentId: string | null;
  onOpenChange: (v: boolean) => void;
  onEdit: (s: Student) => void;
}) {
  const students = useSchool((s) => s.students);
  const purchases = useSchool((s) => s.purchases);
  const cashTxs = useSchool((s) => s.cashTxs);
  const sessions = useSchool((s) => s.sessions);
  const toggleStudentActive = useSchool((s) => s.toggleStudentActive);
  const updateStudent = useSchool((s) => s.updateStudent);

  const student = students.find((s) => s.id === studentId) ?? null;

  if (!student) {
    return (
      <Sheet open={studentId !== null} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh]" />
      </Sheet>
    );
  }

  const data = { students, teachers: [], purchases, cashTxs, sessions, cajaBase: 0 };
  const balance = creditBalance(data, student.id);
  const comprados = purchasedCredits(data, student.id);
  const usados = consumedCredits(data, student.id);
  const pct = studentAttendancePct(data, student.id);
  const myPurchases = purchases
    .filter((p) => p.studentId === student.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const mySessions = sessions
    .filter((s) => s.records[student.id])
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const myModule = MODULES.find((m) => m.id === student.moduleId);
  const mySlot = slotById(student.slotId);

  const changeSlot = (sid: string) => {
    updateStudent(student.id, { slotId: sid });
    toast.success(`Horario actualizado a ${slotById(sid)?.short}`);
  };
  const changeModule = (mid: string) => {
    updateStudent(student.id, { moduleId: mid });
    toast.success("Módulo actualizado");
  };
  const changeStep = (n: string) => {
    updateStudent(student.id, { moduleStep: Number(n) });
    toast.success(`Avance: punto ${n} de ${MODULE_STEPS}`);
  };

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto scrollbar-slim rounded-t-2xl">
        <SheetHeader className="pb-0 text-left">
          <div className="flex items-center gap-3">
            <Avatar name={student.name} className="size-12 text-base" />
            <div className="min-w-0">
              <SheetTitle className="truncate">{student.name}</SheetTitle>
              <SheetDescription>
                {student.birthDate ? `${age(student.birthDate)} años · ` : ""}
                Ingresó {fmtDateShort(student.joinedAt)}
                {student.active ? "" : " · Inactivo"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          {/* Métricas rápidas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-card p-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Créditos</p>
              <p
                className={cn(
                  "tabular mt-1 font-mono text-lg font-semibold",
                  balance > 0 ? "text-emerald-400" : balance === 0 ? "text-zinc-300" : "text-rose-400"
                )}
              >
                {balance > 0 ? `+${balance}` : balance}
              </p>
              <p className="text-[11px] text-zinc-500">
                {comprados} comprados · {usados} usados
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-card p-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Asistencia</p>
              <p className="tabular mt-1 font-mono text-lg font-semibold text-cyan-400">
                {pct === null ? "—" : `${pct}%`}
              </p>
              <p className="text-[11px] text-zinc-500">{mySessions.length} sesiones recientes</p>
            </div>
          </div>

          {/* Contacto */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Acudiente
            </h3>
            <div className="space-y-2 rounded-xl border border-zinc-800 bg-card p-3.5 text-sm">
              <p className="font-medium text-zinc-200">{student.guardianName}</p>
              <a
                href={`tel:${student.guardianPhone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 text-cyan-400"
              >
                <Phone className="size-3.5" /> {student.guardianPhone}
              </a>
              {student.guardianEmail && (
                <p className="flex items-center gap-2 text-zinc-400">
                  <Mail className="size-3.5" /> {student.guardianEmail}
                </p>
              )}
              {student.originSede && student.originSede !== SEDE && (
                <p className="flex items-center gap-2 text-amber-300">
                  <MapPin className="size-3.5" /> Viene de la sede {student.originSede}
                </p>
              )}
              {student.notes && (
                <p className="rounded-lg bg-zinc-800/60 p-2 text-xs text-zinc-400">
                  {student.notes}
                </p>
              )}
            </div>
          </section>

          {/* Módulo y progreso */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Módulo y avance
            </h3>
            <div className="space-y-3 rounded-xl border border-zinc-800 bg-card p-3.5">
              {myModule ? (
                <div className="flex items-center gap-2">
                  <ModuleBadge shortName={myModule.name} color={myModule.color} className="py-1" />
                  <span className="text-xs text-zinc-400">{myModule.description}</span>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Sin módulo asignado.</p>
              )}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    Punto {student.moduleStep} de {MODULE_STEPS}
                  </span>
                  <span className="tabular text-zinc-500">
                    {Math.round((student.moduleStep / MODULE_STEPS) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(student.moduleStep / MODULE_STEPS) * 100}
                  className="h-2 bg-zinc-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Select value={student.moduleId} onValueChange={changeModule}>
                  <SelectTrigger className="h-9 text-xs" aria-label="Cambiar módulo">
                    <SelectValue placeholder="Módulo…" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(student.moduleStep)}
                  onValueChange={changeStep}
                >
                  <SelectTrigger className="h-9 text-xs" aria-label="Cambiar punto de avance">
                    <SelectValue placeholder="Punto…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: MODULE_STEPS }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        Punto {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Franja horaria */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Franja de clase
            </h3>
            <div className="space-y-2.5 rounded-xl border border-zinc-800 bg-card p-3.5">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <ArrowRightLeft className="size-3.5 text-cyan-400" />
                {mySlot ? mySlot.label : "Sin franja asignada"}
                {mySlot && (
                  <span className="text-zinc-600">
                    · {students.filter((s) => s.active && s.slotId === mySlot.id).length} niños en la franja
                  </span>
                )}
              </div>
              <Select value={student.slotId} onValueChange={changeSlot}>
                <SelectTrigger className="h-9 text-xs" aria-label="Cambiar franja horaria">
                  <SelectValue placeholder="Mover a otra franja…" />
                </SelectTrigger>
                <SelectContent>
                  {SLOTS.map((sl) => (
                    <SelectItem key={sl.id} value={sl.id}>
                      {sl.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zinc-500">
                Si un día asiste a otra franja, se marca desde Asistencia buscando su nombre.
              </p>
            </div>
          </section>

          {/* Historial de asistencia */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Asistencia reciente
            </h3>
            {mySessions.length === 0 ? (
              <p className="text-xs text-zinc-500">Sin sesiones registradas todavía.</p>
            ) : (
              <div className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800 bg-card">
                {mySessions.map((sess) => {
                  const rec = sess.records[student.id];
                  return (
                    <div key={sess.id} className="p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                          {fmtDateShort(sess.date)} <SlotBadge slotId={sess.slotId} />
                        </p>
                        {rec && <AttendanceMark status={rec.status} />}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {rec?.visit && <VisitBadge visit={rec.visit} />}
                        {rec?.note && (
                          <p className="flex items-start gap-1.5 text-[11px] text-amber-300/90">
                            <StickyNote className="mt-0.5 size-3 shrink-0" />
                            {rec.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Compras de créditos (sin dinero) */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Compras de créditos
            </h3>
            {myPurchases.length === 0 ? (
              <p className="text-xs text-zinc-500">Sin compras registradas.</p>
            ) : (
              <div className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800 bg-card">
                {myPurchases.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 p-2.5">
                    <div>
                      <p className="text-xs font-medium text-zinc-300">
                        {p.itemId === "sesion" ? "Sesión" : p.itemId === "pack4" ? "4 sesiones" : "5 sesiones"}
                      </p>
                      <p className="text-[11px] text-zinc-500">{fmtDateShort(p.date)}</p>
                    </div>
                    <p className="font-mono text-xs font-semibold text-emerald-400">+{p.credits}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Acciones */}
          <div className="flex gap-2.5 pt-1">
            <Button variant="outline" className="h-11 flex-1 gap-1.5" onClick={() => onEdit(student)}>
              <Pencil className="size-4" /> Editar
            </Button>
            <Button
              variant={student.active ? "outline" : "default"}
              className="h-11 flex-1 gap-1.5"
              onClick={() => {
                toggleStudentActive(student.id);
                toast.success(student.active ? "Alumno desactivado" : "Alumno reactivado");
              }}
            >
              <UserRoundX className="size-4" />
              {student.active ? "Desactivar" : "Reactivar"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Compara nombres sin importar tildes ni mayúsculas */
function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// ─── Vista principal ───────────────────────────────────────────────────────
export function StudentsView() {
  const students = useSchool((s) => s.students);
  const purchases = useSchool((s) => s.purchases);
  const cashTxs = useSchool((s) => s.cashTxs);
  const sessions = useSchool((s) => s.sessions);

  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [slotFilter, setSlotFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"activos" | "inactivos">("activos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);

  const data = useMemo(
    () => ({ students, teachers: [], purchases, cashTxs, sessions, cajaBase: 0 }),
    [students, purchases, cashTxs, sessions]
  );

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return students
      .filter((s) => (statusFilter === "activos" ? s.active : !s.active))
      .filter((s) => moduleFilter === "all" || s.moduleId === moduleFilter)
      .filter((s) => slotFilter === "all" || s.slotId === slotFilter)
      .filter((s) => !q || norm(s.name).includes(q) || norm(s.guardianName).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, query, moduleFilter, slotFilter, statusFilter]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (s: Student) => {
    setSelectedId(null);
    setEditing(s);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Alumnos</h1>
          <p className="text-xs text-zinc-500">
            {students.filter((s) => s.active).length} activos · Sede {SEDE}
          </p>
        </div>
        <Button onClick={openNew} className="h-10 gap-1.5 rounded-xl">
          <UserPlus className="size-4" /> Nuevo
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por alumno o acudiente…"
          className="h-11 rounded-xl pl-9"
          aria-label="Buscar alumnos"
        />
      </div>

      {/* Filtros */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <button
          onClick={() => setModuleFilter("all")}
          className={cn(
            "min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-medium transition-colors",
            moduleFilter === "all"
              ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
              : "border-zinc-700 bg-zinc-900 text-zinc-400"
          )}
        >
          Todos los módulos
        </button>
        {MODULES.map((m) => (
          <button
            key={m.id}
            onClick={() => setModuleFilter(m.id)}
            className={cn(
              "min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-medium transition-colors",
              moduleFilter === m.id
                ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                : "border-zinc-700 bg-zinc-900 text-zinc-400"
            )}
          >
            {m.shortName}
          </button>
        ))}
        <span className="mx-1 w-px shrink-0 bg-zinc-800" />
        <button
          onClick={() => setSlotFilter("all")}
          className={cn(
            "min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-medium transition-colors",
            slotFilter === "all"
              ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
              : "border-zinc-700 bg-zinc-900 text-zinc-400"
          )}
        >
          Todas las franjas
        </button>
        {SLOTS.map((sl) => (
          <button
            key={sl.id}
            onClick={() => setSlotFilter(sl.id)}
            className={cn(
              "min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-medium transition-colors",
              slotFilter === sl.id
                ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                : "border-zinc-700 bg-zinc-900 text-zinc-400"
            )}
          >
            {sl.short}
          </button>
        ))}
        <span className="mx-1 w-px shrink-0 bg-zinc-800" />
        {(["activos", "inactivos"] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={cn(
              "min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-medium capitalize transition-colors",
              statusFilter === st
                ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                : "border-zinc-700 bg-zinc-900 text-zinc-400"
            )}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No se encontraron alumnos"
          hint="Prueba con otro nombre o cambia los filtros."
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((s) => {
            const balance = creditBalance(data, s.id);
            const pct = studentAttendancePct(data, s.id);
            const mod = MODULES.find((m) => m.id === s.moduleId);
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-card p-3.5 text-left transition-colors hover:border-zinc-700 hover:bg-accent/30"
              >
                <Avatar name={s.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-zinc-100">{s.name}</p>
                    {s.birthDate && (
                      <span className="shrink-0 text-[11px] text-zinc-500">{age(s.birthDate)} a.</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {mod && <ModuleBadge shortName={mod.name} color={mod.color} />}
                    <span className="text-[10px] text-zinc-500">Punto {s.moduleStep}</span>
                    <SlotBadge slotId={s.slotId} />
                    {s.trial && (
                      <span className="inline-flex items-center gap-0.5 rounded-md border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                        <Sparkles className="size-3" /> Clase cero
                      </span>
                    )}
                    {s.originSede && s.originSede !== SEDE && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300">
                        <MapPin className="size-3" /> {s.originSede}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <CreditsBadge value={balance} />
                  {pct !== null && (
                    <p className="tabular mt-0.5 text-[11px] text-zinc-500">{pct}% asis.</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <StudentSheet
        studentId={selectedId}
        onOpenChange={(v) => !v && setSelectedId(null)}
        onEdit={openEdit}
      />
      <StudentForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />
    </div>
  );
}
