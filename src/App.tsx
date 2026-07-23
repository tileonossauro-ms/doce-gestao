import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/components/AppLayout'
import Login from '@/pages/Login'
import Receitas from '@/pages/Receitas'
import Ingredientes from '@/pages/Ingredientes'
import Clientes from '@/pages/Clientes'
import Pedidos from '@/pages/Pedidos'
import Financeiro from '@/pages/Financeiro'
import Configuracoes from '@/pages/Configuracoes'
import Painel from '@/pages/Painel'
import FormasPagamento from '@/pages/FormasPagamento'
import Categorias from '@/pages/Categorias'
import Relatorios from '@/pages/Relatorios'
import CustosFixos from '@/pages/CustosFixos'
import SecaoEmBreve from '@/components/SecaoEmBreve'
import { Toaster } from '@/components/ui/sonner'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/painel" element={<Painel />} />
              <Route path="/ingredientes" element={<Ingredientes />} />
              <Route path="/receitas" element={<Receitas />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/formas-pagamento" element={<FormasPagamento />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/agenda" element={<SecaoEmBreve titulo="Agenda" nota="Chega na Fase 11." />} />
              <Route path="/fornecedores" element={<SecaoEmBreve titulo="Fornecedores" nota="Chega na Fase 12." />} />
              <Route path="/marcas" element={<SecaoEmBreve titulo="Marcas" nota="Chega na Fase 12." />} />
              <Route path="/custos-fixos" element={<CustosFixos />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
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
