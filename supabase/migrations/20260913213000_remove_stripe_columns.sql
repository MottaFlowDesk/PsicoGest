-- Remove identificadores e índices do Stripe. Assinaturas e faturas
-- continuam existindo; o provedor de pagamento passa a ser outro.

DROP INDEX IF EXISTS public.idx_payments_stripe_intent;
DROP INDEX IF EXISTS public.idx_subscriptions_stripe_id;

ALTER TABLE public.professionals
  DROP COLUMN IF EXISTS stripe_account_id,
  DROP COLUMN IF EXISTS stripe_connected_at,
  DROP COLUMN IF EXISTS stripe_customer_id;

ALTER TABLE public.invoices
  DROP COLUMN IF EXISTS stripe_payment_intent_id,
  DROP COLUMN IF EXISTS stripe_charge_id;

ALTER TABLE public.payments
  DROP COLUMN IF EXISTS stripe_payment_intent_id,
  DROP COLUMN IF EXISTS stripe_charge_id,
  DROP COLUMN IF EXISTS stripe_payout_id,
  DROP COLUMN IF EXISTS stripe_fee_cents;

ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS stripe_customer_id;
