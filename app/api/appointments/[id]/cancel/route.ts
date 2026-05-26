import { NextResponse } from "next/server";
import { cancelAppointment } from "@/app/dashboard/appointments/actions";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        await cancelAppointment(id, body.reason);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("cancel appointment:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Erro ao cancelar agendamento",
            },
            { status: 400 }
        );
    }
}
