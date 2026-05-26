import { NextResponse } from "next/server";
import { startAppointmentSession } from "@/app/dashboard/appointments/start-session-actions";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const result = await startAppointmentSession(id);
        return NextResponse.json(result);
    } catch (error) {
        console.error("start-session:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Erro ao iniciar sessão",
            },
            { status: 400 }
        );
    }
}
