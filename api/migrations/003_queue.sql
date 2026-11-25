CREATE TABLE queue_entries (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
  phone       TEXT NOT NULL DEFAULT '',
  service_id  INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  staff_id    INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_service', 'done', 'left')),
  joined_at   TIMESTAMP WITHOUT TIME ZONE NOT NULL,   -- shop wall-clock time
  queue_token TEXT NOT NULL UNIQUE
);
CREATE INDEX queue_business_status_idx ON queue_entries (business_id, status, joined_at);
