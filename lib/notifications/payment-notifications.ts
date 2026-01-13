import { createNotificationFromTemplate } from "./templates";
import { getPaymentNotificationTemplate } from "./templates";

/**
 * Create notification when invoice is paid
 */
export async function notifyPaymentReceived(
  professionalId: string,
  data: {
    invoiceNumber: string;
    amount: number;
    invoiceId: string;
  }
): Promise<void> {
  const template = getPaymentNotificationTemplate("paid", data);
  await createNotificationFromTemplate(
    professionalId,
    "payment",
    template,
    {
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount,
    }
  );
}

/**
 * Create notification when invoice is due soon (3 days before)
 */
export async function notifyInvoiceDueSoon(
  professionalId: string,
  data: {
    invoiceNumber: string;
    amount: number;
    dueDate: string;
    invoiceId: string;
  }
): Promise<void> {
  const template = getPaymentNotificationTemplate("due_soon", data);
  await createNotificationFromTemplate(
    professionalId,
    "payment",
    template,
    {
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount,
      dueDate: data.dueDate,
    }
  );
}

/**
 * Create notification when invoice is overdue
 */
export async function notifyInvoiceOverdue(
  professionalId: string,
  data: {
    invoiceNumber: string;
    amount: number;
    dueDate: string;
    invoiceId: string;
  }
): Promise<void> {
  const template = getPaymentNotificationTemplate("overdue", data);
  await createNotificationFromTemplate(
    professionalId,
    "payment",
    template,
    {
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount,
      dueDate: data.dueDate,
    }
  );
}

/**
 * Create notification when payment fails
 */
export async function notifyPaymentFailed(
  professionalId: string,
  data: {
    invoiceNumber: string;
    amount: number;
    invoiceId: string;
  }
): Promise<void> {
  const template = getPaymentNotificationTemplate("failed", data);
  await createNotificationFromTemplate(
    professionalId,
    "payment",
    template,
    {
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount,
    }
  );
}

