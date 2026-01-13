import { NotificationType } from "./notification-service";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface NotificationTemplate {
  title: string;
  message: string;
  actionUrl?: string;
}

/**
 * Appointment notification templates
 */
export function getAppointmentNotificationTemplate(
  event: "created" | "confirmed" | "cancelled" | "no_show" | "upcoming",
  data: {
    patientName: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId: string;
  }
): NotificationTemplate {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const actionUrl = `${baseUrl}/dashboard/appointments/${data.appointmentId}`;

  switch (event) {
    case "created":
      return {
        title: "Novo Agendamento",
        message: `Novo agendamento criado com ${data.patientName} para ${format(new Date(data.appointmentDate), "EEEE, d 'de' MMMM", { locale: ptBR })} às ${data.appointmentTime}.`,
        actionUrl,
      };

    case "confirmed":
      return {
        title: "Agendamento Confirmado",
        message: `${data.patientName} confirmou o agendamento para ${format(new Date(data.appointmentDate), "EEEE, d 'de' MMMM", { locale: ptBR })} às ${data.appointmentTime}.`,
        actionUrl,
      };

    case "cancelled":
      return {
        title: "Agendamento Cancelado",
        message: `O agendamento com ${data.patientName} para ${format(new Date(data.appointmentDate), "EEEE, d 'de' MMMM", { locale: ptBR })} às ${data.appointmentTime} foi cancelado.`,
        actionUrl,
      };

    case "no_show":
      return {
        title: "Paciente Não Compareceu",
        message: `${data.patientName} não compareceu ao agendamento de ${format(new Date(data.appointmentDate), "EEEE, d 'de' MMMM", { locale: ptBR })} às ${data.appointmentTime}.`,
        actionUrl,
      };

    case "upcoming":
      return {
        title: "Agendamento Próximo",
        message: `Você tem um agendamento com ${data.patientName} em breve: ${format(new Date(data.appointmentDate), "EEEE, d 'de' MMMM", { locale: ptBR })} às ${data.appointmentTime}.`,
        actionUrl,
      };

    default:
      return {
        title: "Agendamento",
        message: `Atualização no agendamento com ${data.patientName}.`,
        actionUrl,
      };
  }
}

/**
 * Payment notification templates
 */
export function getPaymentNotificationTemplate(
  event: "paid" | "due_soon" | "overdue" | "failed",
  data: {
    invoiceNumber: string;
    amount: number;
    dueDate?: string;
    invoiceId: string;
  }
): NotificationTemplate {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const actionUrl = `${baseUrl}/dashboard/financial`;
  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(data.amount);

  switch (event) {
    case "paid":
      return {
        title: "Fatura Paga",
        message: `A fatura ${data.invoiceNumber} no valor de ${formattedAmount} foi paga.`,
        actionUrl,
      };

    case "due_soon":
      return {
        title: "Fatura Vencendo",
        message: `A fatura ${data.invoiceNumber} no valor de ${formattedAmount} vence em breve${data.dueDate ? ` (${format(new Date(data.dueDate), "dd/MM/yyyy", { locale: ptBR })})` : ""}.`,
        actionUrl,
      };

    case "overdue":
      return {
        title: "Fatura Vencida",
        message: `A fatura ${data.invoiceNumber} no valor de ${formattedAmount} está vencida${data.dueDate ? ` desde ${format(new Date(data.dueDate), "dd/MM/yyyy", { locale: ptBR })}` : ""}.`,
        actionUrl,
      };

    case "failed":
      return {
        title: "Pagamento Falhou",
        message: `O pagamento da fatura ${data.invoiceNumber} no valor de ${formattedAmount} falhou. Verifique os detalhes.`,
        actionUrl,
      };

    default:
      return {
        title: "Atualização de Pagamento",
        message: `Atualização na fatura ${data.invoiceNumber}.`,
        actionUrl,
      };
  }
}

/**
 * Patient notification templates
 */
export function getPatientNotificationTemplate(
  event: "created" | "updated",
  data: {
    patientName: string;
    patientId: string;
  }
): NotificationTemplate {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const actionUrl = `${baseUrl}/dashboard/patients/${data.patientId}`;

  switch (event) {
    case "created":
      return {
        title: "Novo Paciente Cadastrado",
        message: `${data.patientName} foi cadastrado(a) no sistema.`,
        actionUrl,
      };

    case "updated":
      return {
        title: "Paciente Atualizado",
        message: `Os dados de ${data.patientName} foram atualizados.`,
        actionUrl,
      };

    default:
      return {
        title: "Atualização de Paciente",
        message: `Atualização nos dados de ${data.patientName}.`,
        actionUrl,
      };
  }
}

/**
 * System notification templates
 */
export function getSystemNotificationTemplate(
  event: "subscription_expiring" | "subscription_cancelled" | "integration_disconnected" | "limit_reached",
  data: {
    subscriptionPlan?: string;
    daysUntilExpiry?: number;
    integrationType?: "google" | "whatsapp";
    limitType?: string;
    currentValue?: number;
    maxValue?: number;
  }
): NotificationTemplate {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  switch (event) {
    case "subscription_expiring":
      return {
        title: "Assinatura Expirando",
        message: `Sua assinatura ${data.subscriptionPlan || ""} expira em ${data.daysUntilExpiry} dia(s). Renove para continuar usando todos os recursos.`,
        actionUrl: `${baseUrl}/dashboard/settings/subscription`,
      };

    case "subscription_cancelled":
      return {
        title: "Assinatura Cancelada",
        message: `Sua assinatura ${data.subscriptionPlan || ""} foi cancelada. Você continuará com acesso até o fim do período pago.`,
        actionUrl: `${baseUrl}/dashboard/settings/subscription`,
      };

    case "integration_disconnected":
      const integrationName = data.integrationType === "google" ? "Google Calendar" : "WhatsApp";
      return {
        title: "Integração Desconectada",
        message: `Sua integração com ${integrationName} foi desconectada. Reconecte para continuar usando os recursos.`,
        actionUrl: `${baseUrl}/dashboard/settings`,
      };

    case "limit_reached":
      return {
        title: "Limite Atingido",
        message: `Você atingiu o limite de ${data.limitType || "recursos"} do seu plano (${data.currentValue}/${data.maxValue}). Considere fazer upgrade.`,
        actionUrl: `${baseUrl}/dashboard/settings/subscription`,
      };

    default:
      return {
        title: "Notificação do Sistema",
        message: "Você recebeu uma notificação do sistema.",
        actionUrl: `${baseUrl}/dashboard`,
      };
  }
}

/**
 * Subscription notification templates
 */
export function getSubscriptionNotificationTemplate(
  event: "created" | "updated" | "cancelled" | "expired",
  data: {
    planName: string;
    status?: string;
  }
): NotificationTemplate {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const actionUrl = `${baseUrl}/dashboard/settings/subscription`;

  switch (event) {
    case "created":
      return {
        title: "Assinatura Ativada",
        message: `Sua assinatura ${data.planName} foi ativada com sucesso! Bem-vindo ao plano ${data.planName}.`,
        actionUrl,
      };

    case "updated":
      return {
        title: "Assinatura Atualizada",
        message: `Sua assinatura foi atualizada para o plano ${data.planName}.`,
        actionUrl,
      };

    case "cancelled":
      return {
        title: "Assinatura Cancelada",
        message: `Sua assinatura ${data.planName} foi cancelada. Você continuará com acesso até o fim do período pago.`,
        actionUrl,
      };

    case "expired":
      return {
        title: "Assinatura Expirada",
        message: `Sua assinatura ${data.planName} expirou. Renove para continuar usando todos os recursos.`,
        actionUrl,
      };

    default:
      return {
        title: "Atualização de Assinatura",
        message: `Atualização na sua assinatura ${data.planName}.`,
        actionUrl,
      };
  }
}

/**
 * Helper function to create notification using templates
 */
export async function createNotificationFromTemplate(
  professionalId: string,
  type: NotificationType,
  template: NotificationTemplate,
  data?: Record<string, any>
): Promise<void> {
  const { createNotification } = await import("./notification-service");
  await createNotification({
    professionalId,
    type,
    title: template.title,
    message: template.message,
    actionUrl: template.actionUrl,
    data: data || {},
  });
}

