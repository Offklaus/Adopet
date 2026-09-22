-- Esquema do AdoPet. Idempotente: roda a cada inicialização.
-- Valores em dinheiro são reais inteiros (o site não usa centavos).

CREATE TABLE IF NOT EXISTS pets (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  species     TEXT NOT NULL CHECK (species IN ('cao', 'gato')),
  age         TEXT NOT NULL,
  sex         TEXT NOT NULL,
  size        TEXT NOT NULL,
  location    TEXT NOT NULL,
  tags        TEXT NOT NULL DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'adopted')),
  photo       TEXT,
  photo_alt   TEXT,
  story       TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_pets_species ON pets (species);

CREATE TABLE IF NOT EXISTS campaigns (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tag         TEXT,
  raised      INTEGER NOT NULL DEFAULT 0 CHECK (raised >= 0),
  goal        INTEGER NOT NULL CHECK (goal > 0),
  supporters  INTEGER NOT NULL DEFAULT 0 CHECK (supporters >= 0),
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS donations (
  id          TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES campaigns (id),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'canceled')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_donations_campaign ON donations (campaign_id);

CREATE TABLE IF NOT EXISTS adoption_requests (
  id             TEXT PRIMARY KEY,
  pet_id         TEXT NOT NULL REFERENCES pets (id),
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT NOT NULL,
  city           TEXT NOT NULL,
  housing        TEXT NOT NULL CHECK (housing IN ('casa-quintal', 'casa', 'apartamento')),
  has_other_pets INTEGER NOT NULL CHECK (has_other_pets IN (0, 1)),
  message        TEXT NOT NULL DEFAULT '',
  agree_visit    INTEGER NOT NULL CHECK (agree_visit = 1),
  status         TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'approved', 'rejected')),
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_adoption_requests_pet ON adoption_requests (pet_id);
