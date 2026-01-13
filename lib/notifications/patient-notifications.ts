import { createNotificationFromTemplate } from "./templates";
import { getPatientNotificationTemplate } from "./templates";

/**
 * Create notification when new patient is created
 */
export async function notifyPatientCreated(
  professionalId: string,
  data: {
    patientName: string;
    patientId: string;
  }
): Promise<void> {
  const template = getPatientNotificationTemplate("created", data);
  await createNotificationFromTemplate(
    professionalId,
    "patient",
    template,
    {
      patientId: data.patientId,
      patientName: data.patientName,
    }
  );
}

/**
 * Create notification when patient is updated
 */
export async function notifyPatientUpdated(
  professionalId: string,
  data: {
    patientName: string;
    patientId: string;
  }
): Promise<void> {
  const template = getPatientNotificationTemplate("updated", data);
  await createNotificationFromTemplate(
    professionalId,
    "patient",
    template,
    {
      patientId: data.patientId,
      patientName: data.patientName,
    }
  );
}

