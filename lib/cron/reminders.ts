import { sendReminders, type SendRemindersResult } from "@/lib/notifications/reminder-service";

export type RemindersJobResult = {
    ok: boolean;
    results: {
        "24h": SendRemindersResult;
        "2h": SendRemindersResult;
    };
};

export async function runReminders(): Promise<RemindersJobResult> {
    const results24h = await sendReminders("24h");
    const results2h = await sendReminders("2h");

    return {
        ok: true,
        results: {
            "24h": results24h,
            "2h": results2h,
        },
    };
}
