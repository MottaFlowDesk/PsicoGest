-- Create Subscriptions Table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  plan_name TEXT NOT NULL CHECK (plan_name IN ('essencial', 'profissional', 'premium')),
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_subscriptions_professional ON subscriptions(professional_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals view own subscriptions"
  ON subscriptions FOR SELECT
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- Add subscription fields to professionals table
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_plan TEXT CHECK (subscription_plan IN ('essencial', 'profissional', 'premium', 'free')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS subscription_trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

CREATE INDEX idx_professionals_subscription ON professionals(subscription_plan, subscription_status);

-- Function to get subscription limits
CREATE OR REPLACE FUNCTION get_subscription_limits(prof_id UUID)
RETURNS JSONB AS $$
DECLARE
  plan_name TEXT;
  limits JSONB;
BEGIN
  SELECT subscription_plan INTO plan_name
  FROM professionals
  WHERE id = prof_id;

  -- Default limits (free plan)
  limits := jsonb_build_object(
    'max_patients', 0,
    'max_ai_hours_per_month', 0,
    'whatsapp_reminders', false,
    'ai_transcription', false,
    'priority_support', false,
    'unlimited_patients', false,
    'unlimited_ai', false
  );

  -- Plan-specific limits
  CASE plan_name
    WHEN 'essencial' THEN
      limits := jsonb_build_object(
        'max_patients', 60,
        'max_ai_hours_per_month', 0,
        'whatsapp_reminders', false,
        'ai_transcription', false,
        'priority_support', false,
        'unlimited_patients', false,
        'unlimited_ai', false
      );
    WHEN 'profissional' THEN
      limits := jsonb_build_object(
        'max_patients', 120,
        'max_ai_hours_per_month', 10,
        'whatsapp_reminders', true,
        'ai_transcription', true,
        'priority_support', true,
        'unlimited_patients', false,
        'unlimited_ai', false
      );
    WHEN 'premium' THEN
      limits := jsonb_build_object(
        'max_patients', 999999,
        'max_ai_hours_per_month', 999999,
        'whatsapp_reminders', true,
        'ai_transcription', true,
        'priority_support', true,
        'unlimited_patients', true,
        'unlimited_ai', true
      );
    ELSE
      -- Free plan (default)
      limits := jsonb_build_object(
        'max_patients', 5,
        'max_ai_hours_per_month', 0,
        'whatsapp_reminders', false,
        'ai_transcription', false,
        'priority_support', false,
        'unlimited_patients', false,
        'unlimited_ai', false
      );
  END CASE;

  RETURN limits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

