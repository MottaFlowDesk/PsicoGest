# 🔧 Guia: Configurar Variáveis de Ambiente no Vercel

O erro "Stripe não configurado" ocorre porque as variáveis de ambiente do Stripe não estão configuradas no Vercel.

---

## 📋 Variáveis Necessárias

Você precisa configurar as seguintes variáveis de ambiente no Vercel:

### 1. **Stripe - Obrigatórias**

```
STRIPE_SECRET_KEY=sk_test_... (ou sk_live_... em produção)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. **Stripe Price IDs - Obrigatórias**

Após criar os produtos no Stripe (seguindo o `GUIA_ASSINATURAS_STRIPE.md`), configure:

```
STRIPE_PRICE_ESSENCIAL_MONTHLY=price_...
STRIPE_PRICE_ESSENCIAL_ANNUAL=price_...
STRIPE_PRICE_PROFISSIONAL_MONTHLY=price_...
STRIPE_PRICE_PROFISSIONAL_ANNUAL=price_...
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_ANNUAL=price_...
```

---

## 🚀 Como Configurar no Vercel

### Passo 1: Acessar Configurações do Projeto

1. Acesse o [Dashboard do Vercel](https://vercel.com/dashboard)
2. Selecione seu projeto **PsicoGest**
3. Vá em **Settings** → **Environment Variables**

### Passo 2: Adicionar Variáveis

Para cada variável:

1. Clique em **Add New**
2. Digite o **Name** (ex: `STRIPE_SECRET_KEY`)
3. Digite o **Value** (ex: `sk_test_51...`)
4. Selecione os **Environments** onde aplicar:
   - ✅ **Production** (produção)
   - ✅ **Preview** (previews de PRs)
   - ✅ **Development** (opcional, para desenvolvimento local)
5. Clique em **Save**

### Passo 3: Obter Valores do Stripe

#### A. STRIPE_SECRET_KEY

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com)
2. Vá em **Developers** → **API keys**
3. Copie a **Secret key** (começa com `sk_test_` para teste ou `sk_live_` para produção)
4. Cole no Vercel como `STRIPE_SECRET_KEY`

#### B. STRIPE_WEBHOOK_SECRET

1. No Stripe Dashboard, vá em **Developers** → **Webhooks**
2. Clique no webhook configurado (ou crie um novo)
3. Na seção **Signing secret**, clique em **Reveal**
4. Copie o secret (começa com `whsec_`)
5. Cole no Vercel como `STRIPE_WEBHOOK_SECRET`

#### C. Price IDs

1. No Stripe Dashboard, vá em **Products**
2. Para cada produto criado:
   - Clique no produto
   - Na seção **Pricing**, você verá os preços criados
   - Clique no preço (mensal ou anual)
   - Na página do preço, encontre o **Price ID** (começa com `price_`)
   - **IMPORTANTE**: Copie o Price ID completo, começando com `price_`
   - Cole no Vercel na variável correspondente

**Exemplo:**
- Produto "Essencial Mensal" → `STRIPE_PRICE_ESSENCIAL_MONTHLY` = `price_1ABC...`
- Produto "Essencial Anual" → `STRIPE_PRICE_ESSENCIAL_ANNUAL` = `price_1XYZ...`
- E assim por diante...

**⚠️ Erro comum:**
- Se você ver o erro "No such price: price_1SpCAvDdXncmXPx3MqZwVKFD", significa que:
  1. O Price ID não existe no Stripe (produto não foi criado)
  2. O Price ID foi copiado incorretamente
  3. O Price ID é de um ambiente diferente (test vs live)

**Como verificar:**
1. Acesse o Stripe Dashboard
2. Vá em **Products**
3. Verifique se todos os 6 produtos foram criados (3 planos × 2 períodos)
4. Para cada produto, verifique se o Price ID na variável de ambiente corresponde ao Price ID no Stripe

---

## ✅ Checklist de Configuração

Marque conforme configurar:

- [ ] `STRIPE_SECRET_KEY` configurada
- [ ] `STRIPE_WEBHOOK_SECRET` configurada
- [ ] `STRIPE_PRICE_ESSENCIAL_MONTHLY` configurada
- [ ] `STRIPE_PRICE_ESSENCIAL_ANNUAL` configurada
- [ ] `STRIPE_PRICE_PROFISSIONAL_MONTHLY` configurada
- [ ] `STRIPE_PRICE_PROFISSIONAL_ANNUAL` configurada
- [ ] `STRIPE_PRICE_PREMIUM_MONTHLY` configurada
- [ ] `STRIPE_PRICE_PREMIUM_ANNUAL` configurada

---

## 🔄 Após Configurar

1. **Redeploy obrigatório**: Após adicionar as variáveis, você precisa fazer um novo deploy
   - Vá em **Deployments**
   - Clique nos **3 pontos** do último deploy
   - Selecione **Redeploy**
   - Ou faça um novo commit para trigger automático

2. **Verificar**: Após o deploy, teste novamente:
   - Acesse a landing page
   - Clique em um plano
   - Deve redirecionar para o Stripe Checkout (não mais erro 503)

---

## ⚠️ Importante

- **Nunca** commite essas variáveis no Git
- Use **Secret keys** diferentes para teste (`sk_test_`) e produção (`sk_live_`)
- Configure o webhook no Stripe apontando para: `https://seu-dominio.vercel.app/api/stripe/webhook`
- O webhook secret muda se você recriar o webhook no Stripe

---

## 🆘 Problemas Comuns

### Erro 503 continua após configurar

1. Verifique se fez **Redeploy** após adicionar as variáveis
2. Verifique se as variáveis estão configuradas para **Production**
3. Verifique se não há espaços extras nos valores
4. Verifique se os Price IDs estão corretos (começam com `price_`)

### Erro "No such price: price_1SpCAvDdXncmXPx3MqZwVKFD"

Este erro significa que o Price ID não existe no Stripe. **Soluções:**

1. **Verificar se o produto foi criado:**
   - Acesse Stripe Dashboard → **Products**
   - Verifique se o produto existe
   - Se não existir, crie seguindo o `GUIA_ASSINATURAS_STRIPE.md`

2. **Verificar se o Price ID está correto:**
   - No Stripe Dashboard, vá em **Products**
   - Clique no produto
   - Na seção **Pricing**, clique no preço (mensal ou anual)
   - Na página do preço, copie o **Price ID** completo
   - Verifique se corresponde ao valor na variável de ambiente no Vercel

3. **Verificar ambiente (Test vs Live):**
   - Se estiver usando `sk_test_`, use Price IDs de **Test mode**
   - Se estiver usando `sk_live_`, use Price IDs de **Live mode**
   - No Stripe Dashboard, verifique se está no modo correto (toggle no canto superior direito)

4. **Verificar se copiou o Price ID completo:**
   - O Price ID deve começar com `price_`
   - Deve ter aproximadamente 30-40 caracteres
   - Exemplo: `price_1SpCAvDdXncmXPx3MqZwVKFD` (este é um exemplo, use o seu)

5. **Recriar o produto (se necessário):**
   - Se o Price ID não existir mais, recrie o produto no Stripe
   - Copie o novo Price ID
   - Atualize a variável de ambiente no Vercel
   - Faça **Redeploy**

### Erro "Price ID não configurado"

- Verifique se todos os 6 Price IDs estão configurados
- Verifique se os nomes das variáveis estão exatamente como listado acima
- Verifique se os produtos foram criados no Stripe corretamente
- Verifique se não há espaços extras antes ou depois do Price ID

---

## 📚 Referências

- [Guia de Assinaturas Stripe](./GUIA_ASSINATURAS_STRIPE.md) - Como criar produtos no Stripe
- [Documentação Vercel - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

