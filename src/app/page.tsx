"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardView from "./DashboardView";

type Empresa = {
  id: string;
  nit: string;
  nombre: string;
  departamento: string;
  municipio: string;
  sector: string;
  tamano: string;
  tieneVacantes: boolean;
  numVacantes: number;
  tieneAgendamiento: boolean;
};

type Agendamiento = {
  id: string;
  fecha: string;
  estado: string;
  tipoActividad: string;
  modalidad: string;
};

type Vacante = {
  id: string;
  nombre: string;
  cargo: string;
  estado: string;
  cupos: number;
  perfil: string;
};

type Intermediacion = {
  id: string;
  nombreCompleto: string;
  documento: string;
  estado: string;
  fecha: string;
};

type Colocacion = {
  id: string;
  nombreCompleto: string;
  documento: string;
  fechaVinculacion: string;
  gestor: string;
  verificado: boolean;
};

type Corte = "Corte 1" | "Corte 2" | "todos";
type FiltroVacantes = "todas" | "con" | "sin";
type TipoExport = "empresas" | "vacantes" | "agendamientos" | "participantes";

function formatFecha(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function EstadoBadge({ estado }: { estado: string }) {
  const normalizado = estado.toLowerCase();
  const positivo = ["contratado", "realizada", "activa", "activada"].some((k) =>
    normalizado.includes(k)
  );
  const negativo = ["cancelada", "cerrada", "no super", "no pasó", "rechazado"].some((k) =>
    normalizado.includes(k)
  );
  const tono = positivo ? "positivo" : negativo ? "negativo" : "neutro";

  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
        (tono === "positivo"
          ? "bg-[var(--color-amarillo)] text-[var(--color-grafito)]"
          : tono === "negativo"
          ? "bg-[var(--color-grafito)] text-[var(--color-blanco)]"
          : "bg-[var(--color-azul)]/10 text-[var(--color-azul)]")
      }
    >
      {estado || "Sin estado"}
    </span>
  );
}

function ColumnShell({
  title,
  eyebrow,
  children,
  empty,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[var(--color-line)] px-5 py-4">
        {eyebrow && <p className="mb-1 text-xs text-[var(--color-grafito)]/50">{eyebrow}</p>}
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-azul)]">
          {title}
        </h2>
      </div>
      <div
        className={
          "min-h-0 flex-1 overflow-y-auto " + (empty ? "flex items-center justify-center" : "")
        }
      >
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const [corte, setCorte] = useState<Corte>("Corte 1");
  const [busqueda, setBusqueda] = useState("");
  const [filtroVacantes, setFiltroVacantes] = useState<FiltroVacantes>("todas");
  const [tipoExport, setTipoExport] = useState<TipoExport>("empresas");
  const [vista, setVista] = useState<"navegacion" | "dashboard">("dashboard");
  const [saludZoho, setSaludZoho] = useState<{ ok: boolean; error?: string } | null>(null);
  const [soloVerificados, setSoloVerificados] = useState(false);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);

  const [empresaSel, setEmpresaSel] = useState<Empresa | null>(null);
  const [agendamientos, setAgendamientos] = useState<Agendamiento[]>([]);
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [cargandoEmpresaDet, setCargandoEmpresaDet] = useState(false);
  const [resumenEmpresa, setResumenEmpresa] = useState<{
    remitidas: number;
    enProceso: number;
    contratadas: number;
    noPaso: number;
  } | null>(null);

  const [vacanteSel, setVacanteSel] = useState<Vacante | null>(null);
  const [intermediaciones, setIntermediaciones] = useState<Intermediacion[]>([]);
  const [colocaciones, setColocaciones] = useState<Colocacion[]>([]);
  const [cargandoVacanteDet, setCargandoVacanteDet] = useState(false);

  useEffect(() => {
    setEmpresaSel(null);
    setVacanteSel(null);
    setEmpresas([]);
    setCargandoEmpresas(true);
    fetch(
      `/api/zoho/empresas?corte=${encodeURIComponent(corte)}&offset=0&vacantes=${filtroVacantes}`
    )
      .then((r) => r.json())
      .then((data) => {
        setEmpresas(data.empresas);
        setCargandoEmpresas(false);
      });
  }, [corte, filtroVacantes]);

  // Chequeo de conexión con Zoho — al cargar y cada 5 minutos, para que el
  // equipo vea de un vistazo si la app sigue conectada.
  useEffect(() => {
    function revisar() {
      fetch("/api/zoho/health")
        .then((r) => r.json())
        .then((data) => setSaludZoho(data))
        .catch(() => setSaludZoho({ ok: false, error: "No se pudo consultar el estado." }));
    }
    revisar();
    const intervalo = setInterval(revisar, 5 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, []);

  function seleccionarEmpresa(empresa: Empresa) {
    setEmpresaSel(empresa);
    setVacanteSel(null);
    setAgendamientos([]);
    setVacantes([]);
    setResumenEmpresa(null);
    setCargandoEmpresaDet(true);
    fetch(
      `/api/zoho/empresa/${empresa.id}?corte=${encodeURIComponent(corte)}&nombre=${encodeURIComponent(empresa.nombre)}&offsetAgendamientos=0&offsetVacantes=0`
    )
      .then((r) => r.json())
      .then((data) => {
        setAgendamientos(data.agendamientos);
        setVacantes(data.vacantes);
        setResumenEmpresa(data.resumen ?? null);
        setCargandoEmpresaDet(false);
      });
  }

  function cargarVacanteDet(vacante: Vacante, soloVer: boolean) {
    setCargandoVacanteDet(true);
    fetch(
      `/api/zoho/vacante/${vacante.id}?corte=${encodeURIComponent(corte)}&offsetIntermediaciones=0&offsetColocaciones=0&soloVerificadas=${soloVer}`
    )
      .then((r) => r.json())
      .then((data) => {
        setIntermediaciones(data.intermediaciones);
        setColocaciones(data.colocaciones);
        setCargandoVacanteDet(false);
      });
  }

  function seleccionarVacante(vacante: Vacante) {
    setVacanteSel(vacante);
    setIntermediaciones([]);
    setColocaciones([]);
    cargarVacanteDet(vacante, soloVerificados);
  }

  function alternarSoloVerificados() {
    const nuevo = !soloVerificados;
    setSoloVerificados(nuevo);
    if (vacanteSel) cargarVacanteDet(vacanteSel, nuevo);
  }

  const empresasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return empresas;
    return empresas.filter(
      (e) => e.nombre.toLowerCase().includes(q) || e.nit.includes(q)
    );
  }, [empresas, busqueda]);

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-x-hidden">
      <header className="flex shrink-0 flex-col gap-3 border-b border-black/10 bg-[var(--color-azul)] px-4 py-3 text-[var(--color-paper)] sm:px-6 sm:py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/colsubsidio-logo.png" alt="Colsubsidio" className="h-6 w-auto sm:h-8" />
            <div className="rounded-md bg-white px-1.5 py-1 sm:px-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/fci-logo.png"
                alt="Fundación Colombia Incluyente"
                className="h-5 w-auto sm:h-6"
              />
            </div>
          </div>
          <div className="hidden h-9 w-px bg-white/20 sm:block" />
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-paper)]/60">
              Ruta Mujer
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-lg sm:text-2xl">
              Seguimiento a empresas
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={corte}
            onChange={(e) => setCorte(e.target.value as Corte)}
            className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm text-[var(--color-paper)] focus:bg-white/15 sm:px-4"
          >
            <option className="text-[var(--color-grafito)]" value="Corte 1">Cohorte 1</option>
            <option className="text-[var(--color-grafito)]" value="Corte 2">Cohorte 2</option>
            <option className="text-[var(--color-grafito)]" value="todos">Todas las cohortes</option>
          </select>
          <select
            value={filtroVacantes}
            onChange={(e) => setFiltroVacantes(e.target.value as FiltroVacantes)}
            className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm text-[var(--color-paper)] focus:bg-white/15 sm:px-4"
          >
            <option className="text-[var(--color-grafito)]" value="todas">Todas las empresas</option>
            <option className="text-[var(--color-grafito)]" value="con">Con vacantes</option>
            <option className="text-[var(--color-grafito)]" value="sin">Sin vacantes</option>
          </select>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar empresa o NIT…"
            className="w-full min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-[var(--color-paper)] placeholder:text-[var(--color-paper)]/50 focus:bg-white/15 sm:w-56 sm:flex-none md:w-72"
          />
          <div
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-2"
            title={
              saludZoho === null
                ? "Revisando conexión con Zoho…"
                : saludZoho.ok
                ? "Conexión con Zoho: activa"
                : `Conexión con Zoho: con problemas — ${saludZoho.error ?? ""}`
            }
          >
            <span
              className={
                "h-2.5 w-2.5 rounded-full " +
                (saludZoho === null
                  ? "bg-white/40"
                  : saludZoho.ok
                  ? "bg-[var(--color-amarillo)]"
                  : "bg-red-500")
              }
            />
            <span className="text-xs text-[var(--color-paper)]/70">Zoho</span>
          </div>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--color-line)] bg-white/40 px-4 py-2 text-sm sm:px-6">
        <span className="text-xs uppercase tracking-wide text-[var(--color-grafito)]/50">
          Exportar (Excel, cohorte actual):
        </span>
        <select
          value={tipoExport}
          onChange={(e) => setTipoExport(e.target.value as TipoExport)}
          className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1 text-xs text-[var(--color-grafito)]"
        >
          <option value="empresas">Empresas</option>
          <option value="vacantes">Vacantes</option>
          <option value="agendamientos">Agendamiento</option>
          <option value="participantes">Participantes (intermediados y colocados)</option>
        </select>
        <a
          href={`/api/export/${tipoExport}?corte=${encodeURIComponent(corte)}`}
          className="rounded-full bg-[var(--color-azul)] px-4 py-1 text-xs font-medium text-white transition-colors hover:opacity-90"
        >
          ⬇ Exportar
        </a>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-line)] bg-white/60 px-4 sm:px-6">
        <button
          onClick={() => setVista("dashboard")}
          className={
            "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors " +
            (vista === "dashboard"
              ? "border-[var(--color-azul)] text-[var(--color-azul)]"
              : "border-transparent text-[var(--color-grafito)]/50 hover:text-[var(--color-grafito)]")
          }
        >
          Dashboard BI
        </button>
        <button
          onClick={() => setVista("navegacion")}
          className={
            "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors " +
            (vista === "navegacion"
              ? "border-[var(--color-azul)] text-[var(--color-azul)]"
              : "border-transparent text-[var(--color-grafito)]/50 hover:text-[var(--color-grafito)]")
          }
        >
          Navegación
        </button>
      </div>

      {vista === "navegacion" && (
        <>
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-line)] px-4 py-2 text-sm text-[var(--color-grafito)]/70 sm:px-6">
        <span className={empresaSel ? "" : "font-medium text-[var(--color-azul)]"}>Empresas</span>
        {empresaSel && (
          <>
            <span className="text-[var(--color-grafito)]/30">/</span>
            <span className={vacanteSel ? "" : "font-medium text-[var(--color-azul)]"}>
              {empresaSel.nombre}
            </span>
          </>
        )}
        {vacanteSel && (
          <>
            <span className="text-[var(--color-grafito)]/30">/</span>
            <span className="font-medium text-[var(--color-azul)]">{vacanteSel.nombre}</span>
          </>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 divide-x divide-[var(--color-line)] md:grid-cols-3">
        {/* Columna 1: Empresas */}
        <ColumnShell title="Empresas" eyebrow={`${empresasFiltradas.length} cargadas`}>
          {cargandoEmpresas ? (
            <p className="p-5 text-sm text-[var(--color-grafito)]/50">Cargando…</p>
          ) : empresasFiltradas.length === 0 ? (
            <p className="p-5 text-sm text-[var(--color-grafito)]/40">
              No hay empresas para esta cohorte todavía.
            </p>
          ) : (
            <ul>
              {empresasFiltradas.map((empresa) => (
                <li key={empresa.id}>
                  <button
                    onClick={() => seleccionarEmpresa(empresa)}
                    className={
                      "w-full border-b border-[var(--color-line)] px-5 py-4 text-left transition-colors hover:bg-black/[0.03] " +
                      (empresaSel?.id === empresa.id ? "bg-[var(--color-azul)]/5" : "")
                    }
                  >
                    <p className="font-medium text-[var(--color-azul)]">{empresa.nombre}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-grafito)]/50">
                      NIT {empresa.nit} · {empresa.municipio}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-grafito)]/60">
                      {empresa.numVacantes} vacante(s)
                      {empresa.tieneAgendamiento ? " · Con agendamiento" : " · Sin agendamiento"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ColumnShell>

        {/* Columna 2: Agendamiento + Vacantes de la empresa seleccionada */}
        <ColumnShell
          title={empresaSel ? "Agendamiento y vacantes" : "Selecciona una empresa"}
          eyebrow={empresaSel ? empresaSel.sector : undefined}
          empty={!empresaSel}
        >
          {!empresaSel ? (
            <p className="text-sm text-[var(--color-grafito)]/40">
              Elige una empresa de la lista para ver su información.
            </p>
          ) : cargandoEmpresaDet ? (
            <p className="p-5 text-sm text-[var(--color-grafito)]/50">Cargando…</p>
          ) : (
            <div className="p-5">
              {resumenEmpresa && resumenEmpresa.remitidas > 0 && (
                <p className="mb-4 rounded-lg bg-[var(--color-azul)]/5 px-4 py-3 text-sm text-[var(--color-grafito)]/80">
                  <span className="font-medium text-[var(--color-azul)]">
                    {resumenEmpresa.remitidas} remitida(s)
                  </span>{" "}
                  · {resumenEmpresa.enProceso} en proceso · {resumenEmpresa.contratadas} contratada(s) ·{" "}
                  {resumenEmpresa.noPaso} no pasó — sumando todas sus vacantes
                </p>
              )}
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-grafito)]/50">
                Agendamiento
              </h3>
              <ul className="mb-6 space-y-2">
                {agendamientos.length ? (
                  agendamientos.map((a) => (
                    <li key={a.id} className="rounded-lg border border-[var(--color-line)] bg-white/40 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{a.tipoActividad}</p>
                        <EstadoBadge estado={a.estado} />
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-grafito)]/50">
                        {formatFecha(a.fecha)} · {a.modalidad}
                      </p>
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-[var(--color-grafito)]/40">Sin agendamientos registrados.</p>
                )}
              </ul>

              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-grafito)]/50">
                Vacantes ({vacantes.length})
              </h3>
              <ul className="space-y-2">
                {vacantes.length ? (
                  vacantes.map((v) => (
                    <li key={v.id}>
                      <button
                        onClick={() => seleccionarVacante(v)}
                        className={
                          "w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-left transition-colors hover:bg-black/[0.03] " +
                          (vacanteSel?.id === v.id ? "bg-[var(--color-azul)]/5" : "bg-white/40")
                        }
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{v.nombre}</p>
                          <EstadoBadge estado={v.estado} />
                        </div>
                        <p className="mt-1 text-xs text-[var(--color-grafito)]/50">
                          {v.cupos} cupo(s) · {v.cargo}
                        </p>
                      </button>
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-[var(--color-grafito)]/40">Sin vacantes registradas.</p>
                )}
              </ul>
            </div>
          )}
        </ColumnShell>

        {/* Columna 3: Participantes de la vacante seleccionada */}
        <ColumnShell
          title={vacanteSel ? "Participantes" : "Selecciona una vacante"}
          eyebrow={vacanteSel ? vacanteSel.nombre : undefined}
          empty={!vacanteSel}
        >
          {!vacanteSel ? (
            <p className="text-sm text-[var(--color-grafito)]/40">
              Elige una vacante para ver a quién se remitió y quién quedó contratada.
            </p>
          ) : cargandoVacanteDet ? (
            <p className="p-5 text-sm text-[var(--color-grafito)]/50">Cargando…</p>
          ) : (
            <div className="p-5">
              <p className="mb-5 rounded-lg bg-[var(--color-azul)]/5 px-4 py-3 text-sm text-[var(--color-grafito)]/70">
                {vacanteSel.perfil}
              </p>

              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-grafito)]/50">
                  Contratadas ({colocaciones.length})
                </h3>
                <label className="flex items-center gap-1.5 text-xs text-[var(--color-grafito)]/70">
                  <input
                    type="checkbox"
                    checked={soloVerificados}
                    onChange={alternarSoloVerificados}
                    className="accent-[var(--color-azul)]"
                  />
                  Solo verificados
                </label>
              </div>
              <ul className="mb-6 space-y-2">
                {colocaciones.length ? (
                  colocaciones.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-lg border border-[var(--color-amarillo)]/40 bg-[var(--color-amarillo)]/10 px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{c.nombreCompleto}</p>
                        {c.verificado && (
                          <span className="text-xs font-medium text-[var(--color-azul)]">✓ Verificado</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-grafito)]/50">
                        Vinculada el {formatFecha(c.fechaVinculacion)} · Gestor: {c.gestor}
                      </p>
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-[var(--color-grafito)]/40">Aún ninguna.</p>
                )}
              </ul>

              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-grafito)]/50">
                Remitidas ({intermediaciones.length})
              </h3>
              <ul className="space-y-2">
                {intermediaciones.length ? (
                  intermediaciones.map((i) => (
                    <li key={i.id} className="rounded-lg border border-[var(--color-line)] bg-white/40 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{i.nombreCompleto}</p>
                        <EstadoBadge estado={i.estado} />
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-grafito)]/50">{formatFecha(i.fecha)}</p>
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-[var(--color-grafito)]/40">Sin participantes remitidas.</p>
                )}
              </ul>
            </div>
          )}
        </ColumnShell>
      </div>
        </>
      )}

      {vista === "dashboard" && <DashboardView corte={corte} filtroVacantes={filtroVacantes} />}
    </div>
  );
}
