import * as React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import { useAuth } from "@/lib/hooks/use-auth"
import { AppShell } from "@/components/layout/app-shell"
import { LoginPage } from "@/components/auth/login-page"
import { UnauthorizedPage } from "@/components/auth/unauthorized-page"
import { LoadingScreen } from "@/components/layout/loading-screen"

import { OverviewPage } from "@/pages/overview-page"
import { BookingsPage } from "@/pages/bookings-page"
import { ClientsPage } from "@/pages/clients-page"
import { ServicesPage } from "@/pages/services-page"
import { PricingPage } from "@/pages/pricing-page"
import { ProvidersPage } from "@/pages/providers-page"
import { PaymentsPage } from "@/pages/payments-page"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status, isAdmin } = useAuth()

  if (status === "loading") {
    return <LoadingScreen />
  }

  if (status === "signedOut") {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <UnauthorizedPage />
  }

  return <>{children}</>
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<OverviewPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App