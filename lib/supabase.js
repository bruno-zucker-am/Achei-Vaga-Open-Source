import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Lê as variáveis de ambiente definidas no .env
const urlSupabase = process.env.EXPO_PUBLIC_SUPABASE_URL;
const chaveAnonSupabase = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Cria e exporta o cliente Supabase com configurações de autenticação
// No ambiente mobile, usa AsyncStorage para persistir a sessão entre aberturas do app
export const supabase = createClient(urlSupabase, chaveAnonSupabase, {
  auth: {
    ...(Platform.OS !== 'web' ? {
      storage: AsyncStorage,
      lockAcquireTimeout: 20000
    } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Gerencia o auto-refresh da sessão conforme o estado do app (ativo/background)
// Só é executado em dispositivos móveis (não web)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
