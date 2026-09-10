/**
 * Cliente da API Busca CEP dos Correios.
 * Manual: https://www.correios.com.br/atendimento/developers/manuais/manual-api-busca-cep
 *
 * Autenticação: Bearer token via POST /token/v1/autentica/contrato
 * (serviço 86738 no contrato comercial).
 */

import { digitsOnly } from "@/lib/brazil/cpf";
import type { CepAddress } from "@/lib/brazil/cep";

const DEFAULT_API_URL = "https://api.correios.com.br";

type CachedToken = {
    token: string;
    expiresAt: number;
};

let tokenCache: CachedToken | null = null;

function correiosConfigured(): boolean {
    return Boolean(
        process.env.CORREIOS_USER &&
            process.env.CORREIOS_ACCESS_CODE &&
            process.env.CORREIOS_CONTRACT_NUMBER
    );
}

function apiBase(): string {
    return (process.env.CORREIOS_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
}

async function fetchContratoToken(): Promise<string> {
    const user = process.env.CORREIOS_USER!;
    const accessCode = process.env.CORREIOS_ACCESS_CODE!;
    const contract = process.env.CORREIOS_CONTRACT_NUMBER!;
    const basic = Buffer.from(`${user}:${accessCode}`).toString("base64");

    const response = await fetch(`${apiBase()}/token/v1/autentica/contrato`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${basic}`,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ numero: contract }),
    });

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
            `Falha ao autenticar na API Token dos Correios (${response.status}). ${body}`.trim()
        );
    }

    const data = (await response.json()) as {
        token?: string;
        expiraEm?: string;
    };

    if (!data.token) {
        throw new Error("API Token dos Correios não retornou token.");
    }

    const expiresAt = data.expiraEm
        ? new Date(data.expiraEm).getTime()
        : Date.now() + 50 * 60 * 1000;

    tokenCache = { token: data.token, expiresAt };
    return data.token;
}

async function getToken(): Promise<string> {
    if (tokenCache && tokenCache.expiresAt - Date.now() > 60_000) {
        return tokenCache.token;
    }
    return fetchContratoToken();
}

type CorreiosEndereco = {
    cep?: string;
    uf?: string;
    localidade?: string;
    logradouro?: string;
    complemento?: string;
    bairro?: string;
};

function mapCorreiosAddress(data: CorreiosEndereco): CepAddress {
    return {
        cep: formatStoredCep(data.cep || ""),
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: (data.uf || "").toUpperCase(),
        complement: data.complemento || undefined,
        source: "correios",
    };
}

function formatStoredCep(cep: string): string {
    const digits = digitsOnly(cep);
    return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

async function lookupCorreios(cep: string): Promise<CepAddress> {
    const digits = digitsOnly(cep);
    const requestOnce = async (token: string) =>
        fetch(`${apiBase()}/cep/v2/enderecos/${digits}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });

    let token = await getToken();
    let response = await requestOnce(token);

    if (response.status === 401) {
        tokenCache = null;
        token = await fetchContratoToken();
        response = await requestOnce(token);
    }

    if (response.status === 404) {
        throw new CepNotFoundError();
    }

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
            `Erro na API Busca CEP dos Correios (${response.status}). ${body}`.trim()
        );
    }

    const data = (await response.json()) as CorreiosEndereco;
    return mapCorreiosAddress(data);
}

async function lookupBrasilApi(cep: string): Promise<CepAddress> {
    const digits = digitsOnly(cep);
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`);

    if (response.status === 404) {
        throw new CepNotFoundError();
    }

    if (!response.ok) {
        throw new Error("Serviço de CEP temporariamente indisponível.");
    }

    const data = (await response.json()) as {
        cep?: string;
        street?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
    };

    return {
        cep: formatStoredCep(data.cep || digits),
        street: data.street || "",
        neighborhood: data.neighborhood || "",
        city: data.city || "",
        state: (data.state || "").toUpperCase(),
        source: "brasilapi",
    };
}

export class CepNotFoundError extends Error {
    constructor() {
        super("CEP não encontrado.");
        this.name = "CepNotFoundError";
    }
}

export async function lookupAddressByCep(cep: string): Promise<CepAddress> {
    const digits = digitsOnly(cep);
    if (digits.length !== 8) {
        throw new Error("CEP deve ter 8 dígitos.");
    }

    if (correiosConfigured()) {
        return lookupCorreios(digits);
    }

    // Sem contrato/código CWS a API oficial recusa a chamada.
    // BrasilAPI consulta a mesma base de CEP para o autocomplete funcionar no beta.
    return lookupBrasilApi(digits);
}
