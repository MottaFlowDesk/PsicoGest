-- A sequência INV-AAAA-NNNN era única no sistema inteiro.
-- A conta demo já usa INV-2026-0001 … 0540, então qualquer outro profissional
-- quebrava no INSERT (23505). A numeração passa a ser por profissional.

ALTER TABLE public.invoices
  DROP CONSTRAINT invoices_fiscal_year_sequence_number_key;

ALTER TABLE public.invoices
  DROP CONSTRAINT invoices_invoice_number_key;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_professional_year_sequence_key
  UNIQUE (professional_id, fiscal_year, sequence_number);

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_professional_invoice_number_key
  UNIQUE (professional_id, invoice_number);

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_seq INTEGER;
  year INTEGER;
BEGIN
  year := EXTRACT(YEAR FROM NEW.issue_date)::integer;

  PERFORM 1 FROM public.professionals WHERE id = NEW.professional_id FOR UPDATE;

  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO next_seq
  FROM public.invoices
  WHERE professional_id = NEW.professional_id
    AND fiscal_year = year;

  NEW.fiscal_year := year;
  NEW.sequence_number := next_seq;
  NEW.invoice_number := 'INV-' || year || '-' || LPAD(next_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;
