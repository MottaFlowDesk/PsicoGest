-- Create Professional Availability Table
CREATE TABLE professional_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  -- Horário
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  -- Configuração
  default_session_duration INTEGER DEFAULT 50, -- minutos
  interval_between_sessions INTEGER DEFAULT 10, -- minutos
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT no_overnight CHECK (
    EXTRACT(HOUR FROM end_time) - EXTRACT(HOUR FROM start_time) <= 14
  )
);

CREATE INDEX idx_availability_professional ON professional_availability(professional_id);
CREATE INDEX idx_availability_day ON professional_availability(professional_id, day_of_week);

ALTER TABLE professional_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own availability"
  ON professional_availability FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- Create Availability Overrides Table (Exceptions like holidays)
CREATE TABLE availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  -- Data
  date DATE NOT NULL,
  all_day BOOLEAN DEFAULT TRUE,
  start_time TIME, -- Se all_day = FALSE
  end_time TIME,
  -- Motivo
  reason TEXT NOT NULL CHECK (reason IN ('vacation', 'holiday', 'personal', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT time_required_if_not_all_day CHECK (
    all_day = TRUE OR (start_time IS NOT NULL AND end_time IS NOT NULL)
  )
);

CREATE INDEX idx_overrides_professional ON availability_overrides(professional_id);
CREATE INDEX idx_overrides_date ON availability_overrides(professional_id, date);

ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own overrides"
  ON availability_overrides FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );
