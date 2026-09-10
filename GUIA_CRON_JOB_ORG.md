# Guia Completo: Criar Conta e Configurar Cron Jobs no cron-job.org

Este guia te ajudará a criar sua conta no cron-job.org e configurar os cron jobs do PsicoGuest.

## 📋 Pré-requisitos

1. URL da sua aplicação em produção (ex: `https://psicogest.vercel.app`)
2. Variável `CRON_SECRET` configurada no Vercel
3. Acesso ao painel do Vercel

---

## Passo 1: Gerar o CRON_SECRET (se ainda não tiver)

### 1.1 Gerar um token seguro

No terminal (PowerShell no Windows):

```powershell
# Opção 1: Usando OpenSSL (se tiver instalado)
openssl rand -hex 32

# Opção 2: Usando Node.js (se tiver instalado)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opção 3: Usar um gerador online
# Acesse: https://randomkeygen.com/
# Use a opção "CodeIgniter Encryption Keys"
```

### 1.2 Configurar no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto **PsicoGuest**
3. Vá em **Settings** → **Environment Variables**
4. Clique em **Add New**
5. Preencha:
   - **Key:** `CRON_SECRET`
   - **Value:** Cole o token gerado
   - **Environment:** Selecione Production, Preview e Development
6. Clique em **Save**
7. **IMPORTANTE:** Faça um novo deploy para aplicar a variável

---

## Passo 2: Criar Conta no cron-job.org

### 2.1 Acessar o site

1. Acesse: https://cron-job.org
2. Clique em **Sign Up** (canto superior direito)

### 2.2 Criar a conta

1. Preencha o formulário:
   - **Email:** Seu email profissional
   - **Password:** Uma senha forte
   - **Confirm Password:** Confirme a senha
2. Aceite os termos de uso
3. Clique em **Sign Up**

### 2.3 Confirmar o email

1. Verifique sua caixa de entrada
2. Abra o email do cron-job.org
3. Clique no link de confirmação
4. Você será redirecionado para o dashboard

---

## Passo 3: Configurar Cron Job de Lembretes

### 3.1 Criar o primeiro job

1. No dashboard, clique no botão **Create cronjob** (verde, canto superior direito)

2. Preencha os campos:

   **Title:**
   ```
   PsicoGuest - Lembretes de Agendamento
   ```

   **Address (URL):**
   ```
   https://psicogest-ebon.vercel.app//api/cron/reminders
   ```
   *(Substitua `SEU-DOMINIO` pela URL real da sua aplicação)*

   **Request method:**
   ```
   GET
   ```

   **Request headers:**
   ```
   Authorization: Bearer SEU_CRON_SECRET_AQUI
   ```
   *(Substitua `SEU_CRON_SECRET_AQUI` pelo valor real que você configurou no Vercel)*

   **Schedule:**
   - Selecione **Every hour** ou digite: `0 * * * *`
   - Isso executa a cada hora (00:00, 01:00, 02:00, etc.)

   **Activation:**
   - Marque ✅ **Enabled**

3. Clique em **Create cronjob**

### 3.2 Configurações avançadas (recomendado)

Após criar, clique no job criado e configure:

- **Timeout:** 60 segundos
- **Retry on failure:** 2 tentativas
- **Notification:** ✅ Ative para receber emails em caso de falha

---

## Passo 4: Configurar Cron Job de Health Check

### 4.1 Criar o segundo job

1. Clique em **Create cronjob** novamente

2. Preencha os campos:

   **Title:**
   ```
   PsicoGuest - Health Check (Supabase)
   ```

   **Address (URL):**
   ```
   https://psicogest-ebon.vercel.app/api/cron/health-check
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
   - Selecione **Daily** ou digite: `0 2 * * *`
   - Isso executa diariamente às 2:00 AM

   **Activation:**
   - Marque ✅ **Enabled**

3. Clique em **Create cronjob**

---

## Passo 5: Testar os Cron Jobs

### 5.1 Teste manual via navegador

1. Abra uma nova aba no navegador
2. Acesse: `https://SEU-DOMINIO.vercel.app/api/cron/reminders`
3. Você deve receber um erro 401 (não autorizado) - isso é normal!
4. Agora teste com o header correto usando um cliente HTTP

### 5.2 Teste usando PowerShell (Windows)

```powershell
# Teste do endpoint de lembretes
$headers = @{
    "Authorization" = "Bearer SEU_CRON_SECRET_AQUI"
}
Invoke-RestMethod -Uri "https://SEU-DOMINIO.vercel.app/api/cron/reminders" -Method GET -Headers $headers

# Teste do endpoint de health check
Invoke-RestMethod -Uri "https://SEU-DOMINIO.vercel.app/api/cron/health-check" -Method GET -Headers $headers
```

### 5.3 Verificar execução no cron-job.org

1. No dashboard do cron-job.org
2. Clique no job criado
3. Vá na aba **Execution history**
4. Aguarde alguns minutos e verifique se apareceu uma execução
5. Clique na execução para ver os detalhes
6. Deve mostrar status `200 OK` se tudo estiver funcionando

### 5.4 Verificar logs no Vercel

1. Acesse o painel do Vercel
2. Vá em **Deployments** → Selecione o deployment mais recente
3. Clique em **Functions** → `/api/cron/reminders`
4. Verifique os logs de execução

---

## Passo 6: Configurar Notificações

### 6.1 Ativar notificações por email

1. No dashboard do cron-job.org
2. Vá em **Settings** (ícone de engrenagem)
3. Em **Notifications**, configure:
   - ✅ Email notifications
   - Selecione quando receber (apenas falhas ou todas)
4. Salve as configurações

---

## ✅ Checklist Final

- [ ] Conta criada no cron-job.org
- [ ] Email confirmado
- [ ] `CRON_SECRET` configurado no Vercel
- [ ] Cron job de lembretes criado e ativado
- [ ] Cron job de health check criado e ativado
- [ ] Testes manuais realizados
- [ ] Primeira execução verificada nos logs
- [ ] Notificações configuradas

---

## 🔧 Troubleshooting

### Erro 401 - Unauthorized

**Causa:** Token de autenticação incorreto ou ausente.

**Solução:**
1. Verifique se o `CRON_SECRET` está configurado no Vercel
2. Confirme que o header está sendo enviado corretamente
3. Certifique-se de que não há espaços extras no token
4. Verifique se fez um novo deploy após adicionar a variável

### Erro 500 - Internal Server Error

**Causa:** Erro na execução do código.

**Solução:**
1. Verifique os logs no Vercel
2. Confirme que todas as variáveis de ambiente estão configuradas
3. Verifique se o Supabase está acessível
4. Confirme que o WhatsApp está conectado (para lembretes)

### Cron job não está executando

**Verificações:**
1. ✅ Job está ativado (Enabled)
2. ✅ Schedule está configurado corretamente
3. ✅ URL está correta e acessível
4. ✅ Aguardou tempo suficiente (pode levar alguns minutos)

---

## 📚 Recursos Adicionais

- [Documentação do cron-job.org](https://cron-job.org/en/help/)
- [Cron Expression Generator](https://crontab.guru/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 🎉 Pronto!

Agora seus cron jobs estão configurados e executando automaticamente! Os lembretes serão enviados a cada hora e o health check será executado diariamente.


