"use client";

// ─── AM · Shell de la app: header + rol + navegación inferior ──────────────
import { useEffect, useState, useSyncExternalStore } from "react";
import { useSchool } from "@/lib/school/store";
import { SEDE } from "@/lib/school/types";
import { currentPeriod, monthName } from "@/lib/school/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  BarChart3,
  ClipboardCheck,
  Cpu,
  Download,
  House,
  RotateCcw,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardView } from "./dashboard-view";
import { StudentsView } from "./students-view";
import { AttendanceView } from "./attendance-view";
import { CajaView } from "./caja-view";
import { ReportsView } from "./reports-view";

type TeacherTab = "inicio" | "asistencia" | "alumnos";
type AdminTab = TeacherTab | "caja" | "reportes";
export type TabId = AdminTab;

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex size-16 animate-pulse items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10">
        <Cpu className="size-8 text-cyan-400" />
      </div>
      <div className="text-center">
        <p className="text-base font-bold tracking-tight text-zinc-100">AM</p>
        <p className="text-xs text-zinc-500">Mecatrónica para niños</p>
      </div>
    </div>
  );
}

/** Conmutador de vista Admin / Profesor (prototipo) */
function RoleSwitch() {
  const role = useSchool((s) => s.role);
  const setRole = useSchool((s) => s.setRole);
  return (
    <div
      role="radiogroup"
      aria-label="Rol de la app"
      className="flex rounded-xl border border-zinc-800 bg-zinc-900/80 p-0.5"
    >
      {(
        [
          { id: "profesor", label: "Profesor", icon: ClipboardCheck },
          { id: "admin", label: "Admin", icon: ShieldCheck },
        ] as const
      ).map(({ id, label, icon: Icon }) => {
        const on = role === id;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={on}
            aria-label={`Vista ${label}`}
            title={`Vista ${label}`}
            onClick={() => setRole(id)}
            className={cn(
              "flex min-h-8 items-center gap-1.5 rounded-[10px] px-2 text-[11px] font-semibold transition-colors sm:px-2.5",
              on
                ? id === "admin"
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                  : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : "border border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SchoolApp() {
  // Flag de montaje sin setState (evita desajustes de hidratación SSR)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const role = useSchool((s) => s.role);
  const [tab, setTab] = useState<TabId>("inicio");
  const [attendanceSlot, setAttendanceSlot] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const ensureSeeded = useSchool((s) => s.ensureSeeded);
  const resetDemo = useSchool((s) => s.resetDemo);

  useEffect(() => {
    ensureSeeded();
  }, [ensureSeeded]);

  if (!mounted) return <Splash />;

  const isAdmin = role === "admin";

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] =
    isAdmin
      ? [
          { id: "inicio", label: "Inicio", icon: House },
          { id: "asistencia", label: "Asistencia", icon: ClipboardCheck },
          { id: "alumnos", label: "Alumnos", icon: Users },
          { id: "caja", label: "Caja", icon: Wallet },
          { id: "reportes", label: "Reportes", icon: BarChart3 },
        ]
      : [
          { id: "inicio", label: "Inicio", icon: House },
          { id: "asistencia", label: "Asistencia", icon: ClipboardCheck },
          { id: "alumnos", label: "Alumnos", icon: Users },
        ];

  // Si cambia el rol, ubica el tab en un destino válido
  const activeTab: TabId = tabs.some((t) => t.id === tab) ? tab : "inicio";

  const switchTab = (id: TabId) => {
    setTab(id);
    if (id !== "asistencia") setAttendanceSlot(null);
  };

  const goAttendance = (slotId: string) => {
    setAttendanceSlot(slotId);
    setTab("asistencia");
  };

  const exportJson = () => {
    const { students, teachers, purchases, cashTxs, sessions, cajaBase } = useSchool.getState();
    const data = { sede: SEDE, students, teachers, purchases, cashTxs, sessions, cajaBase };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `am-respaldo-${currentPeriod()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Respaldo descargado (JSON)");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-cyan-500/5">
              <Cpu className="size-5 text-cyan-400" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-bold tracking-tight text-zinc-100 sm:text-sm">
                AM <span className="text-cyan-400">·</span>{" "}
                <span className="font-medium text-zinc-400">Mecatrónica para niños</span>
              </p>
              <p className="truncate text-[10px] uppercase tracking-wider text-zinc-500">
                Sede {SEDE}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RoleSwitch />
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="size-9 rounded-xl" aria-label="Opciones de datos">
                    <Download className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Datos de la sede</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportJson}>
                    <Download className="size-4" /> Descargar respaldo (JSON)
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setResetOpen(true)}>
                    <RotateCcw className="size-4" /> Reiniciar datos demo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Confirmación de reinicio */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reiniciar los datos demo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrarán los cambios que hayas hecho en este navegador y volverán los
              datos de ejemplo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetDemo();
                toast.success("Datos demo reiniciados");
              }}
            >
              Reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contenido */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-28">
        {activeTab === "inicio" && (
          <DashboardView
            onTakeAttendance={goAttendance}
            onGoCaja={() => setTab("caja")}
          />
        )}
        {activeTab === "alumnos" && <StudentsView />}
        {activeTab === "asistencia" && <AttendanceView initialSlot={attendanceSlot} />}
        {activeTab === "caja" && isAdmin && <CajaView />}
        {activeTab === "reportes" && isAdmin && <ReportsView />}
      </main>

      {/* Navegación inferior (táctil) */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/80 bg-background/90 backdrop-blur-md pb-safe"
      >
        <div
          className={cn(
            "mx-auto grid w-full max-w-3xl",
            tabs.length === 5 ? "grid-cols-5" : "grid-cols-3"
          )}
        >
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => switchTab(id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-cyan-400" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-cyan-400" />
                )}
                <Icon className="size-5" />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
