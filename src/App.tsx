import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/components/AppLayout'
import SecaoEmBreve from '@/components/SecaoEmBreve'
import Login from '@/pages/Login'
import { Toaster } from '@/components/ui/sonner'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/painel" element={<SecaoEmBreve titulo="Painel" />} />
              <Route path="/ingredientes" element={<SecaoEmBreve titulo="Ingredientes" />} />
              <Route path="/receitas" element={<SecaoEmBreve titulo="Receitas" />} />
              <Route path="/clientes" element={<SecaoEmBreve titulo="Clientes" />} />
              <Route path="/pedidos" element={<SecaoEmBreve titulo="Pedidos" />} />
              <Route path="/financeiro" element={<SecaoEmBreve titulo="Financeiro" />} />
              <Route path="/configuracoes" element={<SecaoEmBreve titulo="Configurações" />} />
              <Route index element={<Navigate to="/painel" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/painel" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" />
    </AuthProvider>
  )
}

export default App
