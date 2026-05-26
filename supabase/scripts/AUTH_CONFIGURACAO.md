# Configuração de autenticação (Supabase)

## Erro: “senha cadastrada não funciona” no login

Causa mais comum: **confirmação de e-mail ativa** no Supabase. A conta é criada, mas o login só funciona **depois** de clicar no link do e-mail.

### O que fazer

1. Abra o e-mail de confirmação do Supabase (verifique **spam**).
2. Clique no link → deve abrir `http://localhost:3000/auth/confirm?...`
3. Entre em `/login` com o **mesmo e-mail e senha** do cadastro.

### URLs obrigatórias no Supabase

**Authentication → URL Configuration**

| Campo | Valor (dev) |
|-------|-------------|
| Site URL | `http://localhost:3000` |
| Redirect URLs | `http://localhost:3000/auth/confirm` |
| | `http://localhost:3000/auth/confirm/**` |
| | `http://localhost:3000/reset-password` |

### Desenvolvimento local (sem confirmar e-mail)

**Authentication → Providers → Email** → desative **“Confirm email”**.

Assim, após o cadastro você já entra direto no onboarding (sessão imediata).

### Produção (Vercel)

Adicione também:

`https://SEU-DOMINIO.vercel.app/auth/confirm`
