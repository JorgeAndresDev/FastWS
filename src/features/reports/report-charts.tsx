import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { formatNumber } from "@/lib/utils"

import type { DayPoint } from "./report-records"

const BAR_COLORS = {
  enviados: "var(--color-fill-entregado)",
  fallidos: "var(--color-fill-fallido)",
  respuestas: "var(--color-fill-cancelado)",
}

const LABELS: Record<keyof Pick<DayPoint, "enviados" | "fallidos" | "respuestas">, string> = {
  enviados: "Envíos",
  fallidos: "Fallidos",
  respuestas: "Respuestas",
}

const SERIES = ["enviados", "fallidos", "respuestas"] as const

export function TendenciaChart({ points }: { points: DayPoint[] }) {
  if (points.length === 0) return null
  return (
    <div className="h-64 w-full overflow-x-auto">
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
            {SERIES.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                name={LABELS[key]}
                fill={BAR_COLORS[key]}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}