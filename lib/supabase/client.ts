import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Check if variables are missing or empty
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.trim() === '' || supabaseAnonKey.trim() === '') {
        const missingVars = [];
        if (!supabaseUrl || supabaseUrl.trim() === '') missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
        if (!supabaseAnonKey || supabaseAnonKey.trim() === '') missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
        
        throw new Error(
            `Configuração do Supabase incompleta. ` +
            `As seguintes variáveis de ambiente estão faltando ou vazias: ${missingVars.join(', ')}. ` +
            `Por favor, configure essas variáveis no Vercel ou no arquivo .env.local. ` +
            `Mais informações: https://supabase.com/dashboard/project/_/settings/api`
        );
    }

    try {
        return createBrowserClient(supabaseUrl, supabaseAnonKey);
    } catch (error: any) {
        throw new Error(
            `Erro ao criar cliente Supabase: ${error.message}. ` +
            `Verifique se as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão configuradas corretamente.`
        );
    }
}
