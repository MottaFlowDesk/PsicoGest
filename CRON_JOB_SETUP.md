# Configuração de Cron Jobs com cron-job.org

Este guia explica como configurar os cron jobs do PsicoGuest usando o serviço gratuito [cron-job.org](https://cron-job.org).

## Por que usar cron-job.org?

- ✅ **Gratuito** e sem restrições de frequência
- ✅ Permite executar cron jobs a cada hora (necessário para lembretes de 2h)
- ✅ Interface simples e confiável
- ✅ Logs de execução disponíveis
- ✅ Notificações por email em caso de falha

## Pré-requisitos

1. Conta no [cron-job.org](https://cron-job.org) (gratuita)
2. Variável de ambiente `CRON_SECRET` configurada no Vercel
3. URL da aplicação em produção (ex: `https://seu-dominio.vercel.app`)

## Passo 1: Obter o CRON_SECRET

1. Acesse o painel do Vercel: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Localize a variável `CRON_SECRET`
5. Copie o valor (ou crie um novo se não existir)

**Dica:** Use um valor seguro e aleatório, por exemplo:
```bash
openssl rand -hex 32
```

## Passo 2: Criar Conta no cron-job.org

1. Acesse: https://cron-job.org
2. Clique em **Sign Up** (canto superior direito)
3. Crie uma conta gratuita (não requer cartão de crédito)
4. Confirme seu email

## Passo 3: Configurar Cron Job de Lembretes

### 3.1 Criar o Job

1. Após fazer login, clique em **Create cronjob**
2. Preencha os campos:

**Title:**
```
PsicoGuest - Lembretes de Agendamento
```

**Address (URL):**
```
https://seu-dominio.vercel.app/api/cron/reminders
```
*(Substitua `seu-dominio.vercel.app` pela URL real da sua aplicação)*

**Request method:**
```
GET
```

**Request headers:**
```
Authorization: Bearer SEU_CRON_SECRET_AQUI
```
*(Substitua `SEU_CRON_SECRET_AQUI` pelo valor real da variável `CRON_SECRET`)*

**Schedule:**
```
Every hour (0 * * * *)
```

**Activation:**
```
✅ Enabled
```

### 3.2 Configurações Avançadas (Opcional)

- **Timeout:** 60 segundos
- **Retry on failure:** 2 tentativas
- **Notification:** Ative para receber emails em caso de falha

## Passo 4: Configurar Cron Job de Health Check

### 4.1 Criar o Job

1. Clique em **Create cronjob** novamente
2. Preencha os campos:

**Title:**
```
PsicoGuest - Health Check (Supabase)
```

**Address (URL):**
```
https://seu-dominio.vercel.app/api/cron/health-check
```

**Request method:**
```
GET
```

**Request headers:**
```
Authorization: Bearer SEU_CRON_SECRET_AQUI
```

**Schedule:**
```
Daily at 2:00 AM (0 2 * * *)
```

**Activation:**
```
✅ Enabled
```

## Passo 5: Testar os Cron Jobs

### 5.1 Teste Manual via cURL

Teste o endpoint de lembretes:
```bash
curl -X GET "https://seu-dominio.vercel.app/api/cron/reminders" \
  -H "Authorization: Bearer SEU_CRON_SECRET_AQUI"
```

Teste o endpoint de health check:
```bash
curl -X GET "https://seu-dominio.vercel.app/api/cron/health-check" \
  -H "Authorization: Bearer SEU_CRON_SECRET_AQUI"
```

### 5.2 Verificar Logs no cron-job.org

1. Acesse o dashboard do cron-job.org
2. Clique no job criado
3. Vá na aba **Execution history**
4. Verifique se as execuções estão retornando status `200 OK`

### 5.3 Verificar Logs no Vercel

1. Acesse o painel do Vercel
2. Vá em **Deployments** → Selecione o deployment mais recente
3. Clique em **Functions** → `/api/cron/reminders`
4. Verifique os logs de execução

## Cronograma Recomendado

### Lembretes de Agendamento
- **Frequência:** A cada hora (`0 * * * *`)
- **Por quê:** Necessário para enviar lembretes de 2h antes do agendamento
- **Horários:** 00:00, 01:00, 02:00, ..., 23:00

### Health Check
- **Frequência:** Uma vez por dia às 2:00 AM (`0 2 * * *`)
- **Por quê:** Mantém o projeto Supabase ativo
- **Horário:** 02:00

## Troubleshooting

### Erro 401 - Unauthorized

**Causa:** Token de autenticação incorreto ou ausente.

**Solução:**
1. Verifique se o `CRON_SECRET` está configurado no Vercel
2. Confirme que o header está sendo enviado corretamente:
   ```
   Authorization: Bearer SEU_CRON_SECRET
   ```
3. Certifique-se de que não há espaços extras no token

### Erro 500 - Internal Server Error

**Causa:** Erro na execução do código.

**Solução:**
1. Verifique os logs no Vercel
2. Confirme que as variáveis de ambiente estão configuradas
3. Verifique se o Supabase está acessível
4. Confirme que o WhatsApp está conectado (para lembretes)

### Lembretes não estão sendo enviados

**Verificações:**
1. ✅ Cron job está executando (verificar logs)
2. ✅ WhatsApp está conectado nas configurações
3. ✅ Paciente tem telefone cadastrado
4. ✅ Configurações de lembrete estão habilitadas
5. ✅ Agendamento está com status "scheduled" ou "confirmed"
6. ✅ `reminder_sent_at` está `null` (não foi enviado antes)
7. ✅ Agendamento está na janela de tempo correta (1.5h-2.5h para lembrete 2h)

## Desativar Cron Jobs da Vercel (Opcional)

Se quiser usar apenas o cron-job.org, você pode remover os cron jobs do `vercel.json`:

```json
{
  "comment": "Cron jobs configurados no cron-job.org"
}
```

**Nota:** Manter ambos ativos não causa problemas, mas pode resultar em execuções duplicadas.

## Segurança

- ✅ **Nunca** compartilhe o `CRON_SECRET` publicamente
- ✅ Use um token forte e aleatório
- ✅ Mantenha o token apenas nas variáveis de ambiente do Vercel
- ✅ Revise os logs periodicamente para detectar tentativas de acesso não autorizadas

## Suporte

Se encontrar problemas:
1. Verifique os logs no cron-job.org
2. Verifique os logs no Vercel
3. Teste os endpoints manualmente com cURL
4. Confirme que todas as variáveis de ambiente estão configuradas

## Recursos Adicionais

- [Documentação do cron-job.org](https://cron-job.org/en/help/)
- [Cron Expression Generator](https://crontab.guru/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

