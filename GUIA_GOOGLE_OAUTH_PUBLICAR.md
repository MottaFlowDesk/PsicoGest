# Guia Completo: Publicar App no Google OAuth para Acesso Público

Este guia te ajudará a publicar seu app OAuth no Google para que qualquer pessoa possa fazer a integração com Google Calendar e Gmail, sem precisar adicionar como testador.

---

## 📋 Pré-requisitos

1. Conta no Google Cloud Platform
2. Projeto criado no Google Cloud
3. OAuth Client ID já criado
4. App em modo de teste funcionando

---

## Parte 1: Preparar Informações do App

### 1.1 Informações necessárias

Antes de publicar, você precisará ter:

- **Nome do app:** PsicoGest
- **Email de suporte:** Seu email profissional
- **Email do desenvolvedor:** Seu email
- **Logo do app:** Arquivo PNG ou JPG (mínimo 120x120px)
- **Política de privacidade:** URL da página de privacidade
- **Termos de serviço:** URL dos termos (opcional)
- **Homepage:** URL do site (https://seu-dominio.vercel.app)

### 1.2 Criar páginas necessárias (se não tiver)

Você precisa ter pelo menos uma página de Política de Privacidade:

1. Crie o arquivo: `app/privacy/page.tsx`
2. Adicione conteúdo sobre privacidade e uso de dados
3. Publique no Vercel
4. Anote a URL: `https://seu-dominio.vercel.app/privacy`

---

## Parte 2: Configurar OAuth Consent Screen

### 2.1 Acessar configurações

1. Acesse: https://console.cloud.google.com/
2. Selecione seu projeto
3. No menu lateral, vá em **APIs & Services** → **OAuth consent screen**

### 2.2 Preencher informações do app

#### User Type
- Selecione **External** (para permitir qualquer usuário)
- Clique em **Create**

#### App Information
Preencha todos os campos:

- **App name:** `PsicoGest`
- **User support email:** Seu email profissional
- **App logo:** Faça upload do logo (PNG ou JPG, mínimo 120x120px)
- **Application home page:** `https://seu-dominio.vercel.app`
- **Privacy policy link:** `https://seu-dominio.vercel.app/privacy`
- **Terms of service link:** `https://seu-dominio.vercel.app/terms` (opcional)
- **Authorized domains:** Adicione seu domínio (ex: `vercel.app` ou seu domínio customizado)

#### Developer contact information
- **Email addresses:** Seu email profissional
- Clique em **Save and Continue**

### 2.3 Configurar Scopes

1. Na seção **Scopes**, clique em **Add or Remove Scopes**
2. Selecione os seguintes scopes:

   **Scopes necessários:**
   - `https://www.googleapis.com/auth/calendar` (Read/write access to Calendar)
   - `https://www.googleapis.com/auth/calendar.readonly` (Read-only access to Calendar)
   - `https://www.googleapis.com/auth/gmail.send` (Send email on your behalf)
   - `https://www.googleapis.com/auth/userinfo.email` (See your primary Google Account email address)

3. Clique em **Update**
4. Clique em **Save and Continue**

### 2.4 Adicionar Test Users (Opcional - Temporário)

Durante a revisão, você ainda pode adicionar test users:

1. Em **Test users**, clique em **+ ADD USERS**
2. Adicione emails que precisam testar durante a revisão
3. Clique em **ADD**

### 2.5 Revisar e Publicar

1. Revise todas as informações
2. Clique em **BACK TO DASHBOARD**
3. No topo da página, você verá um banner amarelo
4. Clique em **PUBLISH APP**
5. Confirme a publicação

---

## Parte 3: Submeter para Revisão do Google

### 3.1 Quando a revisão é necessária

O Google pode solicitar revisão se você usar scopes sensíveis. Os scopes que você está usando (`calendar` e `gmail.send`) são considerados sensíveis.

### 3.2 Preparar para revisão

1. **Vídeo de demonstração (recomendado):**
   - Grave um vídeo mostrando:
     - Como o usuário conecta o Google
     - Como o app usa o Calendar
     - Como o app envia emails
   - Faça upload no YouTube (privado) e compartilhe o link

2. **Documentação:**
   - Prepare uma explicação clara de como o app usa cada scope
   - Exemplo:
     ```
     O PsicoGest usa o Google Calendar para:
     - Sincronizar agendamentos de consultas
     - Criar eventos automaticamente
     - Verificar disponibilidade
     
     O PsicoGest usa o Gmail para:
     - Enviar lembretes de consultas aos pacientes
     - Enviar confirmações de agendamento
     ```

### 3.3 Submeter para revisão

1. No OAuth consent screen, você verá um botão **Submit for verification**
2. Clique nele
3. Preencha o formulário:
   - **App category:** Business/Productivity
   - **App purpose:** Descreva o propósito do app
   - **How does your app use Google user data:** Explique o uso de cada scope
   - **Video link:** Link do vídeo de demonstração (se tiver)
4. Clique em **Submit**

### 3.4 Tempo de revisão

- **Tempo estimado:** 1-7 dias úteis
- Durante a revisão, o app continua funcionando em modo de teste
- Você receberá emails sobre o status da revisão

---

## Parte 4: Verificar Redirect URIs

### 4.1 Configurar URIs autorizados

1. Vá em **APIs & Services** → **Credentials**
2. Clique no seu **OAuth 2.0 Client ID**
3. Em **Authorized redirect URIs**, adicione:

   **Para desenvolvimento:**
   ```
   http://localhost:3000/api/google/callback
   ```

   **Para produção:**
   ```
   https://seu-dominio.vercel.app/api/google/callback
   ```

4. Clique em **SAVE**

### 4.2 Verificar variáveis de ambiente

No Vercel, certifique-se de ter:

```
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_REDIRECT_URI=https://seu-dominio.vercel.app/api/google/callback
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```

---

## Parte 5: Testar Após Publicação

### 5.1 Testar com conta não testadora

1. Use uma conta Google que NÃO está na lista de test users
2. Tente conectar o Google no PsicoGest
3. Deve funcionar sem erro 403

### 5.2 Verificar permissões

1. Após conectar, verifique se:
   - Eventos são criados no Google Calendar
   - Emails são enviados via Gmail
   - Sincronização funciona corretamente

---

## Parte 6: Após Aprovação

### 6.1 Status da revisão

Você receberá um email quando a revisão for concluída:

- **Aprovado:** App está público e qualquer um pode usar
- **Rejeitado:** Você receberá feedback e pode corrigir e reenviar

### 6.2 Remover test users (opcional)

Após aprovação, você pode remover os test users se quiser, mas não é necessário.

---

## ✅ Checklist Final

### Preparação
- [ ] Logo do app preparado (120x120px mínimo)
- [ ] Página de privacidade criada
- [ ] Informações do app coletadas
- [ ] Vídeo de demonstração gravado (opcional)

### Configuração
- [ ] OAuth consent screen configurado
- [ ] Scopes adicionados corretamente
- [ ] Redirect URIs configurados
- [ ] Variáveis de ambiente atualizadas no Vercel

### Publicação
- [ ] App publicado (modo de teste removido)
- [ ] Submetido para revisão (se necessário)
- [ ] Email de confirmação recebido

### Testes
- [ ] Testado com conta não testadora
- [ ] Integração funcionando corretamente
- [ ] Sem erros 403

---

## 🔧 Troubleshooting

### Erro 403 ainda aparece após publicação

**Causa:** App ainda em revisão ou não publicado corretamente.

**Solução:**
1. Verifique se clicou em **PUBLISH APP**
2. Confirme que não está mais em modo de teste
3. Aguarde a conclusão da revisão (se necessário)
4. Verifique o status no dashboard

### Revisão rejeitada

**Solução:**
1. Leia o feedback do Google
2. Corrija os problemas apontados
3. Adicione mais informações/documentação
4. Reenvie para revisão

### Scopes não aparecem

**Solução:**
1. Verifique se adicionou os scopes no OAuth consent screen
2. Confirme que salvou as alterações
3. Aguarde alguns minutos para propagação

---

## 📚 Recursos Adicionais

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth Consent Screen](https://support.google.com/cloud/answer/10311615)
- [Verification Process](https://support.google.com/cloud/answer/9110914)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## 🎉 Pronto!

Agora seu app está publicado e qualquer pessoa pode fazer a integração com Google Calendar e Gmail, sem precisar ser adicionada como testador!

**Nota:** Durante a revisão (se necessária), o app ainda funcionará em modo de teste. Após aprovação, estará totalmente público.


