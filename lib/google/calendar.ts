import { google, calendar_v3 } from "googleapis";
import { getAuthenticatedClient } from "./auth";

export async function createCalendarEvent(
    refreshToken: string,
    event: {
        summary: string;
        description?: string;
        startTime: Date;
        endTime: Date;
        attendeeEmail?: string;
        location?: string;
        createMeet?: boolean;
    }
): Promise<{ eventId: string; meetLink?: string }> {
    const auth = getAuthenticatedClient(refreshToken);
    const calendar = google.calendar({ version: "v3", auth });

    const eventData: calendar_v3.Schema$Event = {
        summary: event.summary,
        description: event.description,
        start: {
            dateTime: event.startTime.toISOString(),
            timeZone: "America/Sao_Paulo",
        },
        end: {
            dateTime: event.endTime.toISOString(),
            timeZone: "America/Sao_Paulo",
        },
        location: event.location,
    };

    // Add attendee if provided
    if (event.attendeeEmail) {
        eventData.attendees = [{ email: event.attendeeEmail }];
    }

    // Add Google Meet if requested
    if (event.createMeet) {
        eventData.conferenceData = {
            createRequest: {
                requestId: `psicogest-${Date.now()}`,
                conferenceSolutionKey: { type: "hangoutsMeet" },
            },
        };
    }

    const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: eventData,
        conferenceDataVersion: event.createMeet ? 1 : 0,
        sendUpdates: event.attendeeEmail ? "all" : "none",
    });

    const meetLinkEntry = response.data.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === "video"
    );
    
    return {
        eventId: response.data.id || "",
        meetLink: meetLinkEntry?.uri || undefined,
    };
}

export async function updateCalendarEvent(
    refreshToken: string,
    eventId: string,
    updates: {
        summary?: string;
        description?: string;
        startTime?: Date;
        endTime?: Date;
        location?: string;
    }
): Promise<void> {
    const auth = getAuthenticatedClient(refreshToken);
    const calendar = google.calendar({ version: "v3", auth });

    const eventData: calendar_v3.Schema$Event = {};

    if (updates.summary) eventData.summary = updates.summary;
    if (updates.description) eventData.description = updates.description;
    if (updates.location) eventData.location = updates.location;
    if (updates.startTime) {
        eventData.start = {
            dateTime: updates.startTime.toISOString(),
            timeZone: "America/Sao_Paulo",
        };
    }
    if (updates.endTime) {
        eventData.end = {
            dateTime: updates.endTime.toISOString(),
            timeZone: "America/Sao_Paulo",
        };
    }

    await calendar.events.patch({
        calendarId: "primary",
        eventId,
        requestBody: eventData,
    });
}

export async function deleteCalendarEvent(
    refreshToken: string,
    eventId: string
): Promise<void> {
    const auth = getAuthenticatedClient(refreshToken);
    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.delete({
        calendarId: "primary",
        eventId,
    });
}

export async function checkAvailability(
    refreshToken: string,
    startTime: Date,
    endTime: Date
): Promise<boolean> {
    const auth = getAuthenticatedClient(refreshToken);
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.freebusy.query({
        requestBody: {
            timeMin: startTime.toISOString(),
            timeMax: endTime.toISOString(),
            items: [{ id: "primary" }],
        },
    });

    const busy = response.data.calendars?.primary?.busy || [];
    return busy.length === 0;
}

export async function getUpcomingEvents(
    refreshToken: string,
    maxResults: number = 10
): Promise<calendar_v3.Schema$Event[]> {
    const auth = getAuthenticatedClient(refreshToken);
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: "startTime",
    });

    return response.data.items || [];
}

