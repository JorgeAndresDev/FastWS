import type { ConversationThread } from "@/types"

export interface ConversationCounts {
  total: number
  respondidas: number
  pendientes: number
  conError: number
  demo: number
}

export function conversationCounts(threads: ConversationThread[]): ConversationCounts {
  let respondidas = 0
  let pendientes = 0
  let conError = 0
  let demo = 0
  for (const thread of threads) {
    if (thread.status === "respondida") respondidas += 1
    else if (thread.status === "con_error") conError += 1
    else pendientes += 1
    if (thread.origin === "demo") demo += 1
  }
  return { total: threads.length, respondidas, pendientes, conError, demo }
}