import { lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sileo"

import { AppLayout } from "@/app/layout"
import { Loader2 } from "lucide-react"
import { AuthProvider, LoginPage, RecoverPage, RequireAuth } from "@/features/auth"
import { CampaignsProvider } from "@/features/campaigns/campaigns-store"
import { ClientsProvider } from "@/features/clients/clients-store"
import { ConexionProvider } from "@/features/connection/conexion-store"
import { ConversationsProvider } from "@/features/conversations/conversations-store"
import { ThemeProvider, useTheme } from "@/lib/theme"

const AuditPage = lazy(() => import("@/features/admin").then((m) => ({ default: m.AuditPage })))
const DevicesPage = lazy(() => import("@/features/admin").then((m) => ({ default: m.DevicesPage })))
const CampaignsPage = lazy(() => import("@/features/campaigns").then((m) => ({ default: m.CampaignsPage })))
const ClientsPage = lazy(() => import("@/features/clients").then((m) => ({ default: m.ClientsPage })))
const ConnectionPage = lazy(() => import("@/features/connection").then((m) => ({ default: m.ConnectionPage })))
const ConversationsPage = lazy(() => import("@/features/conversations").then((m) => ({ default: m.ConversationsPage })))
const DashboardPage = lazy(() => import("@/features/dashboard").then((m) => ({ default: m.DashboardPage })))
const HistoryPage = lazy(() => import("@/features/history").then((m) => ({ default: m.HistoryPage })))
const ImportPage = lazy(() => import("@/features/import").then((m) => ({ default: m.ImportPage })))
const MessagesPage = lazy(() => import("@/features/messages").then((m) => ({ default: m.MessagesPage })))
const QueuePage = lazy(() => import("@/features/queue").then((m) => ({ default: m.QueuePage })))
const ReportsPage = lazy(() => import("@/features/reports").then((m) => ({ default: m.ReportsPage })))
const SegmentsPage = lazy(() => import("@/features/segments").then((m) => ({ default: m.SegmentsPage })))
const SettingsPage = lazy(() => import("@/features/settings").then((m) => ({ default: m.SettingsPage })))
const SyncPage = lazy(() => import("@/features/sync").then((m) => ({ default: m.SyncPage })))
const TemplatesPage = lazy(() => import("@/features/templates").then((m) => ({ default: m.TemplatesPage })))

const pageLoader = (
  <div className="flex min-h-40 items-center justify-center p-8" role="status">
    <Loader2 className="size-5 animate-spin text-ink-400" aria-hidden />
  </div>
)

/**
 * Los avisos siguen el modo de la app, no el del sistema. `sileo` ofrece
 * "system", pero la app ya tiene preferencia propia y guardada: si el operador
 * eligió claro con Windows en oscuro, un toast oscuro seria el aviso
 * "invertido" que nosodymandaron arreglar.
 */
function ThemedToaster() {
  const { mode } = useTheme()
  return <Toaster position="bottom-right" theme={mode === "claro" ? "light" : "dark"} />
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ClientsProvider>
            <ConexionProvider>
              <CampaignsProvider>
                <ConversationsProvider>
                  <Suspense fallback={pageLoader}>
                  <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar" element={<RecoverPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="/app" element={<DashboardPage />} />
              <Route path="/app/campanas" element={<CampaignsPage />} />
              <Route path="/app/cola" element={<QueuePage />} />
              <Route path="/app/mensajes" element={<MessagesPage />} />
              <Route path="/app/clientes" element={<ClientsPage />} />
              <Route path="/app/importacion" element={<ImportPage />} />
              <Route path="/app/segmentos" element={<SegmentsPage />} />
              <Route path="/app/plantillas" element={<TemplatesPage />} />
              <Route path="/app/conversaciones" element={<ConversationsPage />} />
              <Route path="/app/historial" element={<HistoryPage />} />
              <Route path="/app/reportes" element={<ReportsPage />} />
              <Route path="/app/configuracion" element={<SettingsPage />} />
              <Route path="/app/usuarios-dispositivos" element={<DevicesPage />} />
              <Route path="/app/auditoria" element={<AuditPage />} />
              <Route path="/app/sincronizacion" element={<SyncPage />} />
              <Route path="/app/conexion" element={<ConnectionPage />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Route>
          </Route>
        </Routes>
                  </Suspense>
                </ConversationsProvider>
              </CampaignsProvider>
            </ConexionProvider>
          </ClientsProvider>
          <ThemedToaster />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
