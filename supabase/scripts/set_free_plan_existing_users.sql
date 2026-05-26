-- Execute no SQL Editor se usuários já existem sem plano definido
UPDATE public.professionals
SET
  subscription_plan = 'free',
  subscription_status = 'free'
WHERE subscription_plan IS NULL;
