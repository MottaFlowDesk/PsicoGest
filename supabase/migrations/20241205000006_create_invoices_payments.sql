-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments(id),
  invoice_number TEXT NOT NULL UNIQUE,
  fiscal_year INTEGER NOT NULL,
  sequence_number INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT DEFAULT 'BRL',
  description TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'paid', 'overdue', 'cancelled'
  )),
  payment_method TEXT CHECK (payment_method IN ('credit_card', 'pix', 'boleto', 'cash', 'other')),
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT due_after_issue CHECK (due_date >= issue_date),
  UNIQUE(fiscal_year, sequence_number)
);

CREATE INDEX idx_invoices_professional ON invoices(professional_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Invoice Number Generation
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  next_seq INTEGER;
  year INTEGER;
BEGIN
  year := EXTRACT(YEAR FROM NEW.issue_date);
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO next_seq
  FROM invoices
  WHERE professional_id = NEW.professional_id AND fiscal_year = year;
  NEW.fiscal_year := year;
  NEW.sequence_number := next_seq;
  NEW.invoice_number := 'INV-' || year || '-' || LPAD(next_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_invoice_number_trigger
BEFORE INSERT ON invoices
FOR EACH ROW
WHEN (NEW.invoice_number IS NULL)
EXECUTE FUNCTION generate_invoice_number();

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own invoices"
  ON invoices FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'BRL',
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  stripe_payout_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'succeeded', 'failed', 'refunded', 'partially_refunded'
  )),
  payment_method TEXT NOT NULL,
  payment_method_details JSONB,
  stripe_fee_cents INTEGER,
  net_amount_cents INTEGER,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_amount_cents INTEGER,
  refund_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals view own payments"
  ON payments FOR SELECT
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );
