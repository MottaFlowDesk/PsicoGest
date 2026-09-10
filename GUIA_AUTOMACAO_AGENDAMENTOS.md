# 🚀 Guia Completo: Automação de Agendamentos

Este documento descreve o sistema completo de automação de agendamentos implementado no PsicoGuest usando Supabase Edge Functions e Scheduler.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
3. [Edge Functions](#edge-functions)
4. [Cron Jobs](#cron-jobs)
5. [Fluxos de Automação](#fluxos-de-automação)
6. [Exemplos de Payloads](#exemplos-de-payloads)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O sistema de automação permite:

- ✅ **Envio automático de confirmações** via WhatsApp e Email
- ✅ **Confirmação de agendamentos** pelo paciente
- ✅ **Criação automática de Google Meet** para teleconsultas
- ✅ **Lembretes automáticos** 15 minutos antes da consulta

### Arquitetura

```
┌─────────────────┐
│  Supabase Scheduler (pg_cron)
│  - Executa a cada 1 hora
└────────┬─────────┘
         │
         ├─► send-appointment-confirmations
         │   └─► Envia confirmações via WhatsApp/Email
         │
         └─► send-whatsapp-reminders
             └─► Envia lembretes 15min antes
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas/Modificadas

#### 1. `appointments` (modificada)

Campos adicionados:
- `confirmation_sent_at` (TIMESTAMPTZ) - Quando a confirmação foi enviada
- `confirmed_at` (TIMESTAMPTZ) - Quando o paciente confirmou
- `meet_link` (TEXT) - Link do Google Meet
- `meet_created_at` (TIMESTAMPTZ) - Quando o Meet foi criado
- `reminder_sent_at` (TIMESTAMPTZ) - Quando o lembrete foi enviado

#### 2. `whatsapp_integrations` (nova)

Armazena integrações WhatsApp de cada profissional:

```sql
CREATE TABLE whatsapp_integrations (
  id UUID PRIMARY KEY,
  professional_id UUID REFERENCES professionals(id),
  evolution_api_url TEXT NOT NULL,
  evolution_api_key TEXT NOT NULL, -- Criptografada na aplicação
  instance_id TEXT,
  status TEXT CHECK (status IN ('connected', 'disconnected')),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### 3. `email_integrations` (nova)

Armazena integrações de email (Gmail) de cada profissional:

```sql
CREATE TABLE email_integrations (
  id UUID PRIMARY KEY,
  professional_id UUID REFERENCES professionals(id),
  google_refresh_token TEXT NOT NULL, -- Criptografado na aplicação
  google_access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  email_from TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Funções Auxiliares

#### `appointments_needing_confirmation()`

Retorna appointments que precisam de confirmação:
- Status = 'pending'
- scheduled_at > NOW()
- confirmation_sent_at IS NULL ou > 24h

#### `appointments_needing_reminder()`

Retorna appointments que precisam de lembrete:
- Status = 'confirmed'
- meet_link IS NOT NULL
- reminder_sent_at IS NULL
- scheduled_at BETWEEN NOW() AND NOW() + 15 minutes

---

## ⚡ Edge Functions

### 1. `send-appointment-confirmations`

**Descrição:** Envia confirmações de agendamento via WhatsApp e/ou Email.

**Frequência:** Executada a cada 1 hora pelo cron job.

**Lógica:**
1. Busca appointments que precisam de confirmação
2. Para cada appointment:
   - Tenta enviar via WhatsApp primeiro (se conectado)
   - Se falhar, tenta Email
   - Atualiza `confirmation_sent_at`

**Endpoint:** `https://cymewnokizcwahamrwtn.supabase.co/functions/v1/send-appointment-confirmations`

**Método:** POST (chamado pelo cron)

**Resposta de Sucesso:**
```json
{
  "success": true,
  "processed": 5,
  "results": {
    "sent": 4,
    "failed": 1,
    "errors": ["Failed to send confirmation for appointment abc-123"]
  },
  "timestamp": "2025-01-13T22:00:00.000Z"
}
```

---

### 2. `confirm-appointment`

**Descrição:** Confirma um agendamento quando o paciente clica no link.

**Frequência:** Chamada manualmente quando paciente confirma.

**Lógica:**
1. Valida `appointment_id`
2. Atualiza status para 'confirmed'
3. Se não tem `meet_link`, chama `create-google-meet`

**Endpoint:** `https://cymewnokizcwahamrwtn.supabase.co/functions/v1/confirm-appointment`

**Método:** POST

**Payload:**
```json
{
  "appointment_id": "uuid-do-appointment"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "appointment": {
    "id": "uuid",
    "status": "confirmed",
    "confirmed_at": "2025-01-13T22:00:00.000Z"
  },
  "timestamp": "2025-01-13T22:00:00.000Z"
}
```

---

### 3. `create-google-meet`

**Descrição:** Cria automaticamente um link Google Meet para teleconsultas.

**Frequência:** Chamada quando appointment é confirmado e não tem meet_link.

**Lógica:**
1. Verifica se já existe `meet_link` (idempotência)
2. Verifica se é telehealth e se Google está conectado
3. Cria evento no Google Calendar com Google Meet
4. Salva `meet_link` e `meet_created_at`

**Endpoint:** `https://cymewnokizcwahamrwtn.supabase.co/functions/v1/create-google-meet`

**Método:** POST

**Payload:**
```json
{
  "appointment_id": "uuid-do-appointment"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "meet_link": "https://meet.google.com/xxx-yyyy-zzz",
  "event_id": "google-calendar-event-id",
  "timestamp": "2025-01-13T22:00:00.000Z"
}
```

---

### 4. `send-whatsapp-reminders`

**Descrição:** Envia lembretes via WhatsApp 15 minutos antes da consulta.

**Frequência:** Executada a cada 1 hora pelo cron job.

**Lógica:**
1. Busca appointments que precisam de lembrete
2. Para cada appointment:
   - Verifica se tem WhatsApp do paciente
   - Verifica se profissional tem WhatsApp conectado
   - Envia mensagem com link do Meet
   - Atualiza `reminder_sent_at`

**Endpoint:** `https://cymewnokizcwahamrwtn.supabase.co/functions/v1/send-whatsapp-reminders`

**Método:** POST (chamado pelo cron)

**Resposta de Sucesso:**
```json
{
  "success": true,
  "processed": 2,
  "results": {
    "sent": 2,
    "failed": 0,
    "errors": []
  },
  "timestamp": "2025-01-13T22:00:00.000Z"
}
```

---

## ⏰ Cron Jobs

Os cron jobs são configurados usando `pg_cron` e executam as Edge Functions automaticamente.

### Configuração Atual

#### 1. Envio de Confirmações
- **Nome:** `send-appointment-confirmations-hourly`
- **Schedule:** `0 * * * *` (a cada hora)
- **Function:** `send-appointment-confirmations`

#### 2. Envio de Lembretes
- **Nome:** `send-whatsapp-reminders-hourly`
- **Schedule:** `0 * * * *` (a cada hora)
- **Function:** `send-whatsapp-reminders`

### Verificar Cron Jobs

```sql
-- Listar todos os cron jobs
SELECT * FROM cron.job;

-- Ver histórico de execuções
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### Gerenciar Cron Jobs

```sql
-- Pausar um cron job
SELECT cron.unschedule('send-appointment-confirmations-hourly');

-- Reativar um cron job
SELECT cron.schedule(
  'send-appointment-confirmations-hourly',
  '0 * * * *',
  $$ ... $$ -- SQL do job
);
```

---

## 🔄 Fluxos de Automação

### Fluxo 1: Criação de Agendamento → Confirmação

```
1. Profissional cria agendamento
   └─► status = 'pending'
   └─► confirmation_sent_at = NULL

2. Cron job executa (a cada hora)
   └─► send-appointment-confirmations
   └─► Busca appointments pendentes
   └─► Envia WhatsApp/Email
   └─► Atualiza confirmation_sent_at

3. Paciente recebe mensagem
   └─► Clica no link de confirmação
   └─► confirm-appointment é chamada
   └─► status = 'confirmed'
   └─► confirmed_at = NOW()

4. Se é telehealth:
   └─► create-google-meet é chamada
   └─► Google Meet é criado
   └─► meet_link é salvo
```

### Fluxo 2: Lembrete 15 Minutos Antes

```
1. Appointment confirmado com meet_link
   └─► status = 'confirmed'
   └─► meet_link IS NOT NULL
   └─► reminder_sent_at = NULL

2. Cron job executa (a cada hora)
   └─► send-whatsapp-reminders
   └─► Busca appointments em 15min
   └─► Envia WhatsApp com link do Meet
   └─► Atualiza reminder_sent_at
```

---

## 📝 Exemplos de Payloads

### Exemplo 1: Confirmar Appointment

**Request:**
```bash
curl -X POST \
  https://cymewnokizcwahamrwtn.supabase.co/functions/v1/confirm-appointment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{
    "appointment_id": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

**Response:**
```json
{
  "success": true,
  "appointment": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "confirmed",
    "confirmed_at": "2025-01-13T22:00:00.000Z"
  },
  "timestamp": "2025-01-13T22:00:00.000Z"
}
```

### Exemplo 2: Criar Google Meet

**Request:**
```bash
curl -X POST \
  https://cymewnokizcwahamrwtn.supabase.co/functions/v1/create-google-meet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{
    "appointment_id": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

**Response:**
```json
{
  "success": true,
  "meet_link": "https://meet.google.com/abc-defg-hij",
  "event_id": "google-calendar-event-id-123",
  "timestamp": "2025-01-13T22:00:00.000Z"
}
```

---

## 🔧 Troubleshooting

### Problema: Cron jobs não estão executando

**Solução:**
1. Verificar se `pg_cron` está habilitado:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Verificar se os cron jobs existem:
   ```sql
   SELECT * FROM cron.job;
   ```

3. Verificar logs de execução:
   ```sql
   SELECT * FROM cron.job_run_details 
   ORDER BY start_time DESC 
   LIMIT 10;
   ```

### Problema: Confirmações não estão sendo enviadas

**Verificações:**
1. Verificar se appointments têm status 'pending'
2. Verificar se `confirmation_sent_at` está NULL
3. Verificar se profissional tem WhatsApp/Email conectado
4. Verificar logs da Edge Function no Supabase Dashboard

### Problema: Google Meet não está sendo criado

**Verificações:**
1. Verificar se appointment é 'telehealth'
2. Verificar se profissional tem `google_calendar_connected = true`
3. Verificar se `google_refresh_token` está válido
4. Verificar se já existe `meet_link` (idempotência)

### Problema: Lembretes não estão sendo enviados

**Verificações:**
1. Verificar se appointment está 'confirmed'
2. Verificar se `meet_link` existe
3. Verificar se `reminder_sent_at` está NULL
4. Verificar se appointment está entre NOW() e NOW() + 15min
5. Verificar se profissional tem WhatsApp conectado

---

## 🔒 Segurança e LGPD

### Boas Práticas Implementadas

1. **Idempotência:**
   - Não envia mensagens duplicadas
   - Não cria Google Meet duplicado
   - Verifica `confirmation_sent_at` e `reminder_sent_at`

2. **Dados Sensíveis:**
   - Tokens e chaves são armazenados criptografados
   - Mensagens não contêm dados clínicos
   - Linguagem neutra e LGPD-safe

3. **Tratamento de Erros:**
   - Falhas não interrompem o fluxo
   - Logs apenas técnicos (sem dados sensíveis)
   - Retry automático via cron jobs

4. **RLS (Row Level Security):**
   - Todas as tabelas têm RLS habilitado
   - Profissionais só acessam seus próprios dados

---

## 📚 Recursos Adicionais

- [Documentação Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentação pg_cron](https://github.com/citusdata/pg_cron)
- [Documentação Google Calendar API](https://developers.google.com/calendar/api)
- [Documentação Evolution API](https://doc.evolution-api.com/)

---

**Última atualização:** 13 de Janeiro de 2025





