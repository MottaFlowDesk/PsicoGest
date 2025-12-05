-- Create Appointments Table
CREATE TABLE appointment_recurrence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  time_of_day TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  start_date DATE NOT NULL,
  end_date DATE,
  max_occurrences INTEGER,
  occurrences_created INTEGER DEFAULT 0,
  type TEXT NOT NULL,
  telehealth_provider TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_frequency_config CHECK (
    (frequency = 'monthly' AND day_of_month IS NOT NULL AND day_of_week IS NULL) OR
    (frequency IN ('weekly', 'biweekly') AND day_of_week IS NOT NULL AND day_of_month IS NULL)
  )
);

CREATE INDEX idx_recurrence_professional ON appointment_recurrence(professional_id);
CREATE INDEX idx_recurrence_active ON appointment_recurrence(professional_id, active);

CREATE TRIGGER update_recurrence_updated_at
BEFORE UPDATE ON appointment_recurrence
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE appointment_recurrence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own recurrence"
  ON appointment_recurrence FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 50,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  type TEXT NOT NULL CHECK (type IN ('in_person', 'telehealth')),
  telehealth_provider TEXT CHECK (telehealth_provider IN ('native', 'zoom', 'google_meet')),
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
  )),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT CHECK (cancelled_by IN ('professional', 'patient')),
  cancellation_reason TEXT,
  notes TEXT,
  recurrence_id UUID REFERENCES appointment_recurrence(id),
  google_calendar_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_duration CHECK (duration_minutes IN (30, 45, 50, 60, 90)),
  CONSTRAINT scheduled_in_future CHECK (scheduled_at > created_at),
  CONSTRAINT telehealth_requires_provider CHECK (
    type = 'in_person' OR (type = 'telehealth' AND telehealth_provider IS NOT NULL)
  )
);

CREATE INDEX idx_appointments_professional ON appointments(professional_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_scheduled ON appointments(professional_id, scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(professional_id, status);
CREATE INDEX idx_appointments_recurrence ON appointments(recurrence_id);

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own appointments"
  ON appointments FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );
