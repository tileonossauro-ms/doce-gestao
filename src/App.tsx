import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/components/AppLayout'
import SecaoEmBreve from '@/components/SecaoEmBreve'
import Login from '@/pages/Login'
import Receitas from '@/pages/Receitas'
import Ingredientes from '@/pages/Ingredientes'
import Clientes from '@/pages/Clientes'
import Pedidos from '@/pages/Pedidos'
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
              <Route path="/ingredientes" element={<Ingredientes />} />
              <Route path="/receitas" element={<Receitas />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/pedidos" element={<Pedidos />} />
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
