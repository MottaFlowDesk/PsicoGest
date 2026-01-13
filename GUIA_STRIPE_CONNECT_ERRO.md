# 🔧 Guia: Resolver Erro ao Conectar Stripe Connect

Se você está recebendo erro 500 ao tentar conectar sua conta Stripe, siga este guia.

---

## ⚠️ Erro 500 ao Conectar

### Possíveis Causas

1. **Stripe Connect não está habilitado**
2. **Email do profissional inválido**
3. **Stripe não configurado corretamente**
4. **Problema ao criar conta Connect**

---

## ✅ Solução Passo a Passo

### 1. Habilitar Stripe Connect

**IMPORTANTE:** O Stripe Connect precisa estar habilitado na sua conta Stripe.

1. Acesse o [Stripe Dashboard](https://dashboard.stripe.com)
2. Vá em **Settings** → **Connect**
3. Se você não vir a opção "Connect", você precisa:
   - Completar o onboarding da sua conta Stripe
   - Verificar sua identidade (se necessário)
   - Ativar sua conta Stripe completamente

4. Se já estiver habilitado, verifique se está no modo correto:
   - **Test mode** para desenvolvimento
   - **Live mode** para produção

### 2. Verificar Configuração no Vercel

Certifique-se de que as seguintes variáveis estão configuradas:

```
STRIPE_SECRET_KEY=sk_test_... (ou sk_live_...)
```

**Importante:** 
- Use `sk_test_` para Test mode
- Use `sk_live_` para Live mode
- O Stripe Connect funciona em ambos os modos

### 3. Verificar Email do Profissional

O erro pode ocorrer se o email do profissional estiver inválido:

1. Acesse o dashboard do PsicoGest
2. Vá em **Configurações** → **Perfil**
3. Verifique se o email está correto e válido
4. Se necessário, atualize o email

### 4. Verificar Logs do Vercel

Após o deploy com as melhorias, os logs mostrarão mais detalhes:

1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Deployments** → Clique no último deploy
4. Vá em **Functions** → Procure por `/api/stripe/connect`
5. Veja os logs para identificar o erro específico

---

## 🔍 Mensagens de Erro Comuns

### "Stripe Connect não está habilitado"

**Solução:**
1. Acesse Stripe Dashboard → **Settings** → **Connect**
2. Siga o processo de ativação do Stripe Connect
3. Complete todas as etapas necessárias

### "Email do profissional inválido"

**Solução:**
1. Verifique o email no perfil do profissional
2. Certifique-se de que é um email válido
3. Atualize se necessário

### "Stripe não configurado"

**Solução:**
1. Configure `STRIPE_SECRET_KEY` no Vercel
2. Faça redeploy
3. Teste novamente

---

## 📋 Checklist

- [ ] Stripe Connect habilitado no Stripe Dashboard
- [ ] `STRIPE_SECRET_KEY` configurada no Vercel
- [ ] Email do profissional válido
- [ ] Redeploy feito após configurações
- [ ] Testado novamente

---

## 🆘 Ainda com Problemas?

1. **Verifique os logs do Vercel** para ver o erro específico
2. **Verifique o console do navegador** para mensagens de erro detalhadas
3. **Verifique o Stripe Dashboard** → **Logs** para ver erros do Stripe

Após o deploy com as melhorias, os erros mostrarão mais detalhes sobre o que está falhando.

