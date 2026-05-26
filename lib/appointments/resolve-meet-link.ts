/** Linha do banco com link de Meet (coluna pode ser meet_link ou meeting_link). */
export type MeetLinkSource = {
    meet_link?: unknown;
    meeting_link?: unknown;
};

/** Lê link de teleconsulta independente do nome da coluna no banco (meet_link ou meeting_link). */
export function resolveMeetLink(row: MeetLinkSource): string | null {    const link = row.meet_link ?? row.meeting_link;
    return typeof link === "string" && link.length > 0 ? link : null;
}
