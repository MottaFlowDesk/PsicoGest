# 🎯 Guia de Configuração: Sistema de Assinaturas

Este guia explica como configurar o sistema de assinaturas que acabamos de implementar.

---

## ✅ O que foi implementado

### 1. **Banco de Dados**
- ✅ Tabela `subscriptions` criada
- ✅ Campos de assinatura adicionados na tabela `professionals`
- ✅ Função `get_subscription_limits()` para verificar limites

### 2. **Backend**
- ✅ API `/api/stripe/subscribe` - Criar checkout de assinatura
- ✅ API `/api/stripe/subscription` - Gerenciar assinatura (GET, DELETE, POST)
- ✅ API `/api/subscription/limits` - Verificar limites do plano
- ✅ Webhook atualizado para processar eventos de assinatura
- ✅ Utilitários de verificação de limites

### 3. **Frontend**
- ✅ Componente Pricing atualizado (landing page)
- ✅ Página de gerenciamento de assinatura (`/dashboard/settings/subscription`)
- ✅ Verificação de limites ao adicionar pacientes
- ✅ Link de assinatura nas configurações

### 4. **Planos Configurados**
- ✅ **Essencial**: R$ 97/mês - 60 pacientes
- ✅ **Profissional**: R$ 147/mês - 120 pacientes + IA + WhatsApp
- ✅ **Premium**: R$ 247/mês - Ilimitado

---

## 🔧 Configuração no Stripe

### Passo 1: Criar Produtos e Preços

1. Acesse o dashboard do Stripe: https://dashboard.stripe.com
2. Vá em **Products** → **Add product**

#### Produto 1: Essencial (Mensal)
- **Name:** `PsicoGuest - Essencial (Mensal)`
- **Description:** `Plano Essencial - 60 pacientes`
- **Pricing model:** `Recurring`
- **Price:** `R$ 97,00`
- **Billing period:** `Monthly`
- Clique em **Save product**
- **Copie o Price ID** (começa com `price_...`)

#### Produto 2: Essencial (Anual)
- No mesmo produto, clique em **Add another price**
- **Price:** `R$ 77,60` (20% desconto)
- **Billing period:** `Yearly`
- Clique em **Save**
- **Copie o Price ID**

#### Repita para os outros planos:

**Profissional (Mensal):**
- Price: R$ 147,00
- Billing: Monthly

**Profissional (Anual):**
- Price: R$ 117,60
- Billing: Yearly

**Premium (Mensal):**
- Price: R$ 247,00
- Billing: Monthly

**Premium (Anual):**
- Price: R$ 197,60
- Billing: Yearly

---

### Passo 2: Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no Vercel (Settings → Environment Variables):

```bash
# Essencial
STRIPE_PRICE_ESSENCIAL_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_ESSENCIAL_ANNUAL=price_xxxxxxxxxxxxx

# Profissional
STRIPE_PRICE_PROFISSIONAL_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_PROFISSIONAL_ANNUAL=price_xxxxxxxxxxxxx

# Premium
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_PREMIUM_ANNUAL=price_xxxxxxxxxxxxx
```

**Importante:** Substitua `price_xxxxxxxxxxxxx` pelos Price IDs reais que você copiou do Stripe.

---

### Passo 3: Configurar Webhook

1. No Stripe Dashboard, vá em **Developers** → **Webhooks**
2. Clique em **Add endpoint**
3. URL: `https://SEU-DOMINIO.vercel.app/api/stripe/webhook`
4. Selecione os eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
5. Clique em **Add endpoint**
6. **Copie o Signing secret** (começa com `whsec_...`)
7. Adicione no Vercel como `STRIPE_WEBHOOK_SECRET`

---

### Passo 4: Aplicar Migration no Banco

Execute a migration no Supabase:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute o arquivo: `supabase/migrations/20250109000000_create_subscriptions.sql`
4. Ou use o CLI: `supabase migration up`

---

## 🧪 Testar o Sistema

### 1. Testar Checkout
1. Acesse a landing page: `https://SEU-DOMINIO.vercel.app`
2. Role até a seção de preços
3. Clique em "Escolher [Plano]"
4. Você será redirecionado para o Stripe Checkout

### 2. Usar Cartão de Teste
No Stripe Checkout, use:
- **Número:** `4242 4242 4242 4242`
- **Data:** Qualquer data futura
- **CVC:** Qualquer 3 dígitos
- **CEP:** Qualquer CEP válido

### 3. Verificar Assinatura
1. Após o checkout, acesse: `/dashboard/settings/subscription`
2. Você deve ver seu plano ativo
3. Verifique os detalhes (trial, período, etc.)

### 4. Testar Limites
1. Tente adicionar mais pacientes do que o plano permite
2. Você deve ver uma mensagem de erro com opção de upgrade

---

## 📋 Checklist de Configuração

- [ ] Criar produtos no Stripe (6 produtos: 3 planos × 2 períodos)
- [ ] Copiar todos os Price IDs
- [ ] Adicionar variáveis de ambiente no Vercel
- [ ] Configurar webhook no Stripe
- [ ] Adicionar `STRIPE_WEBHOOK_SECRET` no Vercel
- [ ] Aplicar migration no banco de dados
- [ ] Testar checkout com cartão de teste
- [ ] Verificar se assinatura aparece no dashboard
- [ ] Testar limites de pacientes

---

## 🚨 Troubleshooting

### Erro: "Price ID não configurado"
- Verifique se as variáveis de ambiente estão configuradas
- Certifique-se de que os Price IDs estão corretos
- Faça redeploy no Vercel após adicionar variáveis

### Assinatura não aparece após checkout
- Verifique os logs do webhook no Stripe Dashboard
- Verifique se o webhook está recebendo os eventos
- Confirme que `STRIPE_WEBHOOK_SECRET` está correto

### Limites não funcionam
- Verifique se a migration foi aplicada
- Confirme que o profissional tem `subscription_plan` definido
- Verifique os logs do servidor

---

## 📊 Estrutura de Dados

### Tabela `subscriptions`
```sql
- id (UUID)
- professional_id (UUID)
- stripe_subscription_id (TEXT)
- stripe_customer_id (TEXT)
- plan_name (TEXT: 'essencial' | 'profissional' | 'premium')
- status (TEXT)
- current_period_start (TIMESTAMPTZ)
- current_period_end (TIMESTAMPTZ)
- trial_start (TIMESTAMPTZ)
- trial_end (TIMESTAMPTZ)
- canceled_at (TIMESTAMPTZ)
- cancel_at_period_end (BOOLEAN)
```

### Campos adicionados em `professionals`
```sql
- stripe_customer_id (TEXT)
- subscription_plan (TEXT)
- subscription_status (TEXT)
- subscription_trial_ends_at (TIMESTAMPTZ)
- subscription_current_period_end (TIMESTAMPTZ)
```

---

## 🎉 Próximos Passos

Após configurar tudo:

1. **Testar em produção** com cartões reais (modo Live)
2. **Monitorar webhooks** no Stripe Dashboard
3. **Configurar emails** de confirmação (opcional)
4. **Adicionar analytics** para acompanhar conversões

---

**Última atualização:** Janeiro 2025

