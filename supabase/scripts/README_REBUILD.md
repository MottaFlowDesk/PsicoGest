# Recriar banco Supabase do zero

## Arquivo principal

`rebuild_database_complete.sql` — script único com tabelas, triggers, funções, RLS e Storage.

## Passo a passo

1. Crie um **novo projeto** no [Supabase Dashboard](https://supabase.com/dashboard) (ou use um projeto vazio).
2. Vá em **SQL Editor** → **New query**.

### Se der erro `relation "professionals" already exists`

O banco **não está vazio** (execução parcial ou tabelas antigas). Faça em **duas etapas**:

| Ordem | Arquivo |
|-------|---------|
| **1º** | `00_drop_database_before_rebuild.sql` — apaga tudo do schema `public` |
| **2º** | `rebuild_database_complete.sql` — recria o schema |

3. Cole e execute o script da etapa atual, depois o da próxima.
4. Clique em **Run** em cada um (deve concluir sem erros).

### Banco realmente vazio (projeto novo, nunca rodou SQL)

Pode executar só `rebuild_database_complete.sql`.
5. Em **Settings → API**, copie:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (nunca expor no front)
6. Atualize `.env.local` na raiz do PsicoGuest.
7. Em **Authentication → URL Configuration**, adicione as redirect URLs do app (ex.: `http://localhost:3000/auth/callback`).
8. Verifique **Database → Tables**: **20 tabelas** em `public` (lista abaixo).
9. Verifique **Storage**: buckets `patient-documents` e `avatars`.

## O que o script cria

| Categoria | Itens |
|-----------|--------|
| Tabelas (20) | Ver lista completa na seção abaixo |
| Triggers | `updated_at`, novo usuário Auth, settings padrão, número de fatura, token de confirmação |
| Funções | limites de plano, limpeza de notificações, automação de confirmação/lembrete |
| RLS | isolamento por profissional + rotas públicas (pagamento e confirmação de agenda) |
| Storage | políticas corrigidas (path usa `professional_id`, não `user_id`) |
| Realtime | tabela `notifications` na publicação |

## As 20 tabelas esperadas

| # | Tabela | Função |
|---|--------|--------|
| 1 | `professionals` | Perfil do profissional |
| 2 | `patients` | Pacientes |
| 3 | `appointment_recurrence` | Recorrência de sessões |
| 4 | `appointments` | Agendamentos |
| 5 | `medical_records` | Prontuários |
| 6 | `medical_record_versions` | Versões do prontuário |
| 7 | `patient_documents` | Documentos do paciente |
| 8 | `invoices` | Faturas |
| 9 | `payments` | Pagamentos |
| 10 | `ai_usage_logs` | Uso de IA (futuro) |
| 11 | `ai_transcriptions` | Transcrições (futuro) |
| 12 | `audit_logs` | Auditoria |
| 13 | `lgpd_requests` | Solicitações LGPD |
| 14 | `settings` | Configurações |
| 15 | `professional_availability` | Horários semanais |
| 16 | `availability_overrides` | Exceções de agenda |
| 17 | `subscriptions` | Assinatura Stripe |
| 18 | `whatsapp_integrations` | WhatsApp (Evolution) |
| 19 | `email_integrations` | Gmail OAuth |
| 20 | `notifications` | Notificações in-app |

Se você vê **20 tabelas**, o rebuild foi concluído corretamente.

## Edge Functions (opcional)

Se você usava automação no Supabase (confirmações WhatsApp, Google Meet), re-deploy das functions documentadas em `RESUMO_IMPLEMENTACAO_AUTOMACAO.md` — isso **não** está neste script SQL.

## Reexecutar em projeto que já tem tabelas

Este script é para banco **vazio**. Se já existir schema, apague as tabelas manualmente ou use um projeto novo antes de rodar.
