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
import Agenda from '@/pages/Agenda'
import Fornecedores from '@/pages/Fornecedores'
import Marcas from '@/pages/Marcas'
import Precificacao from '@/pages/Precificacao'
import { RotaPro, RotaAdmin } from '@/components/Pro'
import Admin from '@/pages/Admin'
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
              <Route path="/precificacao" element={<RotaPro recurso="Precificação em massa"><Precificacao /></RotaPro>} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/fornecedores" element={<RotaPro recurso="Fornecedores"><Fornecedores /></RotaPro>} />
              <Route path="/marcas" element={<RotaPro recurso="Marcas"><Marcas /></RotaPro>} />
              <Route path="/custos-fixos" element={<RotaPro recurso="Custos fixos"><CustosFixos /></RotaPro>} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/admin" element={<RotaAdmin><Admin /></RotaAdmin>} />
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
