import { createNotificationFromTemplate } from "./templates";
import { getAppointmentNotificationTemplate } from "./templates";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Create notification when appointment is created
 */
export async function notifyAppointmentCreated(
  professionalId: string,
  data: {
    patientName: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId: string;
  }
): Promise<void> {
  const template = getAppointmentNotificationTemplate("created", data);
  await createNotificationFromTemplate(
    professionalId,
    "appointment",
    template,
    {
      appointmentId: data.appointmentId,
      patientName: data.patientName,
      appointmentDate: data.appointmentDate,
    }
  );
}

/**
 * Create notification when appointment is confirmed
 */
export async function notifyAppointmentConfirmed(
  professionalId: string,
  data: {
    patientName: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId: string;
  }
): Promise<void> {
  const template = getAppointmentNotificationTemplate("confirmed", data);
  await createNotificationFromTemplate(
    professionalId,
    "appointment",
    template,
    {
      appointmentId: data.appointmentId,
      patientName: data.patientName,
      appointmentDate: data.appointmentDate,
    }
  );
}

/**
 * Create notification when appointment is cancelled
 */
export async function notifyAppointmentCancelled(
  professionalId: string,
  data: {
    patientName: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId: string;
  }
): Promise<void> {
  const template = getAppointmentNotificationTemplate("cancelled", data);
  await createNotificationFromTemplate(
    professionalId,
    "appointment",
    template,
    {
      appointmentId: data.appointmentId,
      patientName: data.patientName,
      appointmentDate: data.appointmentDate,
    }
  );
}

/**
 * Create notification when patient doesn't show up
 */
export async function notifyAppointmentNoShow(
  professionalId: string,
  data: {
    patientName: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId: string;
  }
): Promise<void> {
  const template = getAppointmentNotificationTemplate("no_show", data);
  await createNotificationFromTemplate(
    professionalId,
    "appointment",
    template,
    {
      appointmentId: data.appointmentId,
      patientName: data.patientName,
      appointmentDate: data.appointmentDate,
    }
  );
}

/**
 * Create notification when appointment is upcoming (2h before)
 */
export async function notifyAppointmentUpcoming(
  professionalId: string,
  data: {
    patientName: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId: string;
  }
): Promise<void> {
  const template = getAppointmentNotificationTemplate("upcoming", data);
  await createNotificationFromTemplate(
    professionalId,
    "appointment",
    template,
    {
      appointmentId: data.appointmentId,
      patientName: data.patientName,
      appointmentDate: data.appointmentDate,
    }
  );
}

