-- Pilot metrics: a tiny log of milestones, so activation and retention can be measured.
CREATE TABLE events (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (name IN ('business_signed_up', 'first_service_added', 'booking_received')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX events_business_idx ON events (business_id, name, created_at);
