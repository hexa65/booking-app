CREATE TABLE bookings (
  id           SERIAL PRIMARY KEY,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id     INTEGER NOT NULL REFERENCES staff(id)     ON DELETE RESTRICT,
  service_id   INTEGER NOT NULL REFERENCES services(id)  ON DELETE RESTRICT,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  -- Wall-clock time at the shop. NOT UTC. The business timezone is only used to know what "now" is.
  starts_at    TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  ends_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show')),
  source       TEXT NOT NULL DEFAULT 'online'    CHECK (source IN ('online', 'manual', 'walk_in')),
  price_minor  INTEGER NOT NULL CHECK (price_minor >= 0),   -- snapshot at booking time
  notes        TEXT NOT NULL DEFAULT '',
  manage_token TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  -- Layer 2 of double-booking protection: the database itself refuses overlaps
  -- for the same staff member. '[)' = half-open: 10:00-10:30 and 10:30-11:00 do NOT clash.
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    staff_id WITH =,
    tsrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status <> 'cancelled')
);
CREATE INDEX bookings_business_start_idx ON bookings (business_id, starts_at);
CREATE INDEX bookings_staff_start_idx    ON bookings (staff_id, starts_at);
CREATE INDEX bookings_customer_idx       ON bookings (customer_id);
