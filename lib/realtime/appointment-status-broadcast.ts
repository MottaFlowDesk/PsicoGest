import { createAdminClient } from "@/lib/supabase/admin";

const channelName = (professionalId: string) =>
    `professional-appointments:${professionalId}`;

/** Notifica o calendário aberto do profissional em tempo real. */
export async function broadcastAppointmentStatus(
    professionalId: string,
    appointmentId: string,
    status: string
): Promise<void> {
    const supabase = createAdminClient();
    const channel = supabase.channel(channelName(professionalId), {
        config: { broadcast: { ack: false } },
    });

    try {
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("broadcast subscribe timeout"));
            }, 8000);

            channel.subscribe(async (subscriptionStatus) => {
                if (subscriptionStatus === "SUBSCRIBED") {
                    clearTimeout(timeout);
                    const sendResult = await channel.send({
                        type: "broadcast",
                        event: "status_changed",
                        payload: { appointmentId, status },
                    });

                    if (sendResult === "error") {
                        reject(new Error("broadcast send failed"));
                        return;
                    }
                    resolve();
                } else if (subscriptionStatus === "CHANNEL_ERROR") {
                    clearTimeout(timeout);
                    reject(new Error("broadcast channel error"));
                }
            });
        });
    } catch (error) {
        console.error("broadcastAppointmentStatus failed:", error);
    } finally {
        await supabase.removeChannel(channel);
    }
}

export function getAppointmentStatusChannelName(professionalId: string): string {
    return channelName(professionalId);
}
