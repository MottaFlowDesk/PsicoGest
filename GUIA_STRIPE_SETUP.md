# Guia Completo: Configurar Stripe - Conta, Planos e Stripe Connect

Este guia te ajudará a criar sua conta no Stripe, configurar planos de assinatura e ativar o Stripe Connect para o PsicoGuest.

---

## 📋 Visão Geral

O PsicoGuest usa o Stripe para:
1. **Stripe Connect:** Permite que profissionais recebam pagamentos diretamente
2. **Planos de Assinatura:** Para cobrança recorrente dos profissionais (futuro)
3. **Pagamentos de Faturas:** Pacientes pagam faturas diretamente

---

## Parte 1: Criar Conta no Stripe

### 1.1 Criar conta

1. Acesse: https://dashboard.stripe.com/register
2. Preencha o formulário:
   - **Email:** Seu email profissional
   - **Senha:** Uma senha forte
   - **Nome completo:** Seu nome
3. Clique em **Create account**

### 1.2 Ativar conta

1. Verifique seu email e confirme a conta
2. Faça login em: https://dashboard.stripe.com/login
3. Complete o onboarding inicial:
   - Informações da empresa
   - Endereço
   - Número de telefone
   - Tipo de negócio: **Health practitioners office**

### 1.3 Escolher modo (Test vs Live)

**Para desenvolvimento/testes:**
- Use o modo **Test** (padrão)
- Chaves começam com `sk_test_` e `pk_test_`

**Para produção:**
- Ative o modo **Live** (após testes)
- Chaves começam com `sk_live_` e `pk_live_`
- Requer verificação de identidade

**Recomendação:** Comece com Test mode, teste tudo, depois ative Live.

---

## Parte 2: Obter Chaves da API

### 2.1 Acessar as chaves

1. No dashboard do Stripe, vá em **Developers** → **API keys**
2. Você verá duas chaves:

   **Publishable key** (pública):
   - Começa com `pk_test_...` ou `pk_live_...`
   - Usada no frontend

   **Secret key** (privada):
   - Começa com `sk_test_...` ou `sk_live_...`
   - **NUNCA** exponha no frontend!

### 2.2 Configurar no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto **PsicoGuest**
3. Vá em **Settings** → **Environment Variables**
4. Adicione as seguintes variáveis:

   **Para Test Mode:**
   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

   **Para Live Mode (quando estiver pronto):**
   ```
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

5. Selecione os ambientes (Production, Preview, Development)
6. Clique em **Save**
7. **IMPORTANTE:** Faça um novo deploy

---

## Parte 3: Configurar Stripe Connect

### 3.1 Ativar Stripe Connect

1. No dashboard do Stripe, vá em **Settings** → **Connect**
2. Clique em **Get started** ou **Activate Connect**
3. Escolha o tipo: **Express accounts** (recomendado)
4. Complete as configurações:
   - **Business type:** Individual ou Company
   - **Country:** Brazil (BR)
   - **Currency:** BRL (Real brasileiro)

### 3.2 Configurar Branding (Opcional)

1. Em **Settings** → **Branding**
2. Faça upload do logo do PsicoGuest
3. Configure cores da marca
4. Isso aparecerá na tela de onboarding dos profissionais

### 3.3 Configurar Webhooks

1. Vá em **Developers** → **Webhooks**
2. Clique em **Add endpoint**
3. Preencha:
   - **Endpoint URL:**
     ```
     https://SEU-DOMINIO.vercel.app/api/stripe/webhook
     ```
   - **Description:** `PsicoGuest Webhooks`
   - **Events to send:** Selecione:
     - `account.updated`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `checkout.session.completed`
4. Clique em **Add endpoint**

### 3.4 Obter Webhook Secret

1. Após criar o webhook, clique nele
2. Em **Signing secret**, clique em **Reveal**
3. Copie o secret (começa com `whsec_...`)
4. Adicione no Vercel como:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## Parte 4: Criar Planos de Assinatura (Opcional - Futuro)

### 4.1 Criar produtos

1. No dashboard, vá em **Products** → **Add product**
2. Preencha:
   - **Name:** `PsicoGuest - Plano Básico`
   - **Description:** `Plano básico para profissionais`
   - **Pricing model:** Recurring
   - **Price:** R$ 29,90 (ou o valor desejado)
   - **Billing period:** Monthly
3. Clique em **Save product**

4. Repita para outros planos:
   - Plano Intermediário: R$ 59,90/mês
   - Plano Premium: R$ 99,90/mês

### 4.2 Obter IDs dos produtos

1. Após criar, clique em cada produto
2. Copie o **Price ID** (começa com `price_...`)
3. Você usará esses IDs no código para criar assinaturas

### 4.3 Configurar no código (quando implementar)

Você precisará criar uma tabela ou configuração para armazenar os planos:

```typescript
// Exemplo de estrutura (não implementado ainda)
const plans = {
  basic: {
    priceId: 'price_...',
    name: 'Plano Básico',
    price: 29.90,
    features: ['Até 50 pacientes', 'Lembretes básicos']
  },
  // ...
}
```

---

## Parte 5: Testar Stripe Connect

### 5.1 Testar conexão de um profissional

1. Acesse sua aplicação: `https://SEU-DOMINIO.vercel.app`
2. Faça login como profissional
3. Vá em **Dashboard** → **Financeiro**
4. Clique em **Conectar com Stripe**
5. Você será redirecionado para o onboarding do Stripe
6. Complete o formulário (use dados de teste)
7. Após completar, você será redirecionado de volta

### 5.2 Verificar status da conexão

1. No dashboard do Stripe, vá em **Connect** → **Accounts**
2. Você verá a conta conectada do profissional
3. Verifique se está **Active** e com **Charges enabled**

### 5.3 Testar pagamento

1. Crie uma fatura no PsicoGuest
2. Gere link de pagamento
3. Use cartão de teste do Stripe:
   - **Número:** `4242 4242 4242 4242`
   - **Data:** Qualquer data futura
   - **CVC:** Qualquer 3 dígitos
4. Complete o pagamento
5. Verifique se o dinheiro aparece na conta conectada

---

## Parte 6: Configurar Taxas e Comissões

### 6.1 Configurar taxa de plataforma

1. No dashboard, vá em **Settings** → **Connect**
2. Em **Platform settings**, configure:
   - **Application fee:** 2.9% + R$ 0,30 (ou o valor desejado)
   - Isso é a comissão que você recebe por cada transação

### 6.2 Configurar repasse

1. Em **Payout settings**, configure:
   - **Payout schedule:** Daily, Weekly ou Monthly
   - **Minimum payout:** Valor mínimo para repasse

---

## Parte 7: Ativar Modo Live (Produção)

### 7.1 Verificar conta

1. Vá em **Settings** → **Business settings**
2. Complete todas as informações:
   - Dados da empresa
   - Documentos
   - Informações bancárias
   - Verificação de identidade

### 7.2 Ativar modo Live

1. No canto superior direito, clique no toggle **Test mode**
2. Mude para **Live mode**
3. Confirme a mudança

### 7.3 Atualizar chaves no Vercel

1. Obtenha as novas chaves Live
2. Atualize as variáveis de ambiente no Vercel
3. Faça um novo deploy

---

## ✅ Checklist Final

### Configuração Básica
- [ ] Conta Stripe criada
- [ ] Conta ativada e verificada
- [ ] Chaves de API obtidas
- [ ] Variáveis configuradas no Vercel
- [ ] Deploy realizado

### Stripe Connect
- [ ] Stripe Connect ativado
- [ ] Webhook configurado
- [ ] Webhook secret adicionado ao Vercel
- [ ] Teste de conexão realizado
- [ ] Teste de pagamento realizado

### Produção
- [ ] Modo Live ativado
- [ ] Chaves Live configuradas
- [ ] Taxas e comissões configuradas
- [ ] Testes finais realizados

---

## 🔧 Troubleshooting

### Erro: "Stripe não configurado"

**Causa:** Variáveis de ambiente não configuradas.

**Solução:**
1. Verifique se `STRIPE_SECRET_KEY` está no Vercel
2. Confirme que fez um novo deploy após adicionar
3. Verifique se não há espaços extras nas chaves

### Erro: "Invalid API Key"

**Causa:** Chave incorreta ou expirada.

**Solução:**
1. Verifique se copiou a chave completa
2. Confirme se está usando Test keys em Test mode
3. Gere novas chaves se necessário

### Webhook não está recebendo eventos

**Solução:**
1. Verifique se a URL do webhook está correta
2. Confirme que o endpoint está acessível
3. Use o Stripe CLI para testar localmente:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

### Profissional não consegue conectar

**Solução:**
1. Verifique se Stripe Connect está ativado
2. Confirme que está usando Express accounts
3. Verifique os logs no Vercel
4. Teste com dados válidos

---

## 📚 Recursos Adicionais

- [Documentação Stripe Connect](https://stripe.com/docs/connect)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Dashboard](https://dashboard.stripe.com)

---

## 🎉 Pronto!

Agora o Stripe está configurado e pronto para receber pagamentos! Os profissionais podem conectar suas contas e começar a receber pagamentos diretamente.


