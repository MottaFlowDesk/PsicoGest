# 📊 Análise: Integração Stripe Connect para SaaS Platform

Análise baseada na [documentação oficial do Stripe para SaaS Platforms](https://docs.stripe.com/connect/saas) e comparação com a implementação atual do PsicoGest.

---

## ✅ O que já está implementado corretamente

### 1. Criação de Contas Connect (Accounts v2)
✅ **Status:** Implementado corretamente

```56:72:app/api/stripe/connect/route.ts
            account = await stripe.accounts.create({
                type: "express",
                country: "BR",
                email: professional.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: "individual",
                business_profile: {
                    mcc: "8049", // Health practitioners office
                    product_description: "Serviços de psicologia e saúde mental",
                },
                metadata: {
                    professional_id: professional.id,
                },
            });
```

**Conforme a documentação:**
- ✅ Usa Accounts v2 (recomendado)
- ✅ Tipo Express (simples para profissionais)
- ✅ Configuração correta de capabilities
- ✅ Metadata para rastreamento

### 2. Onboarding de Contas Connect
✅ **Status:** Implementado corretamente

```109:114:app/api/stripe/connect/route.ts
            accountLink = await stripe.accountLinks.create({
                account: account.id,
                refresh_url: `${request.nextUrl.origin}/dashboard/financial?stripe=refresh`,
                return_url: `${request.nextUrl.origin}/api/stripe/connect/callback`,
                type: "account_onboarding",
            });
```

**Conforme a documentação:**
- ✅ Usa `accountLinks.create()` para onboarding
- ✅ URLs de retorno configuradas corretamente
- ✅ Callback implementado para verificar status

### 3. Verificação de Status da Conta
✅ **Status:** Implementado corretamente

```194:202:app/api/stripe/connect/route.ts
        const account = await stripe.accounts.retrieve(professional.stripe_account_id);

        return NextResponse.json({
            connected: account.charges_enabled && account.payouts_enabled,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
            accountId: account.id,
        });
```

---

## ⚠️ O que precisa ser implementado

### 1. Direct Charges para Pagamentos de Faturas

**Problema:** Não há implementação de PaymentIntents com direct charges para pagamentos de faturas.

**Solução conforme documentação:**

Segundo a [documentação do Stripe SaaS](https://docs.stripe.com/connect/saas), para processar pagamentos que vão diretamente para a conta conectada do profissional, você precisa:

1. **Criar PaymentIntent com `on_behalf_of`** (para direct charges)
2. **Adicionar `application_fee_amount`** (se quiser cobrar taxa de plataforma)
3. **Usar `stripeAccount` header** ou `on_behalf_of` parameter

**Exemplo de implementação:**

```typescript
// app/api/stripe/payment-intent/route.ts
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const { invoiceId } = await request.json();
    
    // Get invoice and professional
    const supabase = await createClient();
    const { data: invoice } = await supabase
        .from("invoices")
        .select(`
            *,
            professionals:professional_id (
                stripe_account_id
            )
        `)
        .eq("id", invoiceId)
        .single();

    if (!invoice || !invoice.professionals?.stripe_account_id) {
        return NextResponse.json(
            { error: "Invoice ou conta Stripe não encontrada" },
            { status: 404 }
        );
    }

    // Calculate application fee (2.9% + R$ 0,30)
    const applicationFeeAmount = Math.round(
        (invoice.amount_cents * 0.029) + 30
    );

    // Create PaymentIntent with direct charge
    const paymentIntent = await stripe.paymentIntents.create({
        amount: invoice.amount_cents,
        currency: 'brl',
        application_fee_amount: applicationFeeAmount,
        on_behalf_of: invoice.professionals.stripe_account_id,
        transfer_data: {
            destination: invoice.professionals.stripe_account_id,
        },
        metadata: {
            invoice_id: invoiceId,
            professional_id: invoice.professional_id,
        },
    }, {
        stripeAccount: invoice.professionals.stripe_account_id, // Para direct charges
    });

    return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
    });
}
```

### 2. Modelo de Monetização

**Recomendação:** Usar **Stripe-owned pricing model** conforme documentação:

> "Your platform refers merchants to Stripe to process payments. In this model, the platform's connected accounts:
> - Are the merchant of record for payments from their customers.
> - Pay Stripe fees.
> - Assume liability for their negative balances.
> - Process payments as direct charges."

**Vantagens:**
- ✅ Plataforma não paga taxas Stripe
- ✅ Pode cobrar application fee por transação
- ✅ Pode cobrar assinatura mensal/anual
- ✅ Menos responsabilidade financeira para a plataforma

**Como implementar:**

1. **Application Fee por transação:**
   - Adicionar `application_fee_amount` no PaymentIntent
   - A taxa vai para o saldo da plataforma automaticamente

2. **Assinatura mensal/anual:**
   - ✅ Já implementado via `/api/stripe/subscribe`
   - Profissionais pagam assinatura para usar a plataforma

### 3. Webhook para Application Fees

**Status:** Parcialmente implementado

O código atual verifica `application_fee_amount` no webhook:

```162:163:app/api/stripe/webhook/route.ts
    const applicationFee = paymentIntent.application_fee_amount || 0;
    const netAmount = paymentIntent.amount - applicationFee;
```

**Melhorias necessárias:**

1. Verificar se o PaymentIntent foi criado com `on_behalf_of`
2. Validar que a application fee foi aplicada corretamente
3. Registrar a application fee separadamente no banco de dados

---

## 🔧 Implementações Recomendadas

### 1. Criar Endpoint para PaymentIntents de Faturas

**Arquivo:** `app/api/stripe/payment-intent/route.ts`

```typescript
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Criar PaymentIntent para pagamento de fatura (Direct Charge)
 * POST /api/stripe/payment-intent
 * Body: { invoiceId: string }
 * 
 * Cria um PaymentIntent que vai diretamente para a conta Connect do profissional
 * com application fee para a plataforma.
 */
export async function POST(request: NextRequest) {
    try {
        if (!isStripeConfigured() || !stripe) {
            return NextResponse.json(
                { error: "Stripe não configurado" },
                { status: 503 }
            );
        }

        const { invoiceId } = await request.json();

        if (!invoiceId) {
            return NextResponse.json(
                { error: "invoiceId é obrigatório" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Get invoice with professional's Stripe account
        const { data: invoice, error: invoiceError } = await supabase
            .from("invoices")
            .select(`
                *,
                professionals:professional_id (
                    id,
                    stripe_account_id,
                    stripe_connected_at
                )
            `)
            .eq("id", invoiceId)
            .single();

        if (invoiceError || !invoice) {
            return NextResponse.json(
                { error: "Fatura não encontrada" },
                { status: 404 }
            );
        }

        const professional = invoice.professionals;

        // Check if professional has Stripe account connected
        if (!professional?.stripe_account_id) {
            return NextResponse.json(
                { error: "Profissional não possui conta Stripe conectada" },
                { status: 400 }
            );
        }

        // Verify account is active
        const account = await stripe.accounts.retrieve(professional.stripe_account_id);
        
        if (!account.charges_enabled || !account.payouts_enabled) {
            return NextResponse.json(
                { error: "Conta Stripe do profissional não está ativa" },
                { status: 400 }
            );
        }

        // Calculate application fee (2.9% + R$ 0,30)
        // Ajuste conforme sua estratégia de monetização
        const applicationFeeAmount = Math.round(
            (invoice.amount_cents * 0.029) + 30
        );

        // Create PaymentIntent with direct charge
        // O pagamento vai diretamente para a conta do profissional
        // A application fee vai para a plataforma
        const paymentIntent = await stripe.paymentIntents.create({
            amount: invoice.amount_cents,
            currency: 'brl',
            application_fee_amount: applicationFeeAmount,
            on_behalf_of: professional.stripe_account_id,
            transfer_data: {
                destination: professional.stripe_account_id,
            },
            metadata: {
                invoice_id: invoiceId,
                professional_id: professional.id,
            },
        }, {
            // Use the connected account's context
            stripeAccount: professional.stripe_account_id,
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            applicationFeeAmount,
        });
    } catch (error: any) {
        console.error("PaymentIntent creation error:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao criar PaymentIntent" },
            { status: 500 }
        );
    }
}
```

### 2. Atualizar Página de Pagamento

**Arquivo:** `app/pay/[invoiceId]/page.tsx`

Atualizar para usar o novo endpoint e Stripe Elements:

```typescript
// Adicionar após fetchInvoice()
async function createPaymentIntent() {
    try {
        const response = await fetch('/api/stripe/payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao criar pagamento');
        }

        return data.clientSecret;
    } catch (error) {
        console.error('Error creating payment intent:', error);
        throw error;
    }
}

// Usar Stripe Elements para coletar dados do cartão
// e confirmar o PaymentIntent
```

### 3. Atualizar Webhook Handler

**Arquivo:** `app/api/stripe/webhook/route.ts`

Melhorar o handler para validar direct charges:

```typescript
async function handlePaymentSucceeded(db: SupabaseAdminClient, paymentIntent: Stripe.PaymentIntent) {
    const invoiceId = paymentIntent.metadata?.invoice_id;

    if (!invoiceId) return;

    // Verify this is a direct charge (has on_behalf_of)
    const isDirectCharge = paymentIntent.on_behalf_of !== null;
    
    if (!isDirectCharge) {
        console.warn("PaymentIntent não é um direct charge:", paymentIntent.id);
    }

    // Get invoice
    const { data: invoice } = await db
        .from("invoices")
        .select("professional_id, amount_cents")
        .eq("id", invoiceId)
        .single();

    if (!invoice) return;

    // Calculate application fee
    const applicationFee = paymentIntent.application_fee_amount || 0;
    const stripeFee = paymentIntent.amount - applicationFee - (paymentIntent.amount * 0.971); // Aproximação
    const netAmount = paymentIntent.amount - applicationFee - stripeFee;

    // Update invoice
    await db
        .from("invoices")
        .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: paymentIntent.id,
            stripe_charge_id: paymentIntent.latest_charge as string,
        })
        .eq("id", invoiceId)
        .eq("status", "pending");

    // Create payment record with detailed fee breakdown
    await db.from("payments").insert({
        invoice_id: invoiceId,
        professional_id: invoice.professional_id,
        amount_cents: paymentIntent.amount,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: paymentIntent.latest_charge as string,
        status: "succeeded",
        payment_method: "credit_card",
        stripe_fee_cents: stripeFee,
        net_amount_cents: netAmount,
        metadata: {
            application_fee_amount: applicationFee,
            on_behalf_of: paymentIntent.on_behalf_of,
            is_direct_charge: isDirectCharge,
        },
        paid_at: new Date().toISOString(),
    });
}
```

---

## 📋 Checklist de Implementação

### Fase 1: Direct Charges (Prioritário)
- [ ] Criar endpoint `/api/stripe/payment-intent` para faturas
- [ ] Implementar cálculo de application fee
- [ ] Atualizar página de pagamento para usar PaymentIntents
- [ ] Integrar Stripe Elements para coleta de dados do cartão
- [ ] Testar fluxo completo de pagamento

### Fase 2: Melhorias no Webhook
- [ ] Validar direct charges no webhook
- [ ] Registrar application fees separadamente
- [ ] Adicionar logs detalhados para debugging

### Fase 3: Configuração no Dashboard
- [ ] Configurar application fee padrão no Stripe Dashboard (opcional)
- [ ] Configurar taxas de plataforma
- [ ] Testar diferentes cenários de pagamento

---

## 🎯 Modelo de Monetização Recomendado

Baseado na documentação do Stripe SaaS, recomendo o **Stripe-owned pricing model**:

### Estrutura de Receita:

1. **Assinatura Mensal/Anual:**
   - ✅ Já implementado
   - Profissionais pagam para usar a plataforma
   - Valores: R$ 97/mês (Essencial) até R$ 247/mês (Premium)

2. **Application Fee por Transação (Opcional):**
   - 2.9% + R$ 0,30 por pagamento de fatura
   - Vai para o saldo da plataforma
   - Profissional recebe o valor líquido (após taxas Stripe e application fee)

### Exemplo de Fluxo:

**Fatura de R$ 100,00:**
- Valor total: R$ 100,00
- Taxa Stripe: ~R$ 3,90 (3,9%)
- Application Fee: R$ 3,20 (2,9% + R$ 0,30)
- Profissional recebe: R$ 92,90
- Plataforma recebe: R$ 3,20

---

## 📚 Referências

- [Stripe SaaS Platform Guide](https://docs.stripe.com/connect/saas)
- [Direct Charges](https://docs.stripe.com/connect/direct-charges)
- [Application Fees](https://docs.stripe.com/connect/application-fees)
- [Accounts v2 API](https://docs.stripe.com/api/accounts)

---

## ✅ Conclusão

A implementação atual está **parcialmente correta**:
- ✅ Criação de contas Connect: **Correto**
- ✅ Onboarding: **Correto**
- ⚠️ Pagamentos de faturas: **Precisa implementar direct charges**
- ⚠️ Application fees: **Precisa implementar**

**Próximos passos:**
1. Implementar endpoint de PaymentIntent para faturas
2. Atualizar página de pagamento
3. Testar fluxo completo
4. Configurar application fees no Dashboard (opcional)

