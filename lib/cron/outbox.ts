import { processOutbox, type ProcessOutboxResult } from "@/lib/messaging/outbox";

export type OutboxJobResult = ProcessOutboxResult & {
    ok: boolean;
};

export async function runOutbox(options?: { batchSize?: number }): Promise<OutboxJobResult> {
    const result = await processOutbox({ batchSize: options?.batchSize });
    return { ok: true, ...result };
}
