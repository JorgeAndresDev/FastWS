import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AppLayout } from "@/app/layout"
import { AuditPage } from "@/features/admin"
import { DevicesPage } from "@/features/admin"
import { AuthProvider, LoginPage, RecoverPage, RequireAuth } from "@/features/auth"
import { CampaignsPage } from "@/features/campaigns"
import { ClientsPage } from "@/features/clients"
import { ConnectionPage } from "@/features/connection"
import { ConversationsPage } from "@/features/conversations"
import { DashboardPage } from "@/features/dashboard"
import { HistoryPage } from "@/features/history"
import { ImportPage } from "@/features/import"
import { MessagesPage } from "@/features/messages"
import { QueuePage } from "@/features/queue"
import { ReportsPage } from "@/features/reports"
import { SegmentsPage } from "@/features/segments"
import { SettingsPage } from "@/features/settings"
import { SyncPage } from "@/features/sync"
import { TemplatesPage } from "@/features/templates"

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
