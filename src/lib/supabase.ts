import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  // Erro claro em vez de falha silenciosa: falta configurar o arquivo .env
  throw new Error(
    'Faltam as variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY. Copie o arquivo .env.example para .env e preencha os valores do Supabase.',
  )
}

export const supabase = createClient(url, anonKey)
