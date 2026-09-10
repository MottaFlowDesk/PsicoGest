import { digitsOnly } from "@/lib/brazil/cpf";

export function formatCep(value: string): string {
    const digits = digitsOnly(value).slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function isValidCep(value: string): boolean {
    return digitsOnly(value).length === 8;
}

export type CepAddress = {
    cep: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
    complement?: string;
    source: "correios" | "brasilapi";
};

export async function lookupCep(cep: string): Promise<CepAddress> {
    const digits = digitsOnly(cep);
    const response = await fetch(`/api/address/cep/${digits}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            typeof data.error === "string" ? data.error : "Não foi possível consultar o CEP."
        );
    }

    return data as CepAddress;
}
