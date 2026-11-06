"use client";

// ─── AM · Vista Caja (solo Admin): efectivo, ventas y pagos a profesores ───
import { useMemo, useState } from "react";
import { useSchool } from "@/lib/school/store";
import { CATALOG, catalogEntry, SEDE } from "@/lib/school/types";
import type { CatalogGroup } from "@/lib/school/types";
import { currentPeriod, fmtDateShort, money, monthName, todayISO } from "@/lib/school/format";
import { cajaBalance, cashHistory, cashIncome, cashOutcome, teacherPaidTotal } from "@/lib/school/stats";
import { Avatar, EmptyState, KpiCard, SectionTitle } from "./bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Coins,
  FileDown,
  HandCoins,
  Package,
  ShoppingBag,
  Wallet,
} from "lucide-react";

type CajaDialog = "clases" | "venta" | "profe" | null;

function todayInput() {
  return todayISO();
}

/** Selector agrupado del catálogo (kits y componentes, o solo clases) */
function CatalogSelect({
  value,
  onValueChange,
  groups,
  ariaLabel,
}: {
  value: string;
  onValueChange: (id: string) => void;
  groups: CatalogGroup[];
  ariaLabel: string;
}) {
  const labels: Record<CatalogGroup, string> = {
    clases: "Clases",
    kits: "Kits",
    componentes: "Componentes",
  };
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-11" aria-label={ariaLabel}>
        <SelectValue placeholder="Elige el ítem…" />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectGroup key={g}>
            <SelectLabel>{labels[g]}</SelectLabel>
            {CATALOG.filter((e) => e.group === g).map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.label} · {money(e.price)}
                {e.credits ? ` (+${e.credits} créditos)` : ""}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Diálogo: pago de clases → créditos ────────────────────────────────────
function PayClassesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const students = useSchool((s) => s.students);
  const addCreditPurchase = useSchool((s) => s.addCreditPurchase);

  const [studentId, setStudentId] = useState("");
  const [itemId, setItemId] = useState("");
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState("");
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setStudentId("");
    setItemId("");
    setDate(todayInput());
    setNote("");
  } else if (!open && wasOpen) setWasOpen(false);

  const entry = itemId ? catalogEntry(itemId) : undefined;
  const student = students.find((s) => s.id === studentId);

  const save = () => {
    if (!studentId || !entry) {
      toast.error("Elige el alumno y el paquete de clases");
      return;
    }
    addCreditPurchase({ studentId, itemId: entry.id as "sesion" | "pack4" | "pack5", date, note });
    toast.success(
      `${entry.label} · +${entry.credits} crédito(s) para ${student?.name.split(" ")[0]} · ${money(entry.price)} a caja`
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pago de clases (créditos)</DialogTitle>
          <DialogDescription>
            Efectivo que entra a la caja y créditos que se suman al saldo del niño.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label>Alumno *</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="h-11" aria-label="Alumno">
                <SelectValue placeholder="Elige el alumno…" />
              </SelectTrigger>
              <SelectContent>
                {students
                  .filter((s) => s.active)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Paquete *</Label>
            <CatalogSelect
              value={itemId}
              onValueChange={setItemId}
              groups={["clases"]}
              ariaLabel="Paquete de clases"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pc-fecha">Fecha</Label>
              <Input id="pc-fecha" type="date" value={date} max={todayInput()} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-nota">Nota</Label>
              <Input id="pc-nota" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          {entry && (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              Entra <b>{money(entry.price)}</b> a la caja · {student?.name.split(" ")[0] ?? "el alumno"} recibe{" "}
              <b>+{entry.credits} crédito(s)</b>.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>Registrar en caja</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Diálogo: venta de componentes/kits ────────────────────────────────────
function SaleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const students = useSchool((s) => s.students);
  const addComponentSale = useSchool((s) => s.addComponentSale);

  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");
  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState(todayInput());
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setItemId("");
    setQty("1");
    setStudentId("");
    setDate(todayInput());
  } else if (!open && wasOpen) setWasOpen(false);

  const entry = itemId ? catalogEntry(itemId) : undefined;
  const total = entry ? entry.price * Math.max(1, Number(qty) || 1) : 0;

  const save = () => {
    if (!entry) {
      toast.error("Elige el kit o componente vendido");
      return;
    }
    addComponentSale({
      itemId: entry.id,
      qty: Math.max(1, Number(qty) || 1),
      studentId: studentId || undefined,
      date,
    });
    toast.success(`${entry.label} ×${Math.max(1, Number(qty) || 1)} · ${money(total)} a caja`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Venta de componentes</DialogTitle>
          <DialogDescription>
            Kits y repuestos vendidos en la sede. El efectivo entra a la caja.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label>Ítem *</Label>
            <CatalogSelect
              value={itemId}
              onValueChange={setItemId}
              groups={["kits", "componentes"]}
              ariaLabel="Kit o componente"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sv-cant">Cantidad</Label>
              <Input
                id="sv-cant"
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sv-fecha">Fecha</Label>
              <Input id="sv-fecha" type="date" value={date} max={todayInput()} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Comprador (opcional)</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="h-11" aria-label="Comprador">
                <SelectValue placeholder="Sin asociar a un alumno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asociar</SelectItem>
                {students
                  .filter((s) => s.active)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {entry && (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              Entra <b>{money(total)}</b> a la caja ({entry.label} ×{Math.max(1, Number(qty) || 1)}).
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>Registrar venta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Diálogo: pago a profesor ──────────────────────────────────────────────
function PayTeacherDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const teachers = useSchool((s) => s.teachers);
  const payTeacher = useSchool((s) => s.payTeacher);

  const [teacherId, setTeacherId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState("");
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setTeacherId("");
    setAmount("");
    setDate(todayInput());
    setNote("");
  } else if (!open && wasOpen) setWasOpen(false);

  const teacher = teachers.find((t) => t.id === teacherId);
  const value = Number(amount.replace(/\D/g, "")) || 0;

  const save = () => {
    if (!teacherId || value <= 0) {
      toast.error("Elige el profesor y un valor válido");
      return;
    }
    payTeacher({ teacherId, amount: value, date, note });
    toast.success(`Pago a ${teacher?.name} · ${money(value)} salen de la caja`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar a profesor</DialogTitle>
          <DialogDescription>El valor se descuenta del saldo de la caja.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label>Profesor *</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger className="h-11" aria-label="Profesor">
                <SelectValue placeholder="Elige el profesor…" />
              </SelectTrigger>
              <SelectContent>
                {teachers
                  .filter((t) => t.active)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pt-valor">Valor (COP) *</Label>
              <Input
                id="pt-valor"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                placeholder="120000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-fecha">Fecha</Label>
              <Input id="pt-fecha" type="date" value={date} max={todayInput()} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pt-nota">Nota</Label>
            <Input id="pt-nota" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: quincena, bono…" />
          </div>
          {value > 0 && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              Salen <b>{money(value)}</b> de la caja para {teacher?.name ?? "el profesor"}.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={value <= 0}>
            Registrar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Vista principal ───────────────────────────────────────────────────────
export function CajaView() {
  const students = useSchool((s) => s.students);
  const teachers = useSchool((s) => s.teachers);
  const purchases = useSchool((s) => s.purchases);
  const cashTxs = useSchool((s) => s.cashTxs);
  const sessions = useSchool((s) => s.sessions);
  const cajaBase = useSchool((s) => s.cajaBase);

  const [dialog, setDialog] = useState<CajaDialog>(null);

  const data = useMemo(
    () => ({ students, teachers, purchases, cashTxs, sessions, cajaBase }),
    [students, teachers, purchases, cashTxs, sessions, cajaBase]
  );

  const period = currentPeriod();
  const saldo = cajaBalance(data);
  const ingresosMes = cashIncome(data, period);
  const egresosMes = cashOutcome(data, period);
  const movimientos = cashHistory(data);
  const ventas = movimientos.filter((t) => t.kind === "venta");
  const pagosProfes = movimientos.filter((t) => t.kind === "pago_profe");

  const studentOf = (id?: string) => students.find((s) => s.id === id);

  const exportCsv = () => {
    const rows = [["Fecha", "Tipo", "Concepto", "Ingreso", "Egreso", "Nota"]];
    for (const t of cashHistory(useSchool.getState())) {
      rows.push([
        t.date,
        t.kind === "clases" ? "Pago de clases" : t.kind === "venta" ? "Venta" : "Pago a profesor",
        t.label,
        t.kind === "pago_profe" ? "" : String(t.amount),
        t.kind === "pago_profe" ? String(t.amount) : "",
        t.note ?? "",
      ]);
    }
    rows.push(["", "", "Saldo en caja", "", String(cajaBalance(useSchool.getState())), ""]);
    const csv = "\ufeff" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `am-caja-${currentPeriod()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Informe de caja descargado (CSV)");
  };

  const kindPill = {
    clases: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25",
    venta: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
    pago_profe: "bg-rose-500/10 text-rose-300 border-rose-500/25",
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">Caja</h1>
        <p className="text-xs text-zinc-500">
          Efectivo de la sede {SEDE} · solo visible para el Admin
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Saldo en caja"
          value={money(saldo)}
          sub="Fondo + ingresos − pagos a profes"
          icon={Wallet}
          tone="cyan"
        />
        <KpiCard
          label={`Ingresos · ${monthName(period).split(" ")[0]}`}
          value={money(ingresosMes)}
          sub="Clases + ventas de componentes"
          icon={ArrowDownLeft}
          tone="emerald"
        />
        <KpiCard
          label={`Pagado a profes · ${monthName(period).split(" ")[0]}`}
          value={money(egresosMes)}
          icon={HandCoins}
          tone="rose"
        />
        <KpiCard
          label="Movimientos"
          value={String(cashTxs.length)}
          sub="Registros históricos"
          icon={Coins}
          tone="amber"
        />
      </div>

      {/* Acciones */}
      <div className="grid grid-cols-3 gap-2.5">
        <Button className="h-auto flex-col gap-1 rounded-xl py-3" onClick={() => setDialog("clases")}>
          <Coins className="size-5" />
          <span className="text-[11px] leading-tight">Pago de clases</span>
        </Button>
        <Button variant="secondary" className="h-auto flex-col gap-1 rounded-xl py-3" onClick={() => setDialog("venta")}>
          <ShoppingBag className="size-5" />
          <span className="text-[11px] leading-tight">Vender componente</span>
        </Button>
        <Button variant="secondary" className="h-auto flex-col gap-1 rounded-xl py-3" onClick={() => setDialog("profe")}>
          <HandCoins className="size-5" />
          <span className="text-[11px] leading-tight">Pagar profesor</span>
        </Button>
      </div>

      {/* Movimientos */}
      <Tabs defaultValue="movimientos">
        <TabsList className="w-full justify-start overflow-x-auto bg-zinc-900">
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="ventas">Ventas ({ventas.length})</TabsTrigger>
          <TabsTrigger value="profes">Profesores</TabsTrigger>
        </TabsList>

        <TabsContent value="movimientos" className="mt-3">
          {movimientos.length === 0 ? (
            <EmptyState icon={Banknote} title="Sin movimientos registrados" />
          ) : (
            <div className="max-h-96 divide-y divide-zinc-800/70 overflow-y-auto rounded-xl border border-zinc-800 bg-card scrollbar-slim">
              {movimientos.map((t) => {
                const isIngreso = t.kind !== "pago_profe";
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                        isIngreso
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                      )}
                    >
                      {isIngreso ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-200">{t.label}</p>
                      <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        {fmtDateShort(t.date)}
                        <span className={cn("rounded border px-1 py-px text-[9px] uppercase tracking-wide", kindPill[t.kind])}>
                          {t.kind === "clases" ? "clases" : t.kind === "venta" ? "venta" : "profe"}
                        </span>
                        {t.kind === "venta" && studentOf(t.studentId) && (
                          <span>· {studentOf(t.studentId)?.name.split(" ")[0]}</span>
                        )}
                      </p>
                      {t.note && <p className="mt-0.5 text-[11px] text-zinc-500">{t.note}</p>}
                    </div>
                    <p
                      className={cn(
                        "tabular shrink-0 font-mono text-sm font-semibold",
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
          <Button variant="outline" className="mt-3 h-10 w-full gap-1.5 rounded-xl text-xs" onClick={exportCsv}>
            <FileDown className="size-4" /> Descargar informe de caja (CSV)
          </Button>
        </TabsContent>

        <TabsContent value="ventas" className="mt-3">
          {ventas.length === 0 ? (
            <EmptyState icon={Package} title="Aún no hay ventas de componentes" hint="Regístralas con “Vender componente”." />
          ) : (
            <div className="max-h-96 divide-y divide-zinc-800/70 overflow-y-auto rounded-xl border border-zinc-800 bg-card scrollbar-slim">
              {ventas.map((t) => {
                const s = studentOf(t.studentId);
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      <Package className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-200">{t.label}</p>
                      <p className="text-[11px] text-zinc-500">
                        {fmtDateShort(t.date)}
                        {s ? ` · ${s.name}` : " · venta libre"}
                      </p>
                    </div>
                    <p className="tabular shrink-0 font-mono text-sm font-semibold text-emerald-400">
                      +{money(t.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="profes" className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            {teachers.map((t) => (
              <div key={t.id} className="rounded-xl border border-zinc-800 bg-card p-3 text-center">
                <Avatar name={t.name} className="mx-auto size-9" />
                <p className="mt-1.5 text-xs font-semibold text-zinc-200">{t.name}</p>
                <p className="tabular mt-0.5 font-mono text-[11px] text-zinc-500">
                  {money(teacherPaidTotal(data, t.id))} pagados
                </p>
              </div>
            ))}
          </div>
          {pagosProfes.length === 0 ? (
            <EmptyState icon={HandCoins} title="Sin pagos a profesores todavía" />
          ) : (
            <div className="max-h-72 divide-y divide-zinc-800/70 overflow-y-auto rounded-xl border border-zinc-800 bg-card scrollbar-slim">
              {pagosProfes.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3">
                  <Avatar name={teachers.find((x) => x.id === t.teacherId)?.name ?? "?"} className="size-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200">
                      {teachers.find((x) => x.id === t.teacherId)?.name ?? "Profesor"}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {fmtDateShort(t.date)}
                      {t.note ? ` · ${t.note}` : ""}
                    </p>
                  </div>
                  <p className="tabular shrink-0 font-mono text-sm font-semibold text-rose-400">
                    −{money(t.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Precios */}
      <section aria-label="Lista de precios">
        <SectionTitle title="Lista de precios" hint="Clases, kits y componentes de la sede" />
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-card p-4">
          {(
            [
              { group: "clases" as CatalogGroup, title: "Clases (créditos)" },
              { group: "kits" as CatalogGroup, title: "Kits" },
              { group: "componentes" as CatalogGroup, title: "Componentes" },
            ]
          ).map(({ group, title }) => (
            <div key={group}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
              <ul className="divide-y divide-zinc-800/60">
                {CATALOG.filter((e) => e.group === group).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                    <span className="text-zinc-300">
                      {e.label}
                      {e.credits ? (
                        <span className="ml-1.5 text-[11px] text-cyan-400">+{e.credits} crédito{e.credits > 1 ? "s" : ""}</span>
                      ) : null}
                    </span>
                    <span className="tabular font-mono text-xs font-semibold text-zinc-200">{money(e.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <PayClassesDialog open={dialog === "clases"} onOpenChange={(v) => !v && setDialog(null)} />
      <SaleDialog open={dialog === "venta"} onOpenChange={(v) => !v && setDialog(null)} />
      <PayTeacherDialog open={dialog === "profe"} onOpenChange={(v) => !v && setDialog(null)} />
    </div>
  );
}
