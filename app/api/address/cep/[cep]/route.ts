import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { digitsOnly } from "@/lib/brazil/cpf";
import { CepNotFoundError, lookupAddressByCep } from "@/lib/address/correios";

export async function GET(
    _request: Request,
    context: { params: Promise<{ cep: string }> }
) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { cep } = await context.params;
    const digits = digitsOnly(cep);

    if (digits.length !== 8) {
        return NextResponse.json(
            { error: "Informe um CEP com 8 dígitos." },
            { status: 400 }
        );
    }

    try {
        const address = await lookupAddressByCep(digits);
        return NextResponse.json(address);
    } catch (error) {
        if (error instanceof CepNotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        console.error("CEP lookup:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Não foi possível consultar o CEP.",
            },
            { status: 502 }
        );
    }
}
