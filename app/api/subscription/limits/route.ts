import { NextRequest, NextResponse } from "next/server";
import { checkCanAddPatient, checkCanUseAI, hasWhatsAppFeature } from "@/lib/subscriptions/utils";

/**
 * GET /api/subscription/limits
 * Query params: professionalId
 */
export async function GET(request: NextRequest) {
    try {
        const professionalId = request.nextUrl.searchParams.get("professionalId");

        if (!professionalId) {
            return NextResponse.json(
                { error: "professionalId é obrigatório" },
                { status: 400 }
            );
        }

        // Check patient limits
        const patientLimits = await checkCanAddPatient(professionalId);

        // Check AI limits
        const aiLimits = await checkCanUseAI(professionalId);

        // Check WhatsApp feature
        const hasWhatsApp = await hasWhatsAppFeature(professionalId);

        return NextResponse.json({
            patient: patientLimits,
            ai: aiLimits,
            whatsapp: hasWhatsApp,
        });
    } catch (error: any) {
        console.error("Error getting subscription limits:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao obter limites" },
            { status: 500 }
        );
    }
}

