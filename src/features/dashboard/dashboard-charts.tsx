import { Activity, ChartNoAxesColumn } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { EmptyState } from "@/components/ui"
import { formatNumber } from "@/lib/utils"

import type { DeliveryFunnel, OperacionPoint } from "./dashboard-stats"

/**
 * Las series se pintan con la escala de RELLENO, igual que la barra de
 * despacho: son áreas de color, no texto, así que no deben bajarse al paso
 * oscuro que el tema claro necesita para los iconos de los sellos.
 */
const COLOR = {
  proceso: "var(--color-fill-proceso)",
  entregado: "var(--color-fill-entregado)",
  pendiente: "var(--color-fill-pendiente)",
  fallido: "var(--color-fill-fallido)",
  leido: "var(--color-fill-leido)",
  cancelado: "var(--color-fill-cancelado)",
}

interface EntregaDato {
  name: string
  value: number
  color: string
}

function EntregaDatos(funnel: DeliveryFunnel): EntregaDato[] {
  return [
    { name: "Recibidos", value: funnel.recibidos, color: COLOR.entregado },
    { name: "En tránsito", value: funnel.enTransito, color: COLOR.proceso },
    { name: "Por enviar", value: funnel.porEnviar, color: COLOR.pendiente },
    { name: "Errores", value: funnel.errores, color: COLOR.fallido },
  ].filter((d) => d.value > 0)
}

export function EntregaDonut({ funnel }: { funnel: DeliveryFunnel }) {
  const data = EntregaDatos(funnel)
  const tieneDatos = funnel.total > 0
  const aceptados = funnel.enTransito + funnel.recibidos

  return (
    <div
      role="img"
      aria-label={
        tieneDatos
          ? data.map((d) => `${d.value} ${d.name.toLowerCase()}`).join(", ")
          : "Sin movimiento de envíos registrado."
      }
    >
      {tieneDatos ? (
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-[10rem_1fr] sm:items-center">
          <div className="relative mx-auto size-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="68%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke="var(--color-base-850)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold tabular-nums tracking-tight text-ink-100">
                {formatNumber(aceptados)}
              </p>
              <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-500">
                aceptados
              </p>
            </div>
          </div>

          <ul className="divide-y divide-rule-soft">
            {data.map((entry) => (
              <li key={entry.name} className="flex items-center justify-between gap-4 py-2">
                <span className="flex items-center gap-2 text-[0.8125rem] text-ink-200">
                  <span
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ background: entry.color }}
                    aria-hidden
                  />
                  {entry.name}
                </span>
                <span className="font-mono text-[0.8125rem] tabular-nums text-ink-100">
                  {formatNumber(entry.value)}
                  <span className="ml-2 text-xs text-ink-500">
                    {Math.round((entry.value / funnel.total) * 100)} %
                  </span>
                </span>
              </li>
            ))}
            {funnel.cancelados > 0 && (
              <li className="flex items-center justify-between gap-4 py-2">
                <span className="flex items-center gap-2 text-[0.8125rem] text-ink-400">
                  <span
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ background: COLOR.cancelado }}
                    aria-hidden
                  />
                  Cancelados
                </span>
                <span className="font-mono text-[0.8125rem] tabular-nums text-ink-400">
                  {formatNumber(funnel.cancelados)}
                </span>
              </li>
            )}
          </ul>
        </div>
      ) : (
        <EmptyState
          label="Sin movimiento"
          icon={ChartNoAxesColumn}
          className="py-12"
          note="Despacha una campaña para ver aquí el avance de la entrega: enviados, recibidos, en tránsito y errores."
        />
      )}
    </div>
  )
}

const TREND_SERIES = [
  { key: "enviados", name: "Enviados", color: COLOR.proceso },
  { key: "recibidos", name: "Recibidos", color: COLOR.entregado },
  { key: "errores", name: "Errores", color: COLOR.fallido },
  { key: "respuestas", name: "Respuestas", color: COLOR.cancelado },
] as const

export function TendenciaOperacion({ points }: { points: OperacionPoint[] }) {
  const tieneDatos = points.some((p) => p.enviados > 0 || p.recibidos > 0 || p.errores > 0 || p.respuestas > 0)

  if (!tieneDatos) {
    return (
      <EmptyState
        label="Sin actividad"
        icon={Activity}
        className="py-12"
        note="La actividad diaria aparece cuando una campaña ha sido despachada desde la Cola."
      />
    )
  }

  return (
    <>
      <div
        className="trend-legend flex flex-wrap items-center gap-x-4 gap-y-1 pb-3"
        aria-hidden="true"
      >
        {TREND_SERIES.map((serie) => (
          <span key={serie.key} className="flex items-center gap-2 text-[0.8125rem] text-ink-400">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ background: serie.color }}
            />
            {serie.name}
          </span>
        ))}
      </div>
      <div
        className="h-64 w-full overflow-x-auto"
        role="img"
        aria-label="Actividad diaria de envíos, recibidos, errores y respuestas."
      >
      <div className="h-full min-w-[36rem]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-rule-soft)" vertical={false} />
            <XAxis
              dataKey="dia"
              tick={{ fill: "var(--color-ink-400)", fontSize: 12 }}
              axisLine={{ stroke: "var(--color-rule)" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--color-ink-400)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ fill: "var(--color-base-800)" }}
              contentStyle={{
                background: "var(--color-base-850)",
                border: "1px solid var(--color-rule)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-ink-400)", fontWeight: 600 }}
              formatter={(value, name) => [formatNumber(Number(value)), name]}
            />
            {TREND_SERIES.map((serie) => (
              <Bar
                key={serie.key}
                dataKey={serie.key}
                name={serie.name}
                fill={serie.color}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      </div>
    </>
  )
}

export function ProgressRing({
  pct,
  size = 104,
  strokeWidth = 9,
}: {
  pct: number
  size?: number
  strokeWidth?: number
}) {
  const clamped = Math.max(0, Math.min(100, pct))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${clamped} % de avance de la campaña activa`}
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-rule)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={COLOR.proceso}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 400ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dy="-0.2em"
        textAnchor="middle"
        fill="var(--color-ink-100)"
        fontSize={size * 0.2}
        fontWeight={700}
        fontFamily="var(--font-sans)"
      >
        {clamped} %
      </text>
      <text
        x="50%"
        y="50%"
        dy="1.4em"
        textAnchor="middle"
        fill={clamped >= 100 ? "var(--color-ink-100)" : "var(--color-ink-400)"}
        fontSize={size * 0.12}
        fontWeight={700}
        letterSpacing="0.12em"
        fontFamily="var(--font-sans)"
      >
        {clamped >= 100 ? "SELLADA" : "SELLANDO"}
      </text>
    </svg>
  )
}