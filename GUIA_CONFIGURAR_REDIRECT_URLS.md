# 🔧 Guia: Configurar URLs de Redirecionamento

O problema de magic links redirecionando para `localhost` ocorre quando as URLs de redirecionamento não estão configuradas corretamente.

---

## ✅ Solução Rápida

### 1. Configurar Variável de Ambiente no Vercel

1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto **PsicoGest**
3. Vá em **Settings** → **Environment Variables**
4. Adicione ou atualize:

```
NEXT_PUBLIC_APP_URL=https://psicogest-ebon.vercel.app
```

**Importante:** Substitua `psicogest-ebon.vercel.app` pelo seu domínio real do Vercel.

5. Selecione os ambientes:
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development** (opcional)

6. Clique em **Save**

### 2. Configurar no Supabase Dashboard

O Supabase também precisa saber quais URLs são permitidas para redirecionamento.

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Authentication** → **URL Configuration**

#### Site URL
Configure a **Site URL**:
```
https://psicogest-ebon.vercel.app
```

#### Redirect URLs
Adicione as seguintes URLs na lista de **Redirect URLs**:

```
https://psicogest-ebon.vercel.app/auth/confirm
https://psicogest-ebon.vercel.app/auth/callback
https://psicogest-ebon.vercel.app/dashboard
https://psicogest-ebon.vercel.app/login
```

**Para desenvolvimento local (opcional):**
```
http://localhost:3000/auth/confirm
http://localhost:3000/auth/callback
http://localhost:3000/dashboard
http://localhost:3000/login
```

4. Clique em **Save**

---

## 🔄 Após Configurar

1. **Redeploy no Vercel:**
   - Vá em **Deployments**
   - Clique nos **3 pontos** do último deploy
   - Selecione **Redeploy**

2. **Testar:**
   - Faça um novo teste de pagamento
   - O magic link deve redirecionar para a URL de produção

---

## ⚠️ Importante

- **Nunca** use `localhost` em produção
- Sempre use `https://` (não `http://`) em produção
- A URL deve corresponder exatamente ao domínio do Vercel
- Se você tiver um domínio customizado, use ele em vez do `.vercel.app`

---

## 🐛 Troubleshooting

### Magic link ainda redireciona para localhost

1. Verifique se `NEXT_PUBLIC_APP_URL` está configurada no Vercel
2. Verifique se fez **Redeploy** após adicionar a variável
3. Verifique se a URL no Supabase está correta
4. Limpe o cache do navegador e teste novamente

### Erro "Invalid redirect URL"

1. Verifique se a URL está na lista de **Redirect URLs** do Supabase
2. Verifique se não há espaços extras na URL
3. Verifique se está usando `https://` (não `http://`) em produção

---

## 📋 Checklist

- [ ] `NEXT_PUBLIC_APP_URL` configurada no Vercel
- [ ] Redeploy feito no Vercel
- [ ] Site URL configurada no Supabase
- [ ] Redirect URLs adicionadas no Supabase
- [ ] Teste realizado com sucesso

---

## 🔗 Referências

- [Documentação Supabase - URL Configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Documentação Vercel - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

