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
   - Encontre o **Price ID** (começa com `price_`)
   - Copie e cole no Vercel na variável correspondente

**Exemplo:**
- Produto "Essencial Mensal" → `STRIPE_PRICE_ESSENCIAL_MONTHLY`
- Produto "Essencial Anual" → `STRIPE_PRICE_ESSENCIAL_ANNUAL`
- E assim por diante...

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

### Erro "Price ID não configurado"

- Verifique se todos os 6 Price IDs estão configurados
- Verifique se os nomes das variáveis estão exatamente como listado acima
- Verifique se os produtos foram criados no Stripe corretamente

---

## 📚 Referências

- [Guia de Assinaturas Stripe](./GUIA_ASSINATURAS_STRIPE.md) - Como criar produtos no Stripe
- [Documentação Vercel - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

