# ⚠️ Resolver: "Please review the responsibilities of managing losses"

Este erro ocorre quando você tenta criar uma conta Stripe Connect sem ter completado o perfil da plataforma no Stripe.

---

## 🔍 O Problema

O Stripe exige que você revise e aceite as responsabilidades de gerenciar perdas para contas conectadas antes de poder criar contas Connect.

---

## ✅ Solução Rápida (5 minutos)

### Passo 1: Acessar o Perfil da Plataforma

1. Acesse o [Stripe Dashboard](https://dashboard.stripe.com)
2. Faça login na sua conta
3. No menu lateral, vá em **Settings** → **Connect**
4. Clique em **Platform profile** ou acesse diretamente:
   ```
   https://dashboard.stripe.com/settings/connect/platform-profile
   ```

### Passo 2: Revisar e Aceitar as Responsabilidades

1. Você verá uma página com informações sobre:
   - Responsabilidades de gerenciar perdas
   - Termos e condições do Stripe Connect
   - Políticas de segurança

2. **Leia cuidadosamente** as informações apresentadas

3. Marque a caixa de seleção indicando que você:
   - ✅ Entendeu as responsabilidades
   - ✅ Aceita os termos
   - ✅ Concorda em gerenciar perdas para contas conectadas

4. Clique em **Save** ou **Continue** ou **Accept** (o botão pode variar)

### Passo 3: Verificar se Foi Salvo

1. Após salvar, você deve ver uma mensagem de confirmação
2. A página deve mostrar que o perfil está completo
3. Você pode verificar se há algum campo pendente

### Passo 4: Testar Novamente

1. Volte para o PsicoGuest
2. Tente conectar o Stripe novamente
3. O erro deve ter sido resolvido

---

## 📋 Informações Importantes

### O que são "responsabilidades de gerenciar perdas"?

Quando você usa Stripe Connect, você se torna responsável por:
- **Chargebacks:** Se um cliente contestar um pagamento, você pode ser responsável
- **Fraudes:** Se houver fraude em uma conta conectada, você pode ser responsável
- **Reembolsos:** Você pode precisar gerenciar reembolsos para contas conectadas

### Por que o Stripe exige isso?

O Stripe precisa garantir que você entende as responsabilidades antes de permitir que você crie contas conectadas. Isso protege tanto você quanto o Stripe.

### Isso afeta minha conta?

- ✅ **Não afeta** sua conta Stripe principal
- ✅ **Não afeta** pagamentos diretos na sua conta
- ⚠️ **Apenas afeta** contas Connect que você criar
- ⚠️ Você se torna responsável por gerenciar essas contas

---

## 🔧 Se o Erro Persistir

### Verificar Status do Perfil

1. Acesse: https://dashboard.stripe.com/settings/connect/platform-profile
2. Verifique se há campos pendentes
3. Complete todos os campos obrigatórios

### Verificar Configurações do Connect

1. Acesse: **Settings** → **Connect**
2. Verifique se o Stripe Connect está completamente ativado
3. Certifique-se de que não há etapas pendentes no onboarding

### Verificar Modo (Test vs Live)

1. No canto superior direito do Stripe Dashboard, verifique se está no modo correto:
   - **Test mode** para desenvolvimento
   - **Live mode** para produção
2. Certifique-se de completar o perfil no modo que você está usando

### Contatar Suporte do Stripe

Se o problema persistir após seguir todos os passos:

1. Acesse: https://support.stripe.com
2. Entre em contato com o suporte
3. Mencione o erro específico: "Please review the responsibilities of managing losses for connected accounts"

---

## ✅ Checklist

Marque conforme completar:

- [ ] Acessei o perfil da plataforma no Stripe
- [ ] Li e entendi as responsabilidades
- [ ] Aceitei os termos e condições
- [ ] Salvei as configurações
- [ ] Verifiquei que o perfil está completo
- [ ] Testei novamente a conexão no PsicoGuest
- [ ] A conexão funcionou sem erros

---

## 🎉 Pronto!

Após completar o perfil da plataforma, você poderá criar contas Stripe Connect sem problemas. Tente conectar novamente no PsicoGuest!

---

## 📚 Links Úteis

- [Stripe Connect Platform Profile](https://dashboard.stripe.com/settings/connect/platform-profile)
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Support](https://support.stripe.com)

