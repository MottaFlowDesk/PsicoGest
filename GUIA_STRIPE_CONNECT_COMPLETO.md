# 🔗 Guia Completo: Configurar Stripe Connect para Profissionais

Este guia detalha passo a passo como configurar o Stripe Connect para que os profissionais possam receber pagamentos diretamente através do PsicoGest.

---

## 📋 O que é Stripe Connect?

O Stripe Connect permite que profissionais conectem suas próprias contas Stripe ao PsicoGest, permitindo que:
- ✅ Profissionais recebam pagamentos diretamente
- ✅ Você cobre uma taxa de plataforma (opcional)
- ✅ Pagamentos sejam processados de forma segura
- ✅ Profissionais gerenciem seus próprios pagamentos

---

## 🚀 Passo 1: Ativar Stripe Connect no Dashboard

### 1.1 Acessar Configurações do Connect

1. Acesse o [Stripe Dashboard](https://dashboard.stripe.com)
2. Faça login na sua conta
3. No menu lateral, vá em **Settings** → **Connect**

### 1.2 Ativar Connect

1. Se você não vê a opção "Connect", você precisa:
   - Completar o onboarding inicial da sua conta Stripe
   - Verificar sua identidade (se necessário)
   - Ativar sua conta completamente

2. Se já vê a opção, clique em **Get started** ou **Activate Connect**

3. Escolha o tipo de conta:
   - ✅ **Express accounts** (Recomendado) - Mais simples para profissionais
   - ⚠️ Standard accounts - Mais controle, mas mais complexo

4. Complete as configurações iniciais:
   - **Business type:** Individual ou Company (depende do seu caso)
   - **Country:** Brazil (BR)
   - **Currency:** BRL (Real brasileiro)

5. Clique em **Save** ou **Continue**

### 1.3 ⚠️ IMPORTANTE: Completar Perfil da Plataforma

**Este passo é OBRIGATÓRIO antes de criar contas Connect!**

1. Ainda em **Settings** → **Connect**, procure por **Platform profile** ou acesse diretamente:
   ```
   https://dashboard.stripe.com/settings/connect/platform-profile
   ```

2. Você verá uma página sobre "Responsabilities of managing losses for connected accounts"

3. **Leia cuidadosamente** as informações sobre:
   - Responsabilidades de gerenciar perdas
   - Termos e condições do Stripe Connect
   - Políticas de segurança

4. Marque a caixa de seleção indicando que você:
   - ✅ Entendeu as responsabilidades
   - ✅ Aceita os termos
   - ✅ Concorda em gerenciar perdas para contas conectadas

5. Clique em **Save** ou **Accept**

**⚠️ Sem completar este passo, você receberá o erro:**
```
"Please review the responsibilities of managing losses for connected accounts"
```

**📖 Para mais detalhes, veja:** [GUIA_STRIPE_CONNECT_PERFIL_PLATAFORMA.md](GUIA_STRIPE_CONNECT_PERFIL_PLATAFORMA.md)

---

## ⚙️ Passo 2: Configurar Branding (Opcional mas Recomendado)

### 2.1 Personalizar Aparência

1. No Stripe Dashboard, vá em **Settings** → **Branding**
2. Configure:
   - **Logo:** Faça upload do logo do PsicoGest
   - **Primary color:** Cor principal da marca (ex: #6366f1)
   - **Secondary color:** Cor secundária (opcional)
3. Clique em **Save**

**Por quê?** Isso faz com que a tela de onboarding do Stripe mostre a marca do PsicoGest, dando mais confiança aos profissionais.

---

## 🔗 Passo 3: Configurar URLs de Redirecionamento

### 3.1 URLs Necessárias

O sistema precisa das seguintes URLs configuradas:

1. **URL de retorno após onboarding:**
   ```
   https://SEU-DOMINIO.vercel.app/api/stripe/connect/callback
   ```

2. **URL de refresh (se o usuário sair):**
   ```
   https://SEU-DOMINIO.vercel.app/dashboard/financial?stripe=refresh
   ```

**Substitua `SEU-DOMINIO.vercel.app` pelo seu domínio real do Vercel.**

### 3.2 Verificar no Código

As URLs já estão configuradas no código em:
- `app/api/stripe/connect/route.ts` (linhas 37-38 e 111-112)

Certifique-se de que `NEXT_PUBLIC_APP_URL` está configurado no Vercel:
```
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```

---

## 🔔 Passo 4: Configurar Webhooks

### 4.1 Criar Webhook Endpoint

1. No Stripe Dashboard, vá em **Developers** → **Webhooks**
2. Clique em **Add endpoint**
3. Preencha:
   - **Endpoint URL:**
     ```
     https://SEU-DOMINIO.vercel.app/api/stripe/webhook
     ```
   - **Description:** `PsicoGest Webhooks - Connect e Assinaturas`
   - **Version:** Deixe a versão mais recente

4. Em **Events to send**, selecione os seguintes eventos:

   **Para Stripe Connect:**
   - ✅ `account.updated` - Quando uma conta Connect é atualizada

   **Para Assinaturas:**
   - ✅ `checkout.session.completed` - Quando um checkout é concluído
   - ✅ `customer.subscription.created` - Quando uma assinatura é criada
   - ✅ `customer.subscription.updated` - Quando uma assinatura é atualizada
   - ✅ `customer.subscription.deleted` - Quando uma assinatura é cancelada

   **Para Pagamentos:**
   - ✅ `payment_intent.succeeded` - Quando um pagamento é bem-sucedido
   - ✅ `payment_intent.payment_failed` - Quando um pagamento falha

5. Clique em **Add endpoint**

### 4.2 Obter Webhook Secret

1. Após criar o webhook, clique nele para abrir os detalhes
2. Na seção **Signing secret**, clique em **Reveal**
3. Copie o secret (começa com `whsec_...`)
4. **IMPORTANTE:** Guarde este secret, você precisará dele no próximo passo

---

## 🔐 Passo 5: Configurar Variáveis de Ambiente no Vercel

### 5.1 Acessar Configurações

1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto **PsicoGest**
3. Vá em **Settings** → **Environment Variables**

### 5.2 Adicionar Variáveis

Adicione ou verifique as seguintes variáveis:

#### Variáveis Obrigatórias:

```
STRIPE_SECRET_KEY=sk_test_... (ou sk_live_...)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (ou pk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```

#### Como Obter:

**STRIPE_SECRET_KEY:**
1. No Stripe Dashboard, vá em **Developers** → **API keys**
2. Copie a **Secret key** (começa com `sk_test_` ou `sk_live_`)

**NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:**
1. Na mesma página, copie a **Publishable key** (começa com `pk_test_` ou `pk_live_`)

**STRIPE_WEBHOOK_SECRET:**
1. Use o secret que você copiou no Passo 4.2

**NEXT_PUBLIC_APP_URL:**
1. Use o domínio do seu projeto no Vercel (ex: `https://psicogest-ebon.vercel.app`)

### 5.3 Configurar Ambientes

Para cada variável:
1. Selecione os ambientes onde aplicar:
   - ✅ **Production** (produção)
   - ✅ **Preview** (previews de PRs)
   - ✅ **Development** (opcional, para desenvolvimento local)

2. Clique em **Save**

### 5.4 Fazer Redeploy

**IMPORTANTE:** Após adicionar/atualizar variáveis:
1. Vá em **Deployments**
2. Clique nos **3 pontos** ao lado do último deploy
3. Selecione **Redeploy**
4. Aguarde o deploy concluir

---

## 💰 Passo 6: Configurar Taxas e Comissões (Opcional)

### 6.1 Configurar Taxa de Plataforma

Se você quiser cobrar uma comissão por cada transação:

1. No Stripe Dashboard, vá em **Settings** → **Connect**
2. Em **Platform settings**, configure:
   - **Application fee:** 
     - Percentual: 2.9% (ou o valor desejado)
     - Fixo: R$ 0,30 (ou o valor desejado)
   - Ou apenas um valor fixo

3. Clique em **Save**

**Exemplo:** Se um profissional receber R$ 100,00:
- Taxa Stripe: ~R$ 3,90 (3,9%)
- Sua comissão: R$ 2,90 + R$ 0,30 = R$ 3,20
- Profissional recebe: R$ 100,00 - R$ 3,90 - R$ 3,20 = R$ 92,90

### 6.2 Configurar Repasse

1. Em **Settings** → **Connect** → **Payout settings**
2. Configure:
   - **Payout schedule:** 
     - Daily (diário)
     - Weekly (semanal)
     - Monthly (mensal)
   - **Minimum payout:** Valor mínimo para repasse (ex: R$ 10,00)

---

## ✅ Passo 7: Testar a Integração

### 7.1 Testar Conexão de Profissional

1. Acesse sua aplicação: `https://SEU-DOMINIO.vercel.app`
2. Faça login como profissional
3. Vá em **Dashboard** → **Financeiro** (ou onde estiver o botão de conectar)
4. Clique em **Conectar com Stripe** ou **Configurar**
5. Você será redirecionado para o onboarding do Stripe
6. Complete o formulário usando dados de teste:
   - **Email:** Seu email de teste
   - **CPF:** Use um CPF de teste (ex: 000.000.000-00)
   - **Telefone:** Qualquer número válido
   - **Endereço:** Qualquer endereço válido
   - **Dados bancários:** Use dados de teste do Stripe

7. Após completar, você será redirecionado de volta para o PsicoGest
8. Verifique se aparece "Conectado" ou status similar

### 7.2 Verificar no Stripe Dashboard

1. No Stripe Dashboard, vá em **Connect** → **Accounts**
2. Você deve ver a conta conectada do profissional
3. Verifique se está:
   - ✅ **Active** (ativa)
   - ✅ **Charges enabled** (pagamentos habilitados)
   - ✅ **Payouts enabled** (saques habilitados)

### 7.3 Testar Pagamento (Opcional)

Se você já tem a funcionalidade de pagamentos implementada:

1. Crie uma fatura no PsicoGest
2. Gere link de pagamento
3. Use cartão de teste do Stripe:
   - **Número:** `4242 4242 4242 4242`
   - **Data:** Qualquer data futura (ex: 12/25)
   - **CVC:** Qualquer 3 dígitos (ex: 123)
   - **CEP:** Qualquer CEP válido (ex: 12345-678)
4. Complete o pagamento
5. Verifique se o dinheiro aparece na conta conectada do profissional

---

## 🔍 Passo 8: Verificar Logs e Debugging

### 8.1 Verificar Logs do Vercel

Se algo não estiver funcionando:

1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Deployments** → Clique no último deploy
4. Vá em **Functions** → Procure por `/api/stripe/connect`
5. Veja os logs para identificar erros

### 8.2 Verificar Logs do Stripe

1. No Stripe Dashboard, vá em **Developers** → **Logs**
2. Veja os eventos recentes
3. Procure por erros ou eventos relacionados ao Connect

### 8.3 Verificar Webhooks

1. No Stripe Dashboard, vá em **Developers** → **Webhooks**
2. Clique no webhook configurado
3. Veja a aba **Events** para ver se os eventos estão sendo recebidos
4. Se algum evento falhar, clique nele para ver os detalhes do erro

---

## 📋 Checklist Final

Marque conforme completar:

### Configuração Básica
- [ ] Conta Stripe criada e ativada
- [ ] Stripe Connect ativado
- [ ] Tipo de conta escolhido (Express)
- [ ] **Perfil da plataforma completado (OBRIGATÓRIO)**
- [ ] Branding configurado (opcional)

### Variáveis de Ambiente
- [ ] `STRIPE_SECRET_KEY` configurada no Vercel
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` configurada no Vercel
- [ ] `STRIPE_WEBHOOK_SECRET` configurado no Vercel
- [ ] `NEXT_PUBLIC_APP_URL` configurada no Vercel
- [ ] Redeploy realizado após configurar variáveis

### Webhooks
- [ ] Webhook endpoint criado
- [ ] Eventos selecionados corretamente
- [ ] Webhook secret copiado e configurado
- [ ] Webhook testado (verificar eventos recebidos)

### Testes
- [ ] Teste de conexão de profissional realizado
- [ ] Conta Connect verificada no Stripe Dashboard
- [ ] Status de conexão verificado no PsicoGest
- [ ] Teste de pagamento realizado (se aplicável)

### Configurações Avançadas (Opcional)
- [ ] Taxa de plataforma configurada
- [ ] Repasse configurado
- [ ] Testes finais realizados

---

## 🔧 Troubleshooting

### Erro: "Stripe Connect não está habilitado"

**Solução:**
1. Acesse Stripe Dashboard → **Settings** → **Connect**
2. Siga o processo de ativação
3. Complete todas as etapas necessárias

### Erro: "Please review the responsibilities of managing losses"

**Causa:** Perfil da plataforma não foi completado.

**Solução:**
1. Acesse: https://dashboard.stripe.com/settings/connect/platform-profile
2. Leia e aceite as responsabilidades
3. Marque a caixa de seleção
4. Clique em **Save** ou **Accept**
5. Tente conectar novamente

**📖 Guia detalhado:** [GUIA_STRIPE_CONNECT_PERFIL_PLATAFORMA.md](GUIA_STRIPE_CONNECT_PERFIL_PLATAFORMA.md)

### Erro: "Email do profissional inválido"

**Solução:**
1. Verifique o email no perfil do profissional
2. Certifique-se de que é um email válido
3. Atualize se necessário

### Erro: "Stripe não configurado"

**Solução:**
1. Verifique se `STRIPE_SECRET_KEY` está no Vercel
2. Confirme que fez um novo deploy após adicionar
3. Verifique se não há espaços extras nas chaves

### Webhook não está recebendo eventos

**Solução:**
1. Verifique se a URL do webhook está correta
2. Confirme que o endpoint está acessível (não retorna 404)
3. Verifique se `STRIPE_WEBHOOK_SECRET` está configurado
4. Teste o webhook usando o Stripe CLI (opcional):
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

### Profissional não consegue conectar

**Solução:**
1. Verifique se Stripe Connect está ativado
2. Confirme que está usando Express accounts
3. Verifique os logs no Vercel
4. Teste com dados válidos
5. Verifique se o email do profissional está correto

---

## 📚 Recursos Adicionais

- [Documentação Stripe Connect](https://stripe.com/docs/connect)
- [Stripe Connect Express Accounts](https://stripe.com/docs/connect/express-accounts)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Dashboard](https://dashboard.stripe.com)

---

## 🎉 Pronto!

Agora o Stripe Connect está configurado e pronto para uso! Os profissionais podem conectar suas contas e começar a receber pagamentos diretamente através do PsicoGest.

**Próximos passos:**
- Testar a conexão com um profissional
- Verificar se os pagamentos estão funcionando
- Configurar taxas e comissões (se necessário)
- Ativar modo Live quando estiver pronto para produção

