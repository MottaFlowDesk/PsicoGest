import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Normaliza telefone para o CHECK do banco: ^\+?[1-9]\d{10,14}$
 */
export function normalizePhoneForDb(phone: string): string {
    let digits = phone.replace(/\D/g, "");

    // Remove zeros à esquerda (ex.: 011 → 11)
    while (digits.startsWith("0")) {
        digits = digits.slice(1);
    }

    // Brasil sem código do país (10 ou 11 dígitos)
    if (digits.length === 10 || digits.length === 11) {
        digits = `55${digits}`;
    }

    return digits;
}

/**
 * CPF apenas dígitos (11) ou null se vazio
 */
export function normalizeCpfForDb(cpf?: string | null): string | null {
    if (!cpf) return null;
    const digits = cpf.replace(/\D/g, "");
    return digits.length > 0 ? digits : null;
}

export function getPatientDbErrorMessage(error: PostgrestError | Error | unknown): string {
    const message =
        error && typeof error === "object" && "message" in error
            ? String((error as PostgrestError).message)
            : error instanceof Error
              ? error.message
              : "";

    if (message.includes("valid_phone")) {
        return "Telefone inválido. Use DDD + número (ex.: 11999998888).";
    }
    if (message.includes("valid_cpf")) {
        return "CPF inválido. Informe um CPF válido ou deixe em branco.";
    }
    if (message.includes("adult_patient")) {
        return "Data de nascimento inválida: o paciente precisa ter pelo menos 18 anos.";
    }
    if (message.includes("valid_email")) {
        return "E-mail inválido.";
    }
    if (message.includes("row-level security") || message.includes("RLS")) {
        return "Sem permissão para cadastrar paciente. Faça login novamente.";
    }

    return message || "Erro ao salvar paciente. Verifique os dados e tente novamente.";
}
