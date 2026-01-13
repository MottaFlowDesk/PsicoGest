import { createNotificationFromTemplate } from "./templates";
import { getSystemNotificationTemplate } from "./templates";

/**
 * Create notification when subscription is expiring soon
 */
export async function notifySubscriptionExpiring(
  professionalId: string,
  data: {
    subscriptionPlan: string;
    daysUntilExpiry: number;
  }
): Promise<void> {
  const template = getSystemNotificationTemplate("subscription_expiring", data);
  await createNotificationFromTemplate(
    professionalId,
    "system",
    template,
    {
      subscriptionPlan: data.subscriptionPlan,
      daysUntilExpiry: data.daysUntilExpiry,
    }
  );
}

/**
 * Create notification when subscription is cancelled
 */
export async function notifySubscriptionCancelled(
  professionalId: string,
  data: {
    subscriptionPlan: string;
  }
): Promise<void> {
  const template = getSystemNotificationTemplate("subscription_cancelled", data);
  await createNotificationFromTemplate(
    professionalId,
    "system",
    template,
    {
      subscriptionPlan: data.subscriptionPlan,
    }
  );
}

/**
 * Create notification when integration is disconnected
 */
export async function notifyIntegrationDisconnected(
  professionalId: string,
  data: {
    integrationType: "google" | "whatsapp";
  }
): Promise<void> {
  const template = getSystemNotificationTemplate("integration_disconnected", data);
  await createNotificationFromTemplate(
    professionalId,
    "system",
    template,
    {
      integrationType: data.integrationType,
    }
  );
}

/**
 * Create notification when subscription limit is reached
 */
export async function notifyLimitReached(
  professionalId: string,
  data: {
    limitType: string;
    currentValue: number;
    maxValue: number;
  }
): Promise<void> {
  const template = getSystemNotificationTemplate("limit_reached", data);
  await createNotificationFromTemplate(
    professionalId,
    "system",
    template,
    {
      limitType: data.limitType,
      currentValue: data.currentValue,
      maxValue: data.maxValue,
    }
  );
}

