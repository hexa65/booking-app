-- Needed later for the "no overlapping bookings" rule. Verify it works on your Neon project.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE businesses (
  id                   SERIAL PRIMARY KEY,
  name                 TEXT NOT NULL CHECK (length(trim(name)) > 0),
  slug                 TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  timezone             TEXT NOT NULL DEFAULT 'Africa/Lagos',
  slot_step_minutes    INTEGER NOT NULL DEFAULT 15 CHECK (slot_step_minutes IN (5, 10, 15, 20, 30, 60)),
  lead_minutes         INTEGER NOT NULL DEFAULT 30 CHECK (lead_minutes >= 0),
  buffer_minutes       INTEGER NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0),
  booking_window_days  INTEGER NOT NULL DEFAULT 30 CHECK (booking_window_days BETWEEN 1 AND 365),
  cancel_cutoff_hours  INTEGER NOT NULL DEFAULT 2 CHECK (cancel_cutoff_hours >= 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  business_id   INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email         TEXT NOT NULL CHECK (email = lower(email) AND position('@' in email) > 1),
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users (email);
CREATE INDEX users_business_idx ON users (business_id);

CREATE TABLE staff (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
  active      BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX staff_business_idx ON staff (business_id);

CREATE TABLE services (
  id               SERIAL PRIMARY KEY,
  business_id      INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name             TEXT NOT NULL CHECK (length(trim(name)) > 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 5 AND 480),
  price_minor      INTEGER NOT NULL CHECK (price_minor >= 0),   -- kobo
  active           BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX services_business_idx ON services (business_id);

-- business_id is repeated on child tables so EVERY query can filter by it.
CREATE TABLE staff_services (
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id    INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id  INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

CREATE TABLE working_hours (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id    INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  weekday     INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),  -- 1 Monday ... 7 Sunday
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  CHECK (end_time > start_time)
);
CREATE INDEX working_hours_staff_idx ON working_hours (staff_id, weekday);

CREATE TABLE time_off (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id    INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date_from   DATE NOT NULL,
  date_to     DATE NOT NULL,
  reason      TEXT NOT NULL DEFAULT '',
  CHECK (date_to >= date_from)
);
CREATE INDEX time_off_staff_idx ON time_off (staff_id, date_from, date_to);

CREATE TABLE customers (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
  phone       TEXT NOT NULL CHECK (phone ~ '^\+[0-9]{8,15}$'),
  notes       TEXT NOT NULL DEFAULT '',
  UNIQUE (business_id, phone)
);
