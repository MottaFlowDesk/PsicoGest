# WhatsApp centralizado — Meta Cloud API

Confirmações e lembretes saem de **um único número verificado do PsicoGuest**
(WABA da plataforma). O profissional não escaneia QR Code e não conecta o
aparelho. A confirmação do paciente acontece sempre pelo link assinado em
`/confirm/[token]`.

## Como funciona

```
criar consulta ─┬─> message_outbox (whatsapp) ─> worker ─> Meta Cloud API ─> paciente
                └─> message_outbox (email)    ─> worker ─> Gmail do profissional
                                                             │
paciente clica no botão ─> /confirm/[token] ─> status=confirmed ─> avisa profissional
```

- **Fila**: `public.message_outbox`, única por `(appointment_id, channel, kind)`.
- **Retry**: 3 tentativas com backoff de 2, 15 e 60 minutos.
- **Fallback**: WhatsApp que esgota tentativas (ou falha na entrega segundo o
  webhook) enfileira automaticamente o e-mail.
- **Texto livre no WhatsApp nunca confirma sessão** — o webhook só registra
  status de entrega e responde com o link seguro.

## 1. Configurar a WABA na Meta

1. Em [business.facebook.com](https://business.facebook.com), crie o **Portfólio
   empresarial** e conclua a verificação da empresa.
2. No [App Dashboard](https://developers.facebook.com/apps), crie um app do tipo
   **Business** e adicione o produto **WhatsApp**.
3. Em **WhatsApp → Configuração da API**, registre o número oficial do
   PsicoGuest e copie o **ID do número de telefone** (`META_PHONE_NUMBER_ID`) e
   o **ID da conta do WhatsApp Business** (`META_WABA_ID`).
4. Em **Configurações do negócio → Usuários do sistema**, crie um system user
   com acesso ao app e gere um **token permanente** com as permissões
   `whatsapp_business_messaging` e `whatsapp_business_management`
   (`META_ACCESS_TOKEN`).
5. Em **App Dashboard → Configurações → Básico**, copie a **Chave secreta do
   app** (`META_APP_SECRET`).

## 2. Cadastrar os templates

Categoria **UTILITY**, idioma **Português (BR)**. A ordem das variáveis importa:
`{{1}}` paciente, `{{2}}` profissional, `{{3}}` data, `{{4}}` horário,
`{{5}}` modalidade. O botão é do tipo **URL dinâmica**.

### `appointment_confirmation`

Corpo:

```
Olá, {{1}}! Sua sessão com {{2}} foi agendada.

Data: {{3}}
Horário: {{4}}
Modalidade: {{5}}

Toque no botão abaixo para confirmar sua presença.
```

Rodapé: `Mensagem automática do PsicoGuest. Não responda por aqui.`

Botão URL: `https://SEU_DOMINIO/confirm/{{1}}` · texto `Confirmar presença`

### `appointment_reminder_24h`

Corpo:

```
Olá, {{1}}! Lembrete da sua sessão com {{2}} amanhã.

Data: {{3}}
Horário: {{4}}
Modalidade: {{5}}

Se ainda não confirmou, toque no botão abaixo.
```

Rodapé e botão: iguais ao template de confirmação.

### `appointment_reminder_2h`

Corpo:

```
Olá, {{1}}! Sua sessão com {{2}} começa em cerca de 2 horas.

Data: {{3}}
Horário: {{4}}
Modalidade: {{5}}

Acesse os detalhes no botão abaixo.
```

Rodapé e botão: iguais aos anteriores (texto do botão `Ver detalhes`).

### `appointment_meet_link` (opcional)

Só necessário se você quiser mandar o link do Google Meet por WhatsApp. Usa
4 variáveis (`{{1}}` paciente, `{{2}}` profissional, `{{3}}` data, `{{4}}` hora).
Sem `META_TEMPLATE_MEET_LINK` preenchido, esse aviso vai apenas por e-mail.

> O domínio do botão URL fica fixo no template. Se o domínio de produção mudar,
> é preciso submeter os templates de novo.

## 3. Variáveis de ambiente

```env
WHATSAPP_PLATFORM_ENABLED=true
META_WABA_ID=
META_PHONE_NUMBER_ID=
META_ACCESS_TOKEN=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
META_TEMPLATE_CONFIRMATION=appointment_confirmation
META_TEMPLATE_REMINDER_24H=appointment_reminder_24h
META_TEMPLATE_REMINDER_2H=appointment_reminder_2h
META_TEMPLATE_LANGUAGE=pt_BR

NEXT_PUBLIC_APP_URL=https://SEU_DOMINIO
CRON_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
```

`META_WEBHOOK_VERIFY_TOKEN` é um valor que você inventa e repete no painel da
Meta. Com `WHATSAPP_PLATFORM_ENABLED=false` o sistema continua funcionando
normalmente, só usando e-mail.

## 4. Cadastrar o webhook

Em **WhatsApp → Configuração → Webhooks**:

- URL: `https://SEU_DOMINIO/api/whatsapp/platform/webhook`
- Verify token: o mesmo valor de `META_WEBHOOK_VERIFY_TOKEN`
- Campos assinados: **messages**

O `POST` só é aceito com assinatura `X-Hub-Signature-256` válida. Sem
`META_APP_SECRET` configurado a rota rejeita tudo com 401 — proposital, para não
aceitar evento forjado.

## 5. Agendamentos (cron)

Já configurados em `vercel.json`:

| Rota | Frequência | Função |
| --- | --- | --- |
| `/api/cron/reminders` | a cada 30 min | Enfileira lembretes de 24h e 2h |
| `/api/cron/process-outbox` | a cada 5 min | Entrega a fila e aplica o retry |

Fora da Vercel, chame as duas rotas com
`Authorization: Bearer $CRON_SECRET`.

## 6. Checklist antes de subir

1. `GET /api/whatsapp/status` (logado) retorna `available: true` e os três
   templates como `true`.
2. Em **Configurações → Integrações**, o card do WhatsApp aparece como **Ativo**.
3. Envie um teste pelo card informando seu próprio número.
4. Crie um agendamento para um paciente com **"Autoriza contato por WhatsApp"**
   ligado e telefone válido: a mensagem deve chegar com o botão.
5. Toque no botão e confirme que a sessão vira **confirmada** no painel.
6. Confira a fila: `select status, count(*) from message_outbox group by 1`.

## Consentimento do paciente

O paciente só recebe no WhatsApp se `patients.whatsapp_opt_in_at` estiver
preenchido — controlado pelo switch **"Autoriza contato por WhatsApp"** no
cadastro. Sem opt-in ou sem telefone válido, a mensagem vai por e-mail.

## O que foi descontinuado

| Item | Situação |
| --- | --- |
| Evolution API / Baileys por profissional | Removido (`lib/whatsapp/client.ts` excluído) |
| QR Code em Configurações | Removido; `POST /api/whatsapp/connect` responde 410 |
| `POST /api/whatsapp/disconnect` | Responde 410 |
| `POST /api/whatsapp/webhook` (Evolution) | Responde 410 |
| Confirmação respondendo "SIM" | Removida — confirmava sessão de terceiro a partir de número parecido |
| `professionals.whatsapp_connected_at` / `whatsapp_phone` | Colunas mantidas no banco, sem uso no código |
| WhatsApp como feature de plano pago | Agora disponível em todos os planos |
