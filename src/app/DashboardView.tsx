"use client";

import { useEffect, useState } from "react";

type Corte = "Corte 1" | "Corte 2" | "todos";

type AgendamientoResumen = { estado: string; cantidad: number };
type VacanteActivaResumen = {
  empresa: string;
  vacante: string;
  perfil: string;
  genero: string;
  cupos: number;
};
type EmbudoTotales = { remitidas: number; enProceso: number; contratadas: number; noPaso: number };
type EmbudoPorVacante = EmbudoTotales & { empresa: string; vacante: string };
type EmbudoPorEmpresa = EmbudoTotales & { empresa: string };
type EmpresaSinRemision = { empresa: string; vacante: string; motivo: string };
type NovedadVacante = { empresa: string; vacante: string; novedad: string };

type DashboardData = {
  totalEmpresas: number;
  totalVacantesActivas: number;
  agendamientoPorEstado: AgendamientoResumen[];
  vacantesActivas: VacanteActivaResumen[];
  embudoTotal: EmbudoTotales;
  embudoPorVacante: EmbudoPorVacante[];
  embudoPorEmpresa: EmbudoPorEmpresa[];
  sinRemision: EmpresaSinRemision[];
  novedades: NovedadVacante[];
};

function TarjetaKPI({ etiqueta, valor }: { etiqueta: string; valor: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-white/60 px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-[var(--color-grafito)]/50">{etiqueta}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--color-azul)]">
        {valor}
      </p>
    </div>
  );
}

function BarraHorizontal({
  etiqueta,
  cantidad,
  maximo,
  color = "var(--color-azul)",
}: {
  etiqueta: string;
  cantidad: number;
  maximo: number;
  color?: string;
}) {
  const pct = maximo > 0 ? Math.max((cantidad / maximo) * 100, 3) : 0;
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-[var(--color-grafito)]">{etiqueta}</span>
        <span className="font-medium text-[var(--color-grafito)]">{cantidad}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-black/5">
        <div
          className="h-2.5 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function Embudo({ totales }: { totales: EmbudoTotales }) {
  const etapas = [
    { nombre: "Remitidas", valor: totales.remitidas, color: "var(--color-azul)" },
    { nombre: "En proceso", valor: totales.enProceso, color: "var(--color-azul)" },
    { nombre: "Contratadas", valor: totales.contratadas, color: "var(--color-amarillo)" },
    { nombre: "No pasó", valor: totales.noPaso, color: "var(--color-grafito)" },
  ];
  const max = totales.remitidas || 1;

  return (
    <div className="space-y-3">
      {etapas.map((etapa) => {
        const pct = Math.max((etapa.valor / max) * 100, 4);
        return (
          <div key={etapa.nombre}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-[var(--color-grafito)]">{etapa.nombre}</span>
              <span className="font-medium text-[var(--color-grafito)]">
                {etapa.valor}{" "}
                <span className="text-xs text-[var(--color-grafito)]/50">
                  ({max ? Math.round((etapa.valor / max) * 100) : 0}%)
                </span>
              </span>
            </div>
            <div className="h-4 w-full rounded-md bg-black/5">
              <div
                className="h-4 rounded-md transition-all"
                style={{ width: `${pct}%`, backgroundColor: etapa.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BotonExportarTarjeta({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-azul)]/30 px-3 py-1 text-xs font-medium text-[var(--color-azul)] transition-colors hover:bg-[var(--color-azul)]/5"
    >
      ⬇ Exportar
    </a>
  );
}

type FiltroVacantes = "todas" | "con" | "sin";

export default function DashboardView({
  corte,
  filtroVacantes,
}: {
  corte: Corte;
  filtroVacantes: FiltroVacantes;
}) {
  const [datos, setDatos] = useState<DashboardData | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    fetch(
      `/api/zoho/dashboard?corte=${encodeURIComponent(corte)}&vacantes=${filtroVacantes}`
    )
      .then((r) => r.json())
      .then((data) => {
        setDatos(data);
        setCargando(false);
      });
  }, [corte, filtroVacantes]);

  if (cargando || !datos) {
    return <p className="p-6 text-sm text-[var(--color-grafito)]/50">Calculando indicadores…</p>;
  }

  const maxAgendamiento = Math.max(1, ...datos.agendamientoPorEstado.map((a) => a.cantidad));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      {/* KPIs */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        <TarjetaKPI etiqueta="Empresas" valor={datos.totalEmpresas} />
        <TarjetaKPI etiqueta="Vacantes activas" valor={datos.totalVacantesActivas} />
        <TarjetaKPI etiqueta="Remitidas" valor={datos.embudoTotal.remitidas} />
        <TarjetaKPI etiqueta="Contratadas" valor={datos.embudoTotal.contratadas} />
        <TarjetaKPI
          etiqueta="% Conversión"
          valor={
            datos.embudoTotal.remitidas
              ? `${Math.round((datos.embudoTotal.contratadas / datos.embudoTotal.remitidas) * 100)}%`
              : "—"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Tablero de agendamiento */}
        <section className="rounded-xl border border-[var(--color-line)] bg-white/40 p-5">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg text-[var(--color-azul)]">
            Tablero de agendamiento
          </h2>
          {datos.agendamientoPorEstado.length ? (
            datos.agendamientoPorEstado.map((a) => (
              <BarraHorizontal
                key={a.estado}
                etiqueta={a.estado}
                cantidad={a.cantidad}
                maximo={maxAgendamiento}
              />
            ))
          ) : (
            <p className="text-sm text-[var(--color-grafito)]/40">Sin datos.</p>
          )}
        </section>

        {/* Embudo de resultados */}
        <section className="rounded-xl border border-[var(--color-line)] bg-white/40 p-5">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg text-[var(--color-azul)]">
            Embudo de resultados (consolidado)
          </h2>
          <Embudo totales={datos.embudoTotal} />
        </section>

        {/* Ranking: empresas con vacante activa sin remisión */}
        <section className="rounded-xl border border-[var(--color-line)] bg-white/40 p-5 lg:col-span-2">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-azul)]">
              Empresas con vacante activada pero sin remisión
            </h2>
            <BotonExportarTarjeta href={`/api/export/dashboard/sin-remision?corte=${encodeURIComponent(corte)}&vacantes=${filtroVacantes}`} />
          </div>
          <p className="mb-4 text-xs text-[var(--color-grafito)]/50">
            {datos.sinRemision.length} vacante(s) activa(s) sin ninguna participante remitida
          </p>
          {datos.sinRemision.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-xs uppercase text-[var(--color-grafito)]/50">
                    <th className="py-2 pr-4">Empresa</th>
                    <th className="py-2 pr-4">Vacante</th>
                    <th className="py-2 pr-4">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.sinRemision.map((r, i) => (
                    <tr key={i} className="border-b border-[var(--color-line)]/60">
                      <td className="py-2 pr-4">{r.empresa}</td>
                      <td className="py-2 pr-4">{r.vacante}</td>
                      <td className="py-2 pr-4 text-[var(--color-grafito)]/70">{r.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-grafito)]/40">
              Todas las vacantes activas ya tienen al menos una participante remitida.
            </p>
          )}
        </section>

        {/* Listado de vacantes activadas */}
        <section className="rounded-xl border border-[var(--color-line)] bg-white/40 p-5 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-azul)]">
              Vacantes activadas — perfil y enfoque de género
            </h2>
            <BotonExportarTarjeta href={`/api/export/dashboard/vacantes-activas?corte=${encodeURIComponent(corte)}&vacantes=${filtroVacantes}`} />
          </div>
          {datos.vacantesActivas.length ? (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[var(--color-paper)]">
                  <tr className="border-b border-[var(--color-line)] text-xs uppercase text-[var(--color-grafito)]/50">
                    <th className="py-2 pr-4">Empresa</th>
                    <th className="py-2 pr-4">Vacante</th>
                    <th className="py-2 pr-4">Cupos</th>
                    <th className="py-2 pr-4">Género</th>
                    <th className="py-2 pr-4">Perfil</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.vacantesActivas.map((v, i) => (
                    <tr key={i} className="border-b border-[var(--color-line)]/60">
                      <td className="py-2 pr-4">{v.empresa}</td>
                      <td className="py-2 pr-4">{v.vacante}</td>
                      <td className="py-2 pr-4">{v.cupos}</td>
                      <td className="py-2 pr-4">{v.genero}</td>
                      <td className="max-w-xs py-2 pr-4 text-[var(--color-grafito)]/70">
                        {v.perfil}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-grafito)]/40">No hay vacantes activas.</p>
          )}
        </section>

        {/* Embudo por empresa */}
        <section className="rounded-xl border border-[var(--color-line)] bg-white/40 p-5 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-azul)]">
              Embudo por empresa
            </h2>
            <BotonExportarTarjeta href={`/api/export/dashboard/embudo-por-empresa?corte=${encodeURIComponent(corte)}&vacantes=${filtroVacantes}`} />
          </div>
          {datos.embudoPorEmpresa.length ? (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[var(--color-paper)]">
                  <tr className="border-b border-[var(--color-line)] text-xs uppercase text-[var(--color-grafito)]/50">
                    <th className="py-2 pr-4">Empresa</th>
                    <th className="py-2 pr-4">Remitidas</th>
                    <th className="py-2 pr-4">En proceso</th>
                    <th className="py-2 pr-4">Contratadas</th>
                    <th className="py-2 pr-4">No pasó</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.embudoPorEmpresa.map((e, i) => (
                    <tr key={i} className="border-b border-[var(--color-line)]/60">
                      <td className="py-2 pr-4">{e.empresa}</td>
                      <td className="py-2 pr-4">{e.remitidas}</td>
                      <td className="py-2 pr-4">{e.enProceso}</td>
                      <td className="py-2 pr-4 font-medium text-[var(--color-azul)]">
                        {e.contratadas}
                      </td>
                      <td className="py-2 pr-4">{e.noPaso}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-grafito)]/40">Sin remisiones registradas.</p>
          )}
        </section>

        {/* Embudo por vacante */}
        <section className="rounded-xl border border-[var(--color-line)] bg-white/40 p-5 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-azul)]">
              Embudo por vacante
            </h2>
            <BotonExportarTarjeta href={`/api/export/dashboard/embudo-por-vacante?corte=${encodeURIComponent(corte)}&vacantes=${filtroVacantes}`} />
          </div>
          {datos.embudoPorVacante.length ? (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[var(--color-paper)]">
                  <tr className="border-b border-[var(--color-line)] text-xs uppercase text-[var(--color-grafito)]/50">
                    <th className="py-2 pr-4">Empresa</th>
                    <th className="py-2 pr-4">Vacante</th>
                    <th className="py-2 pr-4">Remitidas</th>
                    <th className="py-2 pr-4">En proceso</th>
                    <th className="py-2 pr-4">Contratadas</th>
                    <th className="py-2 pr-4">No pasó</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.embudoPorVacante.map((e, i) => (
                    <tr key={i} className="border-b border-[var(--color-line)]/60">
                      <td className="py-2 pr-4">{e.empresa}</td>
                      <td className="py-2 pr-4">{e.vacante}</td>
                      <td className="py-2 pr-4">{e.remitidas}</td>
                      <td className="py-2 pr-4">{e.enProceso}</td>
                      <td className="py-2 pr-4 font-medium text-[var(--color-azul)]">
                        {e.contratadas}
                      </td>
                      <td className="py-2 pr-4">{e.noPaso}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-grafito)]/40">Sin remisiones registradas.</p>
          )}
        </section>

        {/* Novedades relevantes por empresa */}
        <section className="rounded-xl border border-[var(--color-line)] bg-white/40 p-5 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-azul)]">
              Novedades relevantes por empresa
            </h2>
            <BotonExportarTarjeta href={`/api/export/dashboard/novedades?corte=${encodeURIComponent(corte)}&vacantes=${filtroVacantes}`} />
          </div>
          {datos.novedades.length ? (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[var(--color-paper)]">
                  <tr className="border-b border-[var(--color-line)] text-xs uppercase text-[var(--color-grafito)]/50">
                    <th className="py-2 pr-4">Empresa</th>
                    <th className="py-2 pr-4">Vacante</th>
                    <th className="py-2 pr-4">Novedad</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.novedades.map((n, i) => (
                    <tr key={i} className="border-b border-[var(--color-line)]/60">
                      <td className="py-2 pr-4">{n.empresa}</td>
                      <td className="py-2 pr-4">{n.vacante}</td>
                      <td className="py-2 pr-4 text-[var(--color-grafito)]/70">{n.novedad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-grafito)]/40">Sin novedades registradas.</p>
          )}
        </section>
      </div>
    </div>
  );
}
