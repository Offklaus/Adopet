-- Tabelas iniciais do AdoPet.
-- Valores em dinheiro são reais inteiros (o site não usa centavos).

CREATE TABLE pets (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  species     text NOT NULL CHECK (species IN ('cao', 'gato')),
  age         text NOT NULL,
  sex         text NOT NULL,
  size        text NOT NULL,
  location    text NOT NULL,
  tags        text[] NOT NULL DEFAULT '{}',
  status      text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'adopted')),
  photo       text,
  photo_alt   text,
  story       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pets_species ON pets (species);

CREATE TABLE campaigns (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  tag         text,
  raised      integer NOT NULL DEFAULT 0 CHECK (raised >= 0),
  goal        integer NOT NULL CHECK (goal > 0),
  supporters  integer NOT NULL DEFAULT 0 CHECK (supporters >= 0),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE donations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text REFERENCES campaigns (id),
  amount      integer NOT NULL CHECK (amount > 0),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'canceled')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_donations_campaign ON donations (campaign_id);

CREATE TABLE adoption_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id         text NOT NULL REFERENCES pets (id),
  name           text NOT NULL,
  email          text NOT NULL,
  phone          text NOT NULL,
  city           text NOT NULL,
  housing        text NOT NULL CHECK (housing IN ('casa-quintal', 'casa', 'apartamento')),
  has_other_pets boolean NOT NULL,
  message        text NOT NULL DEFAULT '',
  agree_visit    boolean NOT NULL CHECK (agree_visit),
  status         text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'approved', 'rejected')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_adoption_requests_pet ON adoption_requests (pet_id);
