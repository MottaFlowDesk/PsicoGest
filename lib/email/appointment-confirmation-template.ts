export interface AppointmentConfirmationEmailData {
    patientName: string;
    professionalName: string;
    date: string;
    time: string;
    endTime?: string;
    type: "in_person" | "telehealth";
    confirmationLink: string;
}

/**
 * Template HTML para e-mail de confirmação de agendamento com link único.
 */
export function generateAppointmentConfirmationEmailHtml(
    data: AppointmentConfirmationEmailData
): string {
    const typeLabel =
        data.type === "telehealth"
            ? "Consulta online"
            : "Consulta presencial";
    const typeIcon = data.type === "telehealth" ? "💻" : "📍";
    const timeRange = data.endTime ? `${data.time} às ${data.endTime}` : data.time;

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme seu agendamento</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb 0%,#7c3aed 100%);padding:32px 24px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.85);letter-spacing:0.05em;text-transform:uppercase;">PsicoGest</p>
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
                Confirme seu agendamento
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">
              <p style="margin:0 0 16px;font-size:16px;color:#334155;line-height:1.6;">
                Olá, <strong style="color:#0f172a;">${escapeHtml(data.patientName)}</strong>!
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
                <strong>${escapeHtml(data.professionalName)}</strong> agendou uma sessão com você.
                Para garantir sua vaga, confirme sua presença clicando no botão abaixo:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 12px;font-size:14px;color:#64748b;">📅 <strong style="color:#0f172a;">${escapeHtml(data.date)}</strong></p>
                    <p style="margin:0 0 12px;font-size:14px;color:#64748b;">🕐 <strong style="color:#0f172a;">${escapeHtml(timeRange)}</strong></p>
                    <p style="margin:0;font-size:14px;color:#64748b;">${typeIcon} <strong style="color:#0f172a;">${typeLabel}</strong></p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <a href="${data.confirmationLink}"
                       style="display:inline-block;background:linear-gradient(135deg,#2563eb 0%,#7c3aed 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:16px 36px;border-radius:10px;box-shadow:0 4px 14px rgba(37,99,235,0.35);">
                      ✓ Confirmar presença
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;font-size:13px;color:#64748b;line-height:1.5;text-align:center;">
                Se o botão não funcionar, copie e cole este link no navegador:
              </p>
              <p style="margin:0 0 24px;font-size:12px;color:#2563eb;word-break:break-all;text-align:center;line-height:1.5;">
                <a href="${data.confirmationLink}" style="color:#2563eb;">${data.confirmationLink}</a>
              </p>
              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;text-align:center;">
                Precisa reagendar? Entre em contato diretamente com seu profissional.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Mensagem automática enviada por <strong>PsicoGest</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

export function generateAppointmentConfirmationEmailSubject(
    date: string,
    time: string
): string {
    return `Confirme seu agendamento — ${date} às ${time}`;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
