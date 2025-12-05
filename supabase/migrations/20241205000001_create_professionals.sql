-- Create Professionals Table
CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  specialty TEXT,
  registration_number TEXT,
  bio TEXT,
  avatar_url TEXT,
  custom_url_slug TEXT UNIQUE,
  stripe_account_id TEXT,
  stripe_connected_at TIMESTAMPTZ,
  google_calendar_connected BOOLEAN DEFAULT FALSE,
  google_refresh_token TEXT,
  zoom_connected BOOLEAN DEFAULT FALSE,
  zoom_refresh_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT valid_custom_url CHECK (custom_url_slug ~* '^[a-z0-9-]+$')
);

CREATE INDEX idx_professionals_user_id ON professionals(user_id);
CREATE INDEX idx_professionals_custom_url ON professionals(custom_url_slug);
CREATE INDEX idx_professionals_email ON professionals(email);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_professionals_updated_at
BEFORE UPDATE ON professionals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON professionals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON professionals FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON professionals FOR INSERT
  WITH CHECK (user_id = auth.uid());
