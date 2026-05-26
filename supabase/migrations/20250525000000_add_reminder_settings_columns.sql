-- Colunas de lembretes automáticos (usadas pela API /api/settings/reminders)
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS reminder_24h BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reminder_2h BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_channel TEXT DEFAULT 'whatsapp_email'
    CHECK (reminder_channel IN ('whatsapp_email', 'email_only', 'whatsapp_only'));

-- Valores padrão para registros existentes
UPDATE public.settings
SET
  reminder_24h = COALESCE(reminder_24h, TRUE),
  reminder_2h = COALESCE(reminder_2h, FALSE),
  reminder_channel = COALESCE(reminder_channel, 'whatsapp_email');
