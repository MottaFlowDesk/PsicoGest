-- ============================================================
-- MIGRAÇÃO: Tabelas e Campos para Automação de Agendamentos
-- ============================================================
-- Esta migração adiciona campos necessários para o sistema
-- de automação de confirmações, lembretes e criação de Google Meet
-- ============================================================

-- 1. Adicionar campos faltantes na tabela appointments
-- ============================================================
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meet_created_at TIMESTAMPTZ;

-- Renomear meeting_link para meet_link (se necessário)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'meeting_link'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'meet_link'
  ) THEN
    ALTER TABLE appointments RENAME COLUMN meeting_link TO meet_link;
  END IF;
END $$;

-- Garantir que meet_link existe
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS meet_link TEXT;

-- Ajustar status para incluir 'pending' se necessário
DO $$
BEGIN
  -- Verificar se a constraint atual permite 'pending'
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'appointments_status_check' 
    AND pg_get_constraintdef(oid) LIKE '%pending%'
  ) THEN
    -- Remover constraint antiga
    ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
    
    -- Criar nova constraint com 'pending'
    ALTER TABLE appointments 
    ADD CONSTRAINT appointments_status_check 
    CHECK (status IN ('pending', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'));
  END IF;
END $$;

-- 2. Criar tabela whatsapp_integrations
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL UNIQUE,
  evolution_api_url TEXT NOT NULL,
  evolution_api_key TEXT NOT NULL, -- Será criptografada na aplicação
  instance_id TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_evolution_url CHECK (evolution_api_url ~* '^https?://')
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_integrations_professional 
  ON whatsapp_integrations(professional_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_integrations_status 
  ON whatsapp_integrations(status);

-- Trigger para updated_at
CREATE TRIGGER update_whatsapp_integrations_updated_at
BEFORE UPDATE ON whatsapp_integrations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS para whatsapp_integrations
ALTER TABLE whatsapp_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own whatsapp integrations"
  ON whatsapp_integrations FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- 3. Criar tabela email_integrations
-- ============================================================
CREATE TABLE IF NOT EXISTS email_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL UNIQUE,
  google_refresh_token TEXT NOT NULL, -- Será criptografada na aplicação
  google_access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  email_from TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_email_from CHECK (email_from ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS idx_email_integrations_professional 
  ON email_integrations(professional_id);
CREATE INDEX IF NOT EXISTS idx_email_integrations_expires 
  ON email_integrations(token_expires_at);

-- Trigger para updated_at
CREATE TRIGGER update_email_integrations_updated_at
BEFORE UPDATE ON email_integrations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS para email_integrations
ALTER TABLE email_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own email integrations"
  ON email_integrations FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- 4. Criar índices otimizados para queries de automação
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_appointments_confirmation_sent 
  ON appointments(professional_id, status, confirmation_sent_at) 
  WHERE status = 'pending' AND confirmation_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_reminder_sent 
  ON appointments(professional_id, status, reminder_sent_at, scheduled_at) 
  WHERE status = 'confirmed' AND reminder_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_meet_link 
  ON appointments(professional_id, meet_link, meet_created_at) 
  WHERE meet_link IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at_status 
  ON appointments(scheduled_at, status);

-- 5. Função auxiliar para verificar se appointment precisa de confirmação
-- ============================================================
CREATE OR REPLACE FUNCTION appointments_needing_confirmation()
RETURNS TABLE (
  appointment_id UUID,
  professional_id UUID,
  patient_id UUID,
  scheduled_at TIMESTAMPTZ,
  patient_name TEXT,
  patient_whatsapp TEXT,
  patient_email TEXT,
  professional_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.professional_id,
    a.patient_id,
    a.scheduled_at,
    p.full_name,
    p.phone,
    p.email,
    pr.full_name
  FROM appointments a
  INNER JOIN patients p ON a.patient_id = p.id
  INNER JOIN professionals pr ON a.professional_id = pr.id
  WHERE 
    a.status = 'pending'
    AND a.scheduled_at > NOW()
    AND (
      a.confirmation_sent_at IS NULL 
      OR a.confirmation_sent_at < NOW() - INTERVAL '24 hours'
    )
  ORDER BY a.scheduled_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função auxiliar para verificar appointments que precisam de lembrete
-- ============================================================
CREATE OR REPLACE FUNCTION appointments_needing_reminder()
RETURNS TABLE (
  appointment_id UUID,
  professional_id UUID,
  patient_id UUID,
  scheduled_at TIMESTAMPTZ,
  meet_link TEXT,
  patient_name TEXT,
  patient_whatsapp TEXT,
  professional_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.professional_id,
    a.patient_id,
    a.scheduled_at,
    a.meet_link,
    p.full_name,
    p.phone,
    pr.full_name
  FROM appointments a
  INNER JOIN patients p ON a.patient_id = p.id
  INNER JOIN professionals pr ON a.professional_id = pr.id
  WHERE 
    a.status = 'confirmed'
    AND a.meet_link IS NOT NULL
    AND a.reminder_sent_at IS NULL
    AND a.scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '15 minutes'
  ORDER BY a.scheduled_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Comentários para documentação
-- ============================================================
COMMENT ON COLUMN appointments.confirmation_sent_at IS 
  'Timestamp da última vez que a confirmação foi enviada ao paciente';
COMMENT ON COLUMN appointments.confirmed_at IS 
  'Timestamp de quando o paciente confirmou o agendamento';
COMMENT ON COLUMN appointments.meet_link IS 
  'Link do Google Meet gerado automaticamente';
COMMENT ON COLUMN appointments.meet_created_at IS 
  'Timestamp de quando o Google Meet foi criado';
COMMENT ON COLUMN appointments.reminder_sent_at IS 
  'Timestamp da última vez que o lembrete foi enviado';

COMMENT ON TABLE whatsapp_integrations IS 
  'Armazena as integrações do WhatsApp de cada profissional via Evolution API';
COMMENT ON TABLE email_integrations IS 
  'Armazena as integrações de email (Gmail) de cada profissional via OAuth2';

