# Guia de Configuração do Google OAuth

## Problema: Erro 403 - Access Denied

O erro ocorre porque o app OAuth do Google está em **modo de teste** e só permite acesso a testadores aprovados.

## Solução: Adicionar Testadores

### Passo 1: Acessar Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Selecione o projeto que contém seu OAuth Client ID

### Passo 2: Configurar OAuth Consent Screen

1. No menu lateral, vá em **APIs & Services** → **OAuth consent screen**
2. Verifique se está em modo "Testing" (Teste)
3. Role até a seção **Test users** (Usuários de teste)

### Passo 3: Adicionar Usuários de Teste

1. Clique em **+ ADD USERS**
2. Adicione os emails que precisam acessar:
   - `rodrigomotamata@gmail.com`
   - `lucasuvida@gmail.com`
   - Qualquer outro email que for usar o sistema
3. Clique em **ADD**

### Passo 4: Verificar Redirect URI

Certifique-se de que o Redirect URI está configurado corretamente:

**Para desenvolvimento local:**
```
http://localhost:3000/api/google/callback
```

**Para produção (Vercel):**
```
https://seu-dominio.vercel.app/api/google/callback
```

**Como adicionar:**
1. Vá em **APIs & Services** → **Credentials**
2. Clique no seu **OAuth 2.0 Client ID**
3. Em **Authorized redirect URIs**, adicione:
   - `http://localhost:3000/api/google/callback`
   - `https://seu-dominio.vercel.app/api/google/callback`
4. Clique em **SAVE**

### Passo 5: Verificar Scopes

Os seguintes scopes devem estar configurados:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/userinfo.email`

## Alternativa: Publicar o App (Recomendado para Produção)

Se você quiser que qualquer usuário possa conectar sem precisar adicionar como testador:

1. Vá em **OAuth consent screen**
2. Clique em **PUBLISH APP**
3. Preencha todas as informações solicitadas:
   - App name: PsicoGuest
   - User support email: seu email
   - Developer contact information: seu email
   - Scopes: os scopes listados acima
4. Submeta para revisão do Google (pode levar alguns dias)

**Nota:** Durante a revisão, o app ainda funcionará em modo de teste.

## Variáveis de Ambiente Necessárias

Certifique-se de ter configurado no Vercel:

```
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_REDIRECT_URI=https://seu-dominio.vercel.app/api/google/callback
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```

## Testando

Após adicionar os emails como testadores:

1. Faça logout do Google (se estiver logado)
2. Tente conectar novamente
3. O erro 403 não deve mais aparecer


