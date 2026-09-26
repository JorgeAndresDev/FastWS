import type { ConvoStatus } from "@/types"

import { Clock3, Reply, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

export const convoTone: Record<ConvoStatus, string> = {
  respondida: "stamp--entregado",
  pendiente: "stamp--fecha",
  con_error: "stamp--fallido",
}

export const convoLabel: Record<ConvoStatus, string> = {
  respondida: "Respondida",
  pendiente: "Pendiente",
  con_error: "Con error",
}

const convoIcon: Record<ConvoStatus, typeof Reply> = {
  respondida: Reply,
  pendiente: Clock3,
  con_error: TriangleAlert,
}

export function ConvoChip({ status }: { status: ConvoStatus }) {
  const Icon = convoIcon[status]
  return (
    <span className={cn("stamp", convoTone[status])}>
      <Icon aria-hidden />
      {convoLabel[status]}
    </span>
  )
}