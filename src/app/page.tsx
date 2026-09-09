"use client";

import { useEffect, useMemo, useState } from "react";

type EmpresaResumen = {
  id: string;
  nit: string;
  nombre: string;
  departamento: string;
  municipio: string;
  sector: string;
  tamano: string;
  ultimoAgendamiento: {
    fecha: string;
    estado: string;
    tipoActividad: string;
    modalidad: string;
  } | null;
  totalVacantes: number;
  vacantesActivas: number;
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
};

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
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-line)] px-5 py-4">
        {eyebrow && (
          <p className="mb-1 text-xs text-[var(--color-grafito)]/50">{eyebrow}</p>
        )}
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-azul)]">
          {title}
        </h2>
      </div>
      <div className={"flex-1 overflow-y-auto " + (empty ? "flex items-center justify-center" : "")}>
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const [empresas, setEmpresas] = useState<EmpresaResumen[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [demo, setDemo] = useState(false);
  const [errorZoho, setErrorZoho] = useState<string | null>(null);
  const [corte, setCorte] = useState<"Corte 1" | "Corte 2" | "todos">("Corte 1");

  const [empresaSel, setEmpresaSel] = useState<EmpresaResumen | null>(null);
  const [detalleEmpresa, setDetalleEmpresa] = useState<{
    agendamientos: Agendamiento[];
    vacantes: Vacante[];
  } | null>(null);
  const [cargandoEmpresa, setCargandoEmpresa] = useState(false);

  const [vacanteSel, setVacanteSel] = useState<Vacante | null>(null);
  const [detalleVacante, setDetalleVacante] = useState<{
    intermediaciones: Intermediacion[];
    colocaciones: Colocacion[];
  } | null>(null);
  const [cargandoVacante, setCargandoVacante] = useState(false);

  useEffect(() => {
    setEmpresas(null);
    setEmpresaSel(null);
    setVacanteSel(null);
    setDetalleEmpresa(null);
    setDetalleVacante(null);
    fetch(`/api/zoho/empresas?corte=${encodeURIComponent(corte)}`)
      .then((r) => r.json())
      .then((data) => {
        setEmpresas(data.empresas);
        setDemo(Boolean(data.demo));
        setErrorZoho(data.error ?? null);
      });
  }, [corte]);

  function seleccionarEmpresa(empresa: EmpresaResumen) {
    setEmpresaSel(empresa);
    setVacanteSel(null);
    setDetalleVacante(null);
    setCargandoEmpresa(true);
    fetch(`/api/zoho/empresa/${empresa.id}?corte=${encodeURIComponent(corte)}`)
      .then((r) => r.json())
      .then((data) => {
        setDetalleEmpresa({ agendamientos: data.agendamientos, vacantes: data.vacantes });
        setCargandoEmpresa(false);
      });
  }

  function seleccionarVacante(vacante: Vacante) {
    setVacanteSel(vacante);
    setCargandoVacante(true);
    fetch(`/api/zoho/vacante/${vacante.id}?corte=${encodeURIComponent(corte)}`)
      .then((r) => r.json())
      .then((data) => {
        setDetalleVacante({
          intermediaciones: data.intermediaciones,
          colocaciones: data.colocaciones,
        });
        setCargandoVacante(false);
      });
  }

  const empresasFiltradas = useMemo(() => {
    if (!empresas) return [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return empresas;
    return empresas.filter(
      (e) => e.nombre.toLowerCase().includes(q) || e.nit.includes(q)
    );
  }, [empresas, busqueda]);

  return (
    <div className="flex h-screen flex-col">
      {/* Cabecera */}
      <header className="flex items-center justify-between border-b border-black/10 bg-[var(--color-azul)] px-6 py-4 text-[var(--color-paper)]">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-paper)]/60">
            Colsubsidio · Ruta Mujer
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl">
            Seguimiento a empresas
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={corte}
            onChange={(e) => setCorte(e.target.value as "Corte 1" | "Corte 2" | "todos")}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-[var(--color-paper)] focus:bg-white/15"
          >
            <option className="text-[var(--color-grafito)]" value="Corte 1">Corte 1</option>
            <option className="text-[var(--color-grafito)]" value="Corte 2">Corte 2</option>
            <option className="text-[var(--color-grafito)]" value="todos">Todos los cortes</option>
          </select>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar empresa o NIT…"
            className="w-72 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-[var(--color-paper)] placeholder:text-[var(--color-paper)]/50 focus:bg-white/15"
          />
        </div>
      </header>

      {demo && (
        <div className="border-b border-[var(--color-amarillo)]/40 bg-[var(--color-amarillo)]/15 px-6 py-2 text-sm text-[var(--color-azul)]">
          {errorZoho ? (
            <>
              <strong>No se pudo conectar con Zoho</strong> — mostrando datos de
              demostración mientras tanto. Detalle del error:{" "}
              <code className="rounded bg-black/5 px-1 py-0.5 text-xs">{errorZoho}</code>
            </>
          ) : (
            <>
              Estás viendo datos de demostración. Configura las credenciales de
              Zoho (ver README) para conectar con el CRM real.
            </>
          )}
        </div>
      )}

      {/* Ruta / breadcrumb */}
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-6 py-2 text-sm text-[var(--color-grafito)]/70">
        <span className={empresaSel ? "" : "font-medium text-[var(--color-azul)]"}>
          Empresas
        </span>
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
            <span className="font-medium text-[var(--color-azul)]">
              {vacanteSel.nombre}
            </span>
          </>
        )}
      </div>

      {/* Paneles tipo drill-down */}
      <div className="grid flex-1 grid-cols-1 divide-x divide-[var(--color-line)] overflow-hidden md:grid-cols-3">
        {/* Columna 1: Empresas */}
        <ColumnShell title="Empresas" eyebrow={`${empresasFiltradas.length} registradas`}>
          {!empresas ? (
            <p className="p-5 text-sm text-[var(--color-grafito)]/50">Cargando…</p>
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
                    <div className="mt-2 flex items-center gap-2">
                      {empresa.ultimoAgendamiento && (
                        <EstadoBadge estado={empresa.ultimoAgendamiento.estado} />
                      )}
                      <span className="text-xs text-[var(--color-grafito)]/50">
                        {empresa.vacantesActivas} vacante(s) activa(s)
                      </span>
                    </div>
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
          ) : cargandoEmpresa ? (
            <p className="p-5 text-sm text-[var(--color-grafito)]/50">Cargando…</p>
          ) : (
            <div className="p-5">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-grafito)]/50">
                Agendamiento
              </h3>
              <ul className="mb-6 space-y-2">
                {detalleEmpresa?.agendamientos.length ? (
                  detalleEmpresa.agendamientos.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg border border-[var(--color-line)] bg-white/40 px-4 py-3"
                    >
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
                  <p className="text-sm text-[var(--color-grafito)]/40">
                    Sin agendamientos registrados.
                  </p>
                )}
              </ul>

              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-grafito)]/50">
                Vacantes ({detalleEmpresa?.vacantes.length ?? 0})
              </h3>
              <ul className="space-y-2">
                {detalleEmpresa?.vacantes.length ? (
                  detalleEmpresa.vacantes.map((v) => (
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
                  <p className="text-sm text-[var(--color-grafito)]/40">
                    Sin vacantes registradas.
                  </p>
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
          ) : cargandoVacante ? (
            <p className="p-5 text-sm text-[var(--color-grafito)]/50">Cargando…</p>
          ) : (
            <div className="p-5">
              <p className="mb-5 rounded-lg bg-[var(--color-azul)]/5 px-4 py-3 text-sm text-[var(--color-grafito)]/70">
                {vacanteSel.perfil}
              </p>

              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-grafito)]/50">
                Contratadas ({detalleVacante?.colocaciones.length ?? 0})
              </h3>
              <ul className="mb-6 space-y-2">
                {detalleVacante?.colocaciones.length ? (
                  detalleVacante.colocaciones.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-lg border border-[var(--color-amarillo)]/40 bg-[var(--color-amarillo)]/10 px-4 py-3"
                    >
                      <p className="text-sm font-medium">{c.nombreCompleto}</p>
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
                Remitidas ({detalleVacante?.intermediaciones.length ?? 0})
              </h3>
              <ul className="space-y-2">
                {detalleVacante?.intermediaciones.length ? (
                  detalleVacante.intermediaciones.map((i) => (
                    <li
                      key={i.id}
                      className="rounded-lg border border-[var(--color-line)] bg-white/40 px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{i.nombreCompleto}</p>
                        <EstadoBadge estado={i.estado} />
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-grafito)]/50">
                        {formatFecha(i.fecha)}
                      </p>
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-[var(--color-grafito)]/40">
                    Sin participantes remitidas.
                  </p>
                )}
              </ul>
            </div>
          )}
        </ColumnShell>
      </div>
    </div>
  );
}
