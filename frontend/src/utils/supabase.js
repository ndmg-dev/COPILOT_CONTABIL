import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERRO: Faltam variáveis de ambiente do Supabase no Frontend (.env). Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.")
  console.log("VITE_SUPABASE_URL:", supabaseUrl)
  console.log("VITE_SUPABASE_ANON_KEY:", supabaseAnonKey ? "PRESENT (length: " + supabaseAnonKey.length + ")" : "MISSING")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)